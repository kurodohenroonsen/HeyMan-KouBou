import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSite } from '../core/site.js';
import { createCollectionWithPage, addItem } from '../core/collections.js';
import { addComment } from '../core/review.js';
import {
  itemSchema, normalizeDate, normalizeTime, normalizeUrl, normalizeSelect, normalizeNumber, textToRich,
  cleanExtracted, findDuplicates, reviewDigest, digestText, dominantColors, paletteFromColors, hexToHsl, hslToHex
} from '../core/smart.js';
import { createAI } from '../core/ai-tasks.js';
import { palettePairs } from '../core/contrast.js';

const TODAY = '2026-10-29';
function base(kind = 'events', lang = ['fr', 'nl', 'de', 'en']) {
  let site = createSite({ name: 'MAB', languages: lang });
  const r = createCollectionWithPage(site, { kind, examples: false, today: TODAY });
  return { site: r.site, col: r.site.collections[r.id], id: r.id };
}

test('schéma JSON construit depuis les champs (images exclues, choix fermés, année de l’affiche)', () => {
  const { col } = base('events');
  const s = itemSchema(col);
  assert.equal(s.type, 'object');
  assert.ok(!('image' in s.properties), 'pas de champ image');
  for (const k of ['title', 'date', 'time', 'place', 'description', 'status', 'link']) assert.ok(k in s.properties, k);
  assert.deepEqual(s.properties.status.enum, ['', 'scheduled', 'cancelled', 'postponed', 'rescheduled']);
  assert.equal(s.properties.date_year_shown.type, 'boolean');
  assert.equal(s.additionalProperties, false);
  assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort());
  const many = itemSchema(col, { max: 12 });
  assert.equal(many.properties.items.type, 'array');
  assert.equal(many.properties.items.maxItems, 12);
  assert.equal(many.properties.items.items.properties.title.type, 'string');
});

test('dates : formats courants, mois en lettres (FR, NL, DE, EN), année manquante → prochaine occurrence', () => {
  const t = { today: TODAY };
  assert.equal(normalizeDate('2026-12-14', t), '2026-12-14');
  assert.equal(normalizeDate('14/12/2026', t), '2026-12-14');
  assert.equal(normalizeDate('14.12.26', t), '2026-12-14');
  assert.equal(normalizeDate('14-12-2026', t), '2026-12-14');
  assert.equal(normalizeDate('Samedi 14 décembre 2026', t), '2026-12-14');
  assert.equal(normalizeDate('za 14 dec. 2026', t), '2026-12-14');
  assert.equal(normalizeDate('14. Dezember 2026', t), '2026-12-14');
  assert.equal(normalizeDate('December 14, 2026', t), '2026-12-14');
  assert.equal(normalizeDate('1er mars', t), '2027-03-01', 'sans année, déjà passé cette année : l’an prochain');
  assert.equal(normalizeDate('sam. 14 déc.', t), '2026-12-14');
  assert.equal(normalizeDate('14/12', t), '2026-12-14');
  assert.equal(normalizeDate('2026-03-01', { ...t, yearShown: false }), '2027-03-01', 'année inventée par le modèle : ignorée');
  assert.equal(normalizeDate('2025-03-01', { ...t, yearShown: true }), '2025-03-01', 'année lue sur l’affiche : gardée');
  assert.equal(normalizeDate('', t), '');
  assert.throws(() => normalizeDate('31/02/2026', t), /impossible|invalide/i);
  assert.throws(() => normalizeDate('bientôt', t), /date/i);
});

test('heures, liens, nombres, choix par libellé, texte mis en forme', () => {
  assert.equal(normalizeTime('20h30'), '20:30');
  assert.equal(normalizeTime('20 h'), '20:00');
  assert.equal(normalizeTime('20 h 30'), '20:30');
  assert.equal(normalizeTime('9:05'), '09:05');
  assert.equal(normalizeTime('8:30 pm'), '20:30');
  assert.equal(normalizeTime('8 PM'), '20:00');
  assert.equal(normalizeTime('20.30'), '20:30');
  assert.equal(normalizeTime(''), '');
  assert.throws(() => normalizeTime('25h'), /heure/i);
  assert.equal(normalizeUrl('www.radio-panik.org/agenda'), 'https://www.radio-panik.org/agenda');
  assert.equal(normalizeUrl('radio-panik.org'), 'https://radio-panik.org');
  assert.equal(normalizeUrl('https://x.be'), 'https://x.be');
  assert.equal(normalizeUrl('mailto:a@b.be'), 'mailto:a@b.be');
  assert.equal(normalizeUrl('Billets à l’entrée'), 'Billets à l’entrée', 'pas une adresse : laissé tel quel (cleanValue refusera)');
  assert.equal(normalizeNumber('1 200'), 1200);
  assert.equal(normalizeNumber('12,5'), 12.5);
  const { col } = base('events');
  const status = col.fields.find(f => f.key === 'status');
  assert.equal(normalizeSelect(status, 'cancelled'), 'cancelled');
  assert.equal(normalizeSelect(status, 'Annulé'), 'cancelled');
  assert.equal(normalizeSelect(status, 'GEANNULEERD'), 'cancelled');
  assert.equal(normalizeSelect(status, 'reporte'), 'postponed', 'sans accent');
  assert.equal(normalizeSelect(status, 'inconnu'), 'inconnu');
  assert.equal(textToRich('Concert <b>gratuit</b>\n\nOuvert à tous & toutes'), '<p>Concert gratuit</p><p>Ouvert à tous &amp; toutes</p>');
});

test('cleanExtracted : valeurs normalisées et vérifiées, valeurs écartées avec raison, champs multilingues', () => {
  const { site, col } = base('events');
  const r = cleanExtracted(site, col, { title: '  Soirée radio  ', date: 'sam. 14 déc.', date_year_shown: false, time: '20h30', endDate: '', endTime: '', place: 'La Tricoterie', address: 'Rue Théodore Verhaegen 158, 1060 Saint-Gilles', description: 'Concert et débat.\nEntrée libre.', status: 'Prévu', link: 'javascript:alert(1)' }, { today: TODAY });
  assert.deepEqual(r.values.title, { fr: 'Soirée radio' });
  assert.equal(r.values.date, '2026-12-14');
  assert.equal(r.values.time, '20:30');
  assert.equal(r.values.place, 'La Tricoterie');
  assert.deepEqual(r.values.description, { fr: '<p>Concert et débat.<br>Entrée libre.</p>' });
  assert.equal(r.values.status, 'scheduled');
  assert.ok(!('link' in r.values));
  assert.equal(r.dropped.length, 1);
  assert.equal(r.dropped[0].key, 'link');
  assert.match(r.dropped[0].reason, /Lien non autorisé/);
  assert.equal(r.dropped[0].raw, 'javascript:alert(1)');
  assert.ok(r.found.includes('date') && r.found.includes('time') && !r.found.includes('endDate'));
  const bad = cleanExtracted(site, col, { title: '', date: '31/02/2026', date_year_shown: true }, { today: TODAY });
  assert.ok(bad.dropped.some(d => d.key === 'date'));
  assert.ok(bad.missingTitle, 'titre manquant signalé');
});

test('doublons : même titre qu’un élément existant ou qu’une autre proposition', () => {
  let { site, col, id } = base('members');
  site = addItem(site, id, { name: 'Radio Panik' }).site;
  col = site.collections[id];
  const list = [{ values: { name: 'radio panik ' } }, { values: { name: 'Zin TV' } }, { values: { name: 'ZIN TV' } }, { values: { name: 'Médor' } }];
  assert.deepEqual(findDuplicates(site, col, list), [0, 2]);
});

/* ---------- Tâches avec faux fournisseur ---------- */
function fake(over = {}) {
  const calls = [];
  return {
    calls,
    has: { prompt: true, multimodal: true, summarizer: true, translator: true, ...(over.has || {}) },
    async prompt(req) { calls.push({ api: 'prompt', req }); return over.prompt ? over.prompt(req) : '{}'; },
    async summarize(req) { calls.push({ api: 'summarizer', req }); return over.summarize ? over.summarize(req) : ''; },
    async translate(req) { calls.push({ api: 'translator', req }); return `[${req.to}] ${req.text}`; }
  };
}

test('affiche → un élément : image transmise, schéma de la collection, valeurs vérifiées', async () => {
  const { site, col } = base('events');
  const p = fake({ prompt: req => JSON.stringify({ title: 'Festival des médias libres', date: '14 décembre', date_year_shown: false, time: '14h', endDate: '', endTime: '', place: 'Maison du Peuple', address: '', description: 'Ateliers, débats, concerts.', status: '', link: 'mediaslibres.be' }) });
  const blob = { type: 'image/jpeg', size: 120000 };
  const r = await createAI(p).extractItems({ site, col, image: blob, lang: 'fr', today: TODAY });
  const call = p.calls[0].req;
  assert.equal(call.images[0], blob);
  assert.ok('date_year_shown' in call.schema.properties);
  assert.match(call.system, /aujourd’hui.*2026-10-29/i);
  assert.equal(r.value.length, 1);
  const it = r.value[0];
  assert.equal(it.values.date, '2026-12-14');
  assert.equal(it.values.time, '14:00');
  assert.equal(it.values.link, 'https://mediaslibres.be');
  assert.equal(r.via, 'prompt');
  await assert.rejects(createAI(fake({ has: { multimodal: false } })).extractItems({ site, col, image: blob, lang: 'fr', today: TODAY }), /images/);
});

test('texte collé → plusieurs éléments, plafond, doublons signalés ; site en néerlandais : traduction', async () => {
  let { site, col, id } = base('members');
  site = addItem(site, id, { name: 'Radio Panik' }).site;
  col = site.collections[id];
  const items = [{ name: 'Radio Panik', intro: 'Radio associative bruxelloise.', type: 'radio', city: 'Bruxelles', website: 'radiopanik.org' }, { name: 'Zin TV', intro: 'Télévision participative.', type: 'Télévision', city: 'Bruxelles', website: 'https://zintv.org' }, { name: 'Médor', intro: 'Magazine d’enquête.', type: 'presse', city: 'Namur', website: '' }];
  const p = fake({ prompt: () => JSON.stringify({ items }) });
  const r = await createAI(p).extractItems({ site, col, text: 'Voici nos membres : Radio Panik, Zin TV, Médor…', lang: 'fr', today: TODAY, max: 2 });
  assert.equal(r.value.length, 2, 'plafond');
  assert.deepEqual(r.duplicates, [0]);
  assert.equal(r.value[1].values.type, 'tv');
  assert.equal(r.value[0].values.website, 'https://radiopanik.org');
  assert.equal(r.value[2], undefined);
  assert.equal(r.truncated, 1);
  const nl = createSite({ name: 'MAB', languages: ['nl', 'fr'] });
  const rn = createCollectionWithPage(nl, { kind: 'members', examples: false });
  const p2 = fake({ prompt: () => JSON.stringify({ items: [items[1]] }) });
  const r2 = await createAI(p2).extractItems({ site: rn.site, col: rn.site.collections[rn.id], text: 'Zin TV…', lang: 'nl', today: TODAY });
  assert.equal(p2.calls[0].req.lang, 'fr', 'Nano rédige en français');
  assert.deepEqual(r2.value[0].values.intro, { nl: '<p>[nl] Télévision participative.</p>' });
  assert.equal(r2.value[0].values.name, 'Zin TV', 'champ non multilingue : pas traduit');
  assert.equal(r2.translated, true);
  await assert.rejects(createAI(fake()).extractItems({ site, col, text: '   ', lang: 'fr', today: TODAY }), /vide|rien/i);
});

test('chapô : Summarizer « teaser » sinon Prompt API, coupe propre ; titres : 3 propositions uniques', async () => {
  const long = 'Le MAB lance une tournée dans les maisons de quartier. '.repeat(10);
  const p = fake({ summarize: () => long });
  const r = await createAI(p).excerpt({ title: 'Tournée', text: '<p>Texte</p>', lang: 'fr' });
  assert.equal(p.calls[0].req.type, 'teaser');
  assert.ok(r.value.length <= 220 && r.value.endsWith('…'));
  assert.equal(r.via, 'summarizer');
  const p2 = fake({ has: { summarizer: false }, prompt: () => JSON.stringify({ excerpt: '« Une tournée pour rencontrer les habitants. »' }) });
  const r2 = await createAI(p2).excerpt({ title: 'Tournée', text: 'Texte', lang: 'fr' });
  assert.equal(r2.value, 'Une tournée pour rencontrer les habitants.');
  assert.equal(r2.via, 'prompt');
  const p3 = fake({ prompt: () => JSON.stringify({ titles: ['Tournée des quartiers', 'Tournée des quartiers', 'Le MAB sur la route', 'Tournée', 'Un titre beaucoup trop long qui dépasse largement la limite de quatre-vingt-dix caractères prévue pour un titre'] }) });
  const r3 = await createAI(p3).headlines({ title: 'Tournée', text: 'Texte', lang: 'fr' });
  assert.equal(r3.value.length, 3);
  assert.deepEqual(r3.value.slice(0, 2), ['Tournée des quartiers', 'Le MAB sur la route']);
  assert.ok(r3.value.every(v => v.length <= 90));
  assert.ok(!r3.value.includes('Tournée'), 'le titre actuel n’est pas reproposé');
});

async function withComments() {
  let site = createSite({ name: 'MAB', languages: ['fr'] });
  const page = site.pages[0];
  const mk = (id, name, text, pageId, at, resolved = false) => ({ id, parentId: null, anchor: { pageId, nodeId: 'n1', label: 'Titre' }, text, author: { name, fp: name.toLowerCase() }, at, resolved, replies: [] });
  site = addComment(site, mk('cm_aaaaaa1', 'Laurent', 'Le titre est trop long', page.id, '2026-10-20T10:00:00Z'));
  site = addComment(site, mk('cm_aaaaaa2', 'Laurent', 'Ajouter le logo de Zin TV', page.id, '2026-10-21T10:00:00Z'));
  site = addComment(site, mk('cm_aaaaaa3', 'Kudoro', 'Vérifier la date du festival', 'p_autre', '2026-10-22T10:00:00Z'));
  site = addComment(site, mk('cm_aaaaaa4', 'Laurent', 'Couleur du bouton', page.id, '2026-10-19T10:00:00Z', true));
  return site;
}

test('résumé de la relecture sans IA : comptes par page et par auteur, plus ancien en attente', async () => {
  const site = await withComments();
  const d = reviewDigest(site);
  assert.equal(d.open, 3);
  assert.equal(d.resolved, 1);
  assert.equal(d.byPage[0].open, 2);
  assert.equal(d.byPage[0].title, 'Accueil');
  assert.equal(d.byPage[1].title, 'page supprimée');
  assert.deepEqual(d.byAuthor.map(a => [a.name, a.open]), [['Laurent', 2], ['Kudoro', 1]]);
  assert.equal(d.oldestOpen.id, 'cm_aaaaaa1');
  const txt = digestText(d);
  assert.match(txt, /3 commentaires ouverts/);
  assert.match(txt, /1 résolu/);
  assert.match(txt, /Laurent : 2/);
  assert.equal(digestText(reviewDigest(createSite({ name: 'X', languages: ['fr'] }))), 'Aucun commentaire.');
});

test('résumé de la relecture avec IA : points clés (Summarizer), tâches reliées aux commentaires', async () => {
  const site = await withComments();
  const p = fake({
    summarize: () => '- Raccourcir le titre de l’accueil.\n* Ajouter un logo manquant.\n• Vérifier une date.',
    prompt: req => JSON.stringify({ tasks: [{ id: 'cm_aaaaaa1', task: 'Raccourcir le titre' }, { id: 'cm_inconnu', task: 'Fantôme' }, { id: 'cm_aaaaaa3', task: '  Vérifier la date du festival  ' }] })
  });
  const r = await createAI(p).reviewSummary({ site, lang: 'fr' });
  assert.deepEqual(r.value.points, ['Raccourcir le titre de l’accueil.', 'Ajouter un logo manquant.', 'Vérifier une date.']);
  assert.equal(p.calls[0].req.type, 'key-points');
  assert.deepEqual(r.value.tasks.map(t => [t.id, t.task]), [['cm_aaaaaa1', 'Raccourcir le titre'], ['cm_aaaaaa2', 'Ajouter le logo de Zin TV'], ['cm_aaaaaa3', 'Vérifier la date du festival']], 'ids inconnus ignorés, commentaires oubliés repris tels quels');
  assert.equal(r.value.digest.open, 3);
  await assert.rejects(createAI(fake()).reviewSummary({ site: createSite({ name: 'X', languages: ['fr'] }), lang: 'fr' }), /Aucun commentaire ouvert/);
});

/* ---------- Palette ---------- */
function pixels(list) {
  const n = list.reduce((t, [, c]) => t + c, 0);
  const a = new Uint8ClampedArray(n * 4);
  let i = 0;
  for (const [[r, g, b, al = 255], c] of list) for (let k = 0; k < c; k++) { a[i++] = r; a[i++] = g; a[i++] = b; a[i++] = al; }
  return a;
}

test('couleurs dominantes : pixels transparents ignorés, nuances proches regroupées, triées par poids', () => {
  const data = pixels([[[227, 6, 19], 500], [[230, 10, 22], 200], [[255, 255, 255], 900], [[0, 0, 0, 0], 3000], [[0, 70, 160], 300]]);
  const c = dominantColors(data);
  assert.equal(c.length, 3);
  assert.equal(c[0].hex, '#ffffff');
  assert.ok(/^#e[0-9a-f]0[0-9a-f]1[0-9a-f]$/.test(c[1].hex), c[1].hex);
  assert.ok(Math.abs(c[1].weight - 700 / 1900) < 0.01, 'poids = part des pixels opaques');
  assert.equal(c[2].hex, '#0046a0');
});

test('palette depuis le logo : rôles, toutes les paires AA, corrections listées ; logo gris', () => {
  const r = paletteFromColors([{ hex: '#ffffff', weight: 0.5 }, { hex: '#ffd400', weight: 0.3 }, { hex: '#f2353f', weight: 0.2 }]);
  assert.ok(palettePairs(r.palette).every(p => p.ok), JSON.stringify(palettePairs(r.palette).filter(p => !p.ok)));
  assert.equal(Object.keys(r.palette).join(','), 'c1,c2,c3,c4,c5,c6');
  const h1 = hexToHsl(r.palette.c1).h;
  assert.ok(h1 < 10 || h1 > 350, `principale rouge (${h1})`);
  assert.ok(Math.abs(hexToHsl(r.palette.c2).h - 50) < 8, 'secondaire jaune');
  assert.ok(r.changes.length >= 1 && r.changes.every(c => c.key && c.from && c.to && c.why));
  assert.deepEqual(r.changes[0], { key: 'c1', from: '#f2353f', to: r.palette.c1, why: r.changes[0].why });
  assert.equal(r.source.primary, '#f2353f');
  assert.equal(r.ok, true);
  const gray = paletteFromColors([{ hex: '#ffffff', weight: 0.7 }, { hex: '#222222', weight: 0.3 }], { fallback: '#0f766e' });
  assert.match(gray.warning, /couleur vive/);
  assert.ok(palettePairs(gray.palette).every(p => p.ok));
  assert.equal(hslToHex(hexToHsl('#e30613')), '#e30613');
});

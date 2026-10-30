import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSite, findPage } from '../core/site.js';
import { buildTemplate } from '../core/templates.js';
import { insertNode, walk, findNode } from '../core/tree.js';
import { updatePageRoot } from '../core/site.js';
import { ACTIONS, planSchema, catalogText, validatePlan, applyPlan, normalizeColor, normalizeSize, pageContext } from '../core/assistant.js';
import { createAI } from '../core/ai-tasks.js';

function demo() {
  let site = createSite({ name: 'MAB', languages: ['fr', 'nl'] });
  const page = site.pages[0];
  let root = page.root;
  const hero = buildTemplate('hero');
  const cta = buildTemplate('cta');
  root = insertNode(root, root.id, hero, 0);
  root = insertNode(root, root.id, cta, 1);
  site = updatePageRoot(site, page.id, root);
  return { site, page: findPage(site, page.id), hero, cta };
}
const nodes = (root, type) => { const out = []; walk(root, n => { if (n.type === type) out.push(n); return true; }); return out; };

test('schéma et catalogue : actions énumérées, modèles et widgets de la liste fermée', () => {
  const { site } = demo();
  const s = planSchema(site);
  const item = s.properties.actions.items;
  assert.deepEqual(item.properties.action.enum, Object.keys(ACTIONS));
  assert.ok(item.properties.template.enum.includes('faq'));
  assert.ok(item.properties.type.enum.includes('heading') && !item.properties.type.enum.includes('page'));
  assert.deepEqual(item.properties.lang.enum, ['', 'fr', 'nl']);
  assert.ok(s.properties.actions.maxItems <= 10);
  const txt = catalogText(site);
  for (const a of Object.keys(ACTIONS)) assert.ok(txt.includes(a), a);
  assert.match(txt, /faq = Questions fréquentes/);
});

test('normalisation : couleurs par nom, par rôle, hexadécimal ; tailles', () => {
  assert.equal(normalizeColor('rouge'), '#dc2626');
  assert.equal(normalizeColor('Rood'), '#dc2626');
  assert.equal(normalizeColor('principale'), 'palette:c1');
  assert.equal(normalizeColor('couleur secondaire'), 'palette:c2');
  assert.equal(normalizeColor('#C00'), '#c00');
  assert.equal(normalizeColor('blanc'), '#ffffff');
  assert.equal(normalizeColor('plutôt chaleureux'), null);
  assert.equal(normalizeSize('très grand'), 'size:3xl');
  assert.equal(normalizeSize('grand'), 'size:2xl');
  assert.equal(normalizeSize('petit'), 'size:sm');
  assert.equal(normalizeSize('24px'), '24px');
});

test('validation : actions inconnues, paramètres invalides, sélection requise — refus expliqués', () => {
  const { site, page } = demo();
  const ctx = { pageId: page.id, selectedId: null, lang: 'fr' };
  const r = validatePlan(site, { actions: [
    { action: 'add_section', template: 'faq' },
    { action: 'delete_everything' },
    { action: 'add_section', template: 'carrousel-3d' },
    { action: 'style', target: 'headings', property: 'color', value: 'rouge' },
    { action: 'style', target: 'headings', property: 'color', value: 'chaleureux' },
    { action: 'style', target: 'headings', property: 'zIndex', value: '9' },
    { action: 'set_text', text: 'Bonjour' },
    { action: 'go_to_page', page: 'Page qui n’existe pas' },
    { action: 'open_tool', tool: 'terminal' },
    { action: 'set_palette', role: 'principale', color: 'vert' }
  ] }, ctx);
  assert.deepEqual(r.steps.map(s => s.action), ['add_section', 'style', 'set_palette']);
  assert.equal(r.steps[1].params.value, '#dc2626');
  assert.equal(r.steps[2].params.key, 'c1');
  const reasons = r.rejected.map(x => `${x.action}: ${x.reason}`).join('\n');
  assert.match(reasons, /delete_everything: Action inconnue/);
  assert.match(reasons, /Modèle de section inconnu : carrousel-3d/);
  assert.match(reasons, /Couleur non reconnue : chaleureux/);
  assert.match(reasons, /Réglage non autorisé : zIndex/);
  assert.match(reasons, /Sélectionnez d’abord/);
  assert.match(reasons, /Page introuvable/);
  assert.match(reasons, /Outil inconnu : terminal/);
  assert.ok(r.steps.every(s => typeof s.label === 'string' && s.label.length > 5));
  const many = validatePlan(site, { actions: Array.from({ length: 15 }, () => ({ action: 'add_widget', type: 'divider' })) }, ctx);
  assert.equal(many.steps.length, 10);
  assert.match(many.warnings.join(' '), /10 actions au plus/);
});

test('application : section avec titre et texte après la sélection, FAQ, widget, style sur tous les titres', () => {
  const { site, page, hero } = demo();
  const sel = nodes(hero, 'heading')[0].id;
  const ctx = { pageId: page.id, selectedId: sel, lang: 'fr' };
  const plan = validatePlan(site, { actions: [
    { action: 'add_section', template: 'text-image', title: 'Notre radio', text: 'Une radio associative depuis 1983.\nÀ Bruxelles.' },
    { action: 'add_faq', title: 'Adhésion', questions: [{ q: 'Qui peut adhérer ?', a: 'Tout média associatif.' }, { q: 'Combien ça coûte ?', a: 'Rien.' }] },
    { action: 'add_widget', type: 'button', text: 'Nous rejoindre' },
    { action: 'style', target: 'headings', property: 'color', value: 'rouge' }
  ] }, ctx);
  assert.equal(plan.rejected.length, 0, JSON.stringify(plan.rejected));
  const out = applyPlan(site, plan.steps, ctx);
  assert.deepEqual(out.errors, []);
  const root = findPage(out.site, page.id).root;
  const secs = root.children;
  assert.equal(secs.length, 4);
  assert.equal(secs[0].id, hero.id, 'héros en premier');
  const textImage = secs[1];
  assert.equal(nodes(textImage, 'heading')[0].props.text.fr, 'Notre radio');
  assert.equal(nodes(textImage, 'text')[0].props.content.fr, '<p>Une radio associative depuis 1983.<br>À Bruxelles.</p>');
  const faq = secs[2];
  assert.equal(nodes(faq, 'heading')[0].props.text.fr, 'Adhésion');
  const acc = nodes(faq, 'accordion')[0];
  assert.equal(acc.props.items.length, 2);
  assert.equal(acc.props.items[0].title.fr, 'Qui peut adhérer ?');
  assert.equal(acc.props.items[1].content.fr, '<p>Rien.</p>');
  const btn = nodes(root, 'button').find(b => b.props.label?.fr === 'Nous rejoindre');
  assert.ok(btn, 'bouton ajouté');
  assert.ok(nodes(root, 'heading').every(h => h.style.desktop.color === '#dc2626'), 'tous les titres en rouge');
  assert.ok(out.aiTexts.length >= 5, 'textes écrits par l’IA listés pour « à relire »');
  assert.equal(out.done.length, 4);
});

test('application : texte de la sélection, palette (avertissement de contraste), page avec sections, vue et outils', () => {
  const { site, page, hero } = demo();
  const h = nodes(hero, 'heading')[0];
  const ctx = { pageId: page.id, selectedId: h.id, lang: 'fr' };
  let plan = validatePlan(site, { actions: [{ action: 'set_text', text: 'Fédérer les médias libres' }, { action: 'set_palette', role: 'fond', color: 'noir' }] }, ctx);
  assert.match(plan.warnings.join(' '), /contraste/i);
  let out = applyPlan(site, plan.steps, ctx);
  assert.equal(findNode(findPage(out.site, page.id).root, h.id).props.text.fr, 'Fédérer les médias libres');
  assert.equal(out.site.theme.palette.c4, '#111111');
  plan = validatePlan(site, { actions: [
    { action: 'add_page', title: 'Notre radio', sections: [{ template: 'hero', title: 'Radio Panik' }, { template: 'contact' }, { template: 'inconnu' }] },
    { action: 'add_page', title: 'Notre radio' },
    { action: 'set_view', device: 'mobile', lang: 'nl' },
    { action: 'open_tool', tool: 'seo' }
  ] }, ctx);
  assert.match(plan.rejected.map(r => r.reason).join(' '), /Modèle de section inconnu : inconnu/);
  out = applyPlan(site, plan.steps, ctx);
  const created = out.site.pages.filter(p => p.title.fr === 'Notre radio');
  assert.equal(created.length, 2);
  assert.deepEqual(created.map(p => p.slug), ['notre-radio', 'notre-radio-2']);
  assert.equal(created[0].root.children.length, 2);
  assert.equal(nodes(created[0].root, 'heading')[0].props.text.fr, 'Radio Panik');
  assert.equal(out.view.pageId, created[1].id, 'la dernière page créée est ouverte');
  assert.equal(out.view.device, 'mobile');
  assert.equal(out.view.lang, 'nl');
  assert.deepEqual(out.ui, ['seo']);
  const ctxEdit = { ...ctx, editTarget: { kind: 'component', id: 'c1' } };
  const r2 = validatePlan(site, { actions: [{ action: 'add_section', template: 'faq' }] }, ctxEdit);
  assert.match(r2.rejected[0].reason, /Terminez d’abord/);
});

test('contexte pour le modèle : pages, sections de la page, sélection — résumé court', () => {
  const { site, page, hero } = demo();
  const c = pageContext(site, { pageId: page.id, selectedId: nodes(hero, 'heading')[0].id, lang: 'fr' });
  assert.match(c, /Pages : Accueil/);
  assert.match(c, /Sections de la page affichée : 1\. /);
  assert.match(c, /Élément sélectionné : Titre/);
  assert.ok(c.length < 2000);
});

test('tâche plan : schéma envoyé, actions validées et refusées, IA absente', async () => {
  const { site, page } = demo();
  const calls = [];
  const p = { has: { prompt: true }, async prompt(req) { calls.push(req); return JSON.stringify({ actions: [{ action: 'add_faq', questions: [{ q: 'Q1 ?', a: 'R1' }] }, { action: 'hack' }], summary: 'Ajouter une FAQ.' }); } };
  const r = await createAI(p).plan({ site, request: 'ajoute une FAQ', ctx: { pageId: page.id, lang: 'fr' }, lang: 'fr' });
  assert.equal(calls[0].schema.properties.actions.items.properties.action.enum.length, Object.keys(ACTIONS).length);
  assert.match(calls[0].system, /liste fermée/);
  assert.match(calls[0].user, /ajoute une FAQ/);
  assert.equal(r.value.steps.length, 1);
  assert.equal(r.value.rejected.length, 1);
  assert.equal(r.value.summary, 'Ajouter une FAQ.');
  await assert.rejects(createAI({ has: {} }).plan({ site, request: 'x', ctx: { pageId: page.id }, lang: 'fr' }), /IA locale indisponible/);
  await assert.rejects(createAI(p).plan({ site, request: '  ', ctx: { pageId: page.id }, lang: 'fr' }), /Écrivez/);
});

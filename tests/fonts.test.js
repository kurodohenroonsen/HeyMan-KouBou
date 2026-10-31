/* Cycle 29 : polices auto-hébergées — manifeste cohérent avec fonts/, @font-face locales, polices personnalisées. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FONT_FILES, SUBSETS, fontFaceCss, fontFilesFor, preloadFont, fontSignature, customFontCss, fontOptions, fontStack, exportFontName } from '../core/fonts.js';
import { FONTS } from '../core/theme.js';
import { fingerprint, suffixed } from '../core/fingerprint.js';
import { createSite, addFont, removeFont, setTheme, normalizeSite, validateSite } from '../core/site.js';

const root = new URL('..', import.meta.url).pathname;
const WOFF2 = 'data:font/woff2;base64,' + Buffer.from('wOF2fake-font-bytes').toString('base64');

test('fingerprint : stable, 8 hexadécimaux, sensible au contenu ; suffixe avant l’extension', () => {
  assert.match(fingerprint(new Uint8Array([1, 2, 3])), /^[0-9a-f]{8}$/);
  assert.equal(fingerprint('abc'), fingerprint('abc'));
  assert.notEqual(fingerprint('abc'), fingerprint('abd'));
  assert.notEqual(fingerprint(new Uint8Array([0])), fingerprint(new Uint8Array([0, 0])));
  assert.equal(suffixed('logo.png', 'deadbeef'), 'logo-deadbeef.png');
  assert.equal(suffixed('photo-480.webp', '01234567'), 'photo-480-01234567.webp');
});

test('manifeste : chaque famille proposée (hors système) a ses fichiers, licence OFL, hash et taille exacts', () => {
  const families = Object.keys(FONTS).filter(k => k !== 'system' && k !== 'georgia');
  assert.deepEqual(Object.keys(FONT_FILES).sort(), families.sort());
  for (const [key, fam] of Object.entries(FONT_FILES)) {
    assert.equal(fam.license, 'OFL-1.1', key);
    assert.match(fam.source, /^@fontsource(-variable)?\/[a-z0-9-]+@\d+\.\d+\.\d+$/, key);
    assert.ok(existsSync(join(root, 'fonts', fam.dir, 'LICENSE')), `LICENSE de ${key}`);
    assert.match(readFileSync(join(root, 'fonts', fam.dir, 'LICENSE'), 'utf8'), /SIL Open Font License/);
    assert.ok(fam.files.length >= 4, key);
    for (const f of fam.files) {
      const p = join(root, 'fonts', fam.dir, f.file);
      assert.ok(existsSync(p), `${key} : ${f.file} existe`);
      assert.equal(statSync(p).size, f.bytes, `${f.file} : taille`);
      assert.equal(fingerprint(new Uint8Array(readFileSync(p))), f.hash, `${f.file} : empreinte`);
      assert.ok(SUBSETS[f.subset], `${f.file} : sous-ensemble connu`);
      assert.ok(['normal', 'italic'].includes(f.style));
      assert.match(f.weight, /^(400|700|\d{3} \d{3,4})$/);
    }
    const sub = new Set(fam.files.map(f => f.subset));
    assert.ok(sub.has('latin') && sub.has('latin-ext'), `${key} : latin et latin-ext`);
  }
});

test('manifeste : aucun fichier de fonts/ oublié, et moins de 1 Mo au total', () => {
  let total = 0;
  for (const dir of readdirSync(join(root, 'fonts'))) {
    const fam = Object.values(FONT_FILES).find(x => x.dir === dir);
    assert.ok(fam, `dossier fonts/${dir} déclaré`);
    const onDisk = readdirSync(join(root, 'fonts', dir)).filter(f => f.endsWith('.woff2')).sort();
    assert.deepEqual(onDisk, fam.files.map(f => f.file).sort(), dir);
    total += fam.files.reduce((n, f) => n + f.bytes, 0);
  }
  assert.ok(total < 1_000_000, `${total} octets`);
});

test('fontFaceCss : règles locales avec font-display swap, unicode-range, nom de famille du thème', () => {
  const css = fontFaceCss('archivo', { urlPrefix: 'assets/fonts/' });
  assert.match(css, /@font-face\{font-family:"Archivo";font-style:normal;font-weight:400;font-display:swap;src:url\("assets\/fonts\/archivo-latin-400-normal-f79a38d5\.woff2"\) format\("woff2"\);unicode-range:U\+0000-00FF/);
  assert.match(css, /font-style:italic;font-weight:700/);
  assert.equal((css.match(/@font-face/g) || []).length, 8);
  assert.doesNotMatch(css, /googleapis|gstatic|https?:/);
  const lora = fontFaceCss('lora', { urlPrefix: 'fonts/lora/', hashed: false });
  assert.match(lora, /font-weight:400 700;font-display:swap;src:url\("fonts\/lora\/lora-latin-wght-normal\.woff2"\)/, 'police variable : plage de graisses, nom d’origine dans l’éditeur');
  assert.equal(fontFaceCss('system'), '');
  assert.equal(fontFaceCss('georgia'), '');
});

test('fontFilesFor : fichiers du thème (titres + texte, sans doublon) ; preloadFont : la police des titres', () => {
  const site = createSite({ name: 'X' });
  assert.deepEqual(fontFilesFor(site), []);
  assert.equal(preloadFont(site), null);
  const s2 = setTheme(site, { fonts: { heading: 'fraunces', body: 'archivo' } });
  const files = fontFilesFor(s2);
  assert.equal(files.length, 4 + 8);
  assert.ok(files.every(f => f.src.startsWith('fonts/') && f.name.startsWith('assets/fonts/') && /-[0-9a-f]{8}\.woff2$/.test(f.name)));
  const pre = preloadFont(s2);
  assert.equal(pre.name, exportFontName(FONT_FILES.fraunces.files.find(f => f.subset === 'latin' && f.style === 'normal')));
  const same = setTheme(site, { fonts: { heading: 'lora', body: 'lora' } });
  assert.equal(fontFilesFor(same).length, 4, 'même famille deux fois : une seule fois');
  assert.equal(preloadFont(setTheme(site, { fonts: { heading: 'system', body: 'oswald' } })).name, exportFontName(FONT_FILES.oswald.files.find(f => f.file === 'oswald-latin-400-normal.woff2')), 'titres système : la police du texte est préchargée');
});

test('police personnalisée : ajout (.woff2 seulement), options, pile, CSS canevas et export, retrait', () => {
  const site = createSite({ name: 'MAB' });
  assert.throws(() => addFont(site, { family: 'Titling', dataUrl: 'data:image/png;base64,AAAA' }), /woff2/i);
  assert.throws(() => addFont(site, { family: '', dataUrl: WOFF2 }), /nom/i);
  const r = addFont(site, { family: 'MAB Titling', weight: '700', style: 'normal', dataUrl: WOFF2, name: 'MAB-Titling-Bold.woff2' });
  assert.match(r.id, /^font_[a-z0-9]+$/);
  const f = r.site.fonts[r.id];
  assert.equal(f.family, 'MAB Titling');
  assert.equal(f.weight, '700');
  assert.equal(f.file, 'mab-titling-bold.woff2');
  const opts = fontOptions(r.site);
  assert.ok(opts.some(o => o.key === `custom:${r.id}` && o.label === 'MAB Titling'));
  assert.ok(opts.some(o => o.key === 'archivo'));
  const themed = setTheme(r.site, { fonts: { heading: `custom:${r.id}` } });
  assert.equal(themed.theme.fonts.heading, `custom:${r.id}`);
  assert.equal(fontStack(themed, 'heading'), '"MAB Titling",system-ui,sans-serif');
  assert.equal(fontStack(themed, 'body'), FONTS.system.stack);
  const canvas = customFontCss(themed, { canvas: true });
  assert.match(canvas, /@font-face\{font-family:"MAB Titling";font-style:normal;font-weight:700;font-display:swap;src:url\("data:font\/woff2;base64,/);
  const exported = customFontCss(themed, { canvas: false, urlPrefix: 'assets/fonts/' });
  assert.match(exported, /src:url\("assets\/fonts\/mab-titling-bold-[0-9a-f]{8}\.woff2"\) format\("woff2"\)/);
  assert.notEqual(fontSignature(themed), fontSignature(r.site));
  assert.equal(validateSite(themed).errors.length, 0);
  const gone = removeFont(themed, r.id);
  assert.equal(gone.fonts[r.id], undefined);
  assert.equal(gone.theme.fonts.heading, 'system', 'police retirée : retour au système');
  assert.throws(() => setTheme(site, { fonts: { heading: 'custom:font_inconnu' } }), /inconnue/i);
  assert.deepEqual(normalizeSite({ ...site, fonts: undefined }).fonts, {});
});

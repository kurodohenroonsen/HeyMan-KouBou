/* Cycle 33 (A1) : l'éditeur lui-même au contrôle d'axe-core, WCAG 2.2 A/AA, sur cinq écrans
 * (élément sélectionné, onglet Style, SEO, Publier, Journal) ; repères et sélecteur d'appareil. Le canevas (iframe : le
 * site de l'utilisateur, déjà contrôlé par cycle10.mjs) est exclu. */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AXE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  /* La CSP de l'éditeur interdit le script en ligne : axe est évalué par le protocole du navigateur */
  await page.evaluate(AXE);
  const axe = async name => {
    const res = await page.evaluate(async tags => {
      const r = await window.axe.run({ exclude: [['#canvas']] }, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] });
      return r.violations.map(v => `${v.id} (${v.nodes.length}) : ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(', ')}`);
    }, TAGS);
    t.ok(res.length === 0, `axe-core, ${name} : 0 violation WCAG 2.2 A/AA` + (res.length ? ' — ' + res.join(' | ') : ''));
  };

  /* Repères : un seul <main>, un <h1> (caché) au nom du site, #peers groupé, le cadre du canevas n'est pas un bouton */
  const marks = await page.evaluate(() => ({
    main: document.querySelectorAll('main').length, h1: document.querySelector('h1')?.textContent || '',
    peers: document.querySelector('#peers')?.getAttribute('role'), frame: document.querySelector('#frame').hasAttribute('aria-pressed'),
    pressed: [...document.querySelectorAll('.seg[data-device]')].map(b => b.getAttribute('aria-pressed')).join(',')
  }));
  t.ok(marks.main === 1 && /^Atelier — ./.test(marks.h1), `repères : un <main>, titre de niveau 1 « ${marks.h1} »`);
  t.ok(marks.peers === 'group' && !marks.frame && marks.pressed === 'true,false,false', 'sélecteur d’appareil sur .seg seulement, #peers en groupe');

  /* 1. Éditeur avec un élément sélectionné */
  await c.locator('[data-type="text"]').first().click();
  await page.waitForSelector('#inspector [data-insp="content"]');
  await axe('élément sélectionné (onglet Contenu)');

  /* 2. Onglet Style (mode expert : tous les réglages, donc tous les boutons de réinitialisation) */
  await page.evaluate(() => window.__atelier.setExpert(true));
  await page.click('[data-insp="style"]');
  await t.wait(200);
  const small = await page.evaluate(() => [...document.querySelectorAll('#inspector button, .topbar button, #leftBody button')]
    .filter(b => b.offsetParent && !b.closest('[hidden]')).map(b => b.getBoundingClientRect()).filter(r => r.width && (r.width < 24 || r.height < 24)).length);
  t.ok(small === 0, `cibles d’au moins 24 × 24 px dans l’inspecteur et la barre du haut (${small} trop petite(s))`);
  await axe('onglet Style');

  /* 3 à 5. Fenêtres SEO, Publier, Journal ; le focus revient au bouton qui les a ouvertes */
  for (const [btn, dlg, name] of [['#seoBtn', '#seoDialog', 'fenêtre SEO'], ['#publishBtn', '#publishDialog', 'fenêtre Publier'], ['#logBtn', '#logDialog', 'fenêtre Journal']]) {
    await page.click(btn);
    await page.waitForSelector(`${dlg}[open]`);
    await t.wait(300);
    const banners = await page.evaluate(d => document.querySelector(d).querySelectorAll('header, footer').length, dlg);
    t.ok(banners === 0, `${name} : ni header ni footer dans la fenêtre (pas de deuxième « banner »)`);
    await axe(name);
    await page.keyboard.press('Escape');
    await page.waitForSelector(`${dlg}`, { state: 'detached' });
    await t.wait(100);
    t.ok(await page.evaluate(b => document.activeElement === document.querySelector(b), btn), `${name} : Échap ferme, le focus revient à ${btn}`);
  }
}

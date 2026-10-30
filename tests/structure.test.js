import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNode, insertNode, createSectionWithColumns, findNode, setProp, setAdvanced, walk } from '../core/tree.js';
import { createSite, updatePageRoot, addPage, removePage, normalizeSite, validateSite } from '../core/site.js';
import { createComponent, makeInstance, setComponentNode, renameComponent, detachInstance, deleteComponent, componentUsage, editRoot, applyEditRoot } from '../core/components.js';
import { effectiveMenu, customizeMenu, addMenuLink, removeMenuItem, moveMenuItem, indentMenuItem, outdentMenuItem, setMenuItemLabel, renderMenu } from '../core/menu.js';
import { customizeHeader, customizeFooter, resetLayout } from '../core/layout.js';
import { renderPage, renderSite, buildCss } from '../core/render.js';
import { auditSite } from '../core/audit.js';

function base() {
  let s = createSite({ languages: ['fr', 'nl'] });
  s = addPage(s, { slug: 'contact', title: { fr: 'Contact', nl: 'Contact' } });
  s = addPage(s, { slug: 'equipe', title: { fr: 'Équipe', nl: 'Team' } });
  let root = s.pages[0].root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  const h = createNode('heading');
  h.props.text = { fr: 'Rejoignez-nous' };
  h.style.desktop.color = 'palette:c1';
  root = insertNode(root, sec.children[0].children[0].id, h);
  s = updatePageRoot(s, s.pages[0].id, root);
  return { site: normalizeSite(s), pageId: s.pages[0].id, sec, h };
}
const home = s => s.pages[0];
const kids = s => home(s).root.children;

/* ---------- Composants ---------- */
test('createComponent : le bloc devient une instance au même endroit', () => {
  const { site, pageId, sec } = base();
  const r = createComponent(site, pageId, sec.id, 'Bandeau rejoindre');
  const comp = r.site.components[r.id];
  assert.equal(comp.name, 'Bandeau rejoindre');
  assert.equal(comp.node.type, 'section');
  assert.notEqual(comp.node.id, sec.id);
  const inst = kids(r.site)[0];
  assert.equal(inst.ref, r.id);
  assert.equal(inst.type, 'section');
  assert.equal(inst.id, r.instanceId);
  assert.deepEqual(inst.children, []);
  assert.deepEqual(validateSite(r.site).errors, []);
});

test('instances : rendu du composant, mise à jour partout, CSS une seule fois', () => {
  const { site, pageId, sec } = base();
  let { site: s, id } = createComponent(site, pageId, sec.id, 'B');
  let root = home(s).root;
  root = insertNode(root, root.id, makeInstance(s, id));
  s = updatePageRoot(s, pageId, root);
  s = updatePageRoot(s, s.pages[1].id, insertNode(s.pages[1].root, s.pages[1].root.id, makeInstance(s, id)));
  let html = renderPage(s, home(s), 'fr');
  assert.equal(html.split('Rejoignez-nous').length - 1, 2);
  const h = s.components[id].node.children[0].children[0].children[0];
  const node = setProp(s.components[id].node, h.id, 'text', 'Bienvenue', 'fr');
  s = setComponentNode(s, id, node);
  assert.ok(renderPage(s, s.pages[1], 'fr').includes('Bienvenue'));
  const css = buildCss(s, s.pages);
  assert.equal(css.split(`.n-${h.id} .heading{color:var(--c1)}`).length - 1, 1);
});

test('canevas : l’instance est sélectionnable, pas son intérieur', () => {
  const { site, pageId, sec } = base();
  const r = createComponent(site, pageId, sec.id, 'B');
  const html = renderPage(r.site, home(r.site), 'fr', { canvas: true });
  assert.ok(html.includes(`data-node="${r.instanceId}"`));
  assert.ok(html.includes(`data-ref="${r.id}"`));
  const inner = r.site.components[r.id].node.children[0].id;
  assert.ok(!html.includes(`data-node="${inner}"`));
});

test('garde-fou : un composant ne peut pas s’inclure lui-même ; données cycliques rendues sans boucle', () => {
  const { site, pageId, sec } = base();
  const row = sec.children[0];
  let { site: s, id } = createComponent(site, pageId, row.id, 'Rangée');
  const col = s.components[id].node.children[0];
  const self = makeInstance(s, id);
  assert.equal(self.type, 'row');
  assert.throws(() => setComponentNode(s, id, insertNode(s.components[id].node, col.id, self)), /lui-même/);
  const cyclic = structuredClone(s);
  cyclic.components[id].node.children[0].children.push(self);
  const html = renderPage(cyclic, home(cyclic), 'fr');
  assert.ok(html.includes('Rejoignez-nous'));
});

test('detachInstance : copie indépendante, nouveaux identifiants', () => {
  const { site, pageId, sec } = base();
  const r = createComponent(site, pageId, sec.id, 'B');
  const d = detachInstance(r.site, pageId, r.instanceId);
  const n = kids(d.site)[0];
  assert.equal(n.ref, undefined);
  assert.equal(n.children.length, 1);
  assert.notEqual(n.children[0].id, r.site.components[r.id].node.children[0].id);
  assert.ok(renderPage(d.site, home(d.site), 'fr').includes('Rejoignez-nous'));
});

test('deleteComponent : les instances deviennent des copies sur toutes les pages', () => {
  const { site, pageId, sec } = base();
  let { site: s, id } = createComponent(site, pageId, sec.id, 'B');
  s = updatePageRoot(s, s.pages[1].id, insertNode(s.pages[1].root, s.pages[1].root.id, makeInstance(s, id)));
  assert.equal(componentUsage(s)[id], 2);
  s = deleteComponent(s, id);
  assert.ok(!s.components[id]);
  assert.ok(renderPage(s, s.pages[1], 'fr').includes('Rejoignez-nous'));
  let refs = 0;
  for (const p of s.pages) walk(p.root, n => { if (n.ref) refs++; return true; });
  assert.equal(refs, 0);
  assert.deepEqual(validateSite(s).errors, []);
});

test('renameComponent et validation d’une instance orpheline', () => {
  const { site, pageId, sec } = base();
  let { site: s, id } = createComponent(site, pageId, sec.id, 'B');
  s = renameComponent(s, id, ' Bandeau ');
  assert.equal(s.components[id].name, 'Bandeau');
  const broken = structuredClone(s);
  delete broken.components[id];
  assert.ok(validateSite(broken).errors.some(e => /composant/i.test(e)));
});

test('editRoot / applyEditRoot : composant, en-tête, pied de page', () => {
  const { site, pageId, sec } = base();
  let { site: s, id } = createComponent(site, pageId, sec.id, 'B');
  const er = editRoot(s, { kind: 'component', id });
  assert.equal(er.type, 'page');
  assert.equal(er.children[0].id, s.components[id].node.id);
  const h = er.children[0].children[0].children[0].children[0];
  s = applyEditRoot(s, { kind: 'component', id }, setProp(er, h.id, 'text', 'Modifié', 'fr'));
  assert.ok(renderPage(s, home(s), 'fr').includes('Modifié'));
  s = customizeHeader(s);
  const hr = editRoot(s, { kind: 'header' });
  assert.equal(hr.children[0].type, 'section');
  assert.throws(() => applyEditRoot(s, { kind: 'header' }, { ...hr, children: [] }), /vide/);
});

/* ---------- En-tête et pied de page en blocs ---------- */
test('customizeHeader : logo, menu, langues ; rendu à la place de l’en-tête par défaut', () => {
  const { site } = base();
  const s = customizeHeader(site);
  const types = [];
  walk(s.layout.header, n => { types.push(n.type); return true; });
  for (const t of ['site-logo', 'nav-menu', 'lang-switch']) assert.ok(types.includes(t), t);
  const html = renderPage(s, s.pages[1], 'nl');
  assert.match(html, /<header class="site-header[^"]*site-header--custom/);
  assert.ok(html.includes('href="../../equipe/"') || html.includes('href="../equipe/"'));
  assert.ok(html.includes('aria-current="page"'));
  const r = resetLayout(s, 'header');
  assert.equal(r.layout.header, null);
});

test('customizeFooter : pied de page en blocs', () => {
  const s = customizeFooter(base().site);
  const html = renderPage(s, home(s), 'fr');
  assert.match(html, /<footer class="site-footer[^"]*site-footer--custom/);
});

/* ---------- Menu ---------- */
test('effectiveMenu : automatique = toutes les pages', () => {
  const { site } = base();
  assert.deepEqual(effectiveMenu(site).map(i => i.pageId), site.pages.map(p => p.id));
});

test('menu personnalisé : lien, sous-menu, ordre, libellé, retrait', () => {
  let s = customizeMenu(base().site);
  const [m0, m1, m2] = s.menu;
  s = addMenuLink(s, { label: 'Blog', url: 'https://blog.exemple.be', lang: 'fr' });
  const link = s.menu.at(-1);
  assert.equal(link.kind, 'link');
  s = indentMenuItem(s, m2.id);
  assert.equal(s.menu.length, 3);
  assert.equal(s.menu[1].children[0].id, m2.id);
  assert.throws(() => indentMenuItem(s, s.menu[1].children[0].id), /niveau/);
  s = outdentMenuItem(s, m2.id);
  assert.equal(s.menu[2].id, m2.id);
  s = moveMenuItem(s, link.id, -1);
  assert.equal(s.menu[2].id, link.id);
  s = setMenuItemLabel(s, m1.id, 'Nous écrire', 'fr');
  assert.equal(s.menu[1].label.fr, 'Nous écrire');
  s = removeMenuItem(s, m0.id);
  assert.ok(!s.menu.some(i => i.id === m0.id));
});

test('renderMenu : liens relatifs par langue, page courante, sous-menu accessible', () => {
  let s = customizeMenu(base().site);
  s = indentMenuItem(s, s.menu[2].id);
  const html = renderMenu(s, s.pages[1], 'nl', ['nl', 'contact'], {});
  assert.ok(html.includes('href="../../nl/equipe/"') || html.includes('href="../equipe/"'));
  assert.ok(html.includes('aria-current="page"'));
  assert.match(html, /<li class="has-sub">.*<ul class="submenu">/s);
  assert.ok(html.includes('>Team<'));
});

test('removePage retire la page du menu personnalisé', () => {
  let s = customizeMenu(base().site);
  const pid = s.pages[2].id;
  s = removePage(s, pid);
  assert.ok(!JSON.stringify(s.menu).includes(pid));
});

test('lien de menu dangereux neutralisé', () => {
  let s = customizeMenu(base().site);
  s = addMenuLink(s, { label: 'x', url: 'javascript:alert(1)', lang: 'fr' });
  assert.ok(!renderMenu(s, home(s), 'fr', [], {}).includes('javascript:'));
});

test('menu mobile : bouton accessible et site.js inclus', () => {
  const { site } = base();
  const { files } = renderSite(site);
  const html = files.get('index.html');
  assert.match(html, /<button[^>]*class="nav-burger"[^>]*aria-expanded="false"[^>]*aria-controls="/);
  assert.ok(files.has('site.js') && files.get('site.js').includes('nav-burger'));
});

/* ---------- Popups ---------- */
test('popup : bouton popovertarget, fenêtre ajoutée une seule fois', () => {
  const { site, pageId, sec } = base();
  const r = createComponent(site, pageId, sec.id, 'Inscription');
  const cid = r.id;
  let root = { ...home(r.site).root, children: [] };
  const sec2 = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec2);
  for (let i = 0; i < 2; i++) { const b = createNode('button'); b.props.link = `popup:${cid}`; root = insertNode(root, sec2.children[0].children[0].id, b); }
  const s = updatePageRoot(r.site, pageId, root);
  const html = renderPage(s, home(s), 'fr');
  assert.equal(html.split(`popovertarget="pop-${cid}"`).length - 1, 3, 'deux boutons + le bouton Fermer');
  assert.equal(html.split(`id="pop-${cid}"`).length - 1, 1);
  assert.match(html, new RegExp(`<div popover id="pop-${cid}" class="popup"`));
  assert.ok(html.includes('popovertargetaction="hide"'));
  assert.ok(html.includes('Rejoignez-nous'));
});

test('popup vers un composant supprimé : bouton inoffensif et avertissement', () => {
  const { site, pageId } = base();
  let root = home(site).root;
  const b = createNode('button');
  b.props.link = 'popup:cp_absent';
  root = insertNode(root, root.children[0].children[0].children[0].id, b);
  const s = updatePageRoot(site, pageId, root);
  const html = renderPage(s, home(s), 'fr');
  assert.ok(!html.includes('popovertarget="pop-cp_absent"'));
  assert.ok(auditSite(s).warnings.some(w => /fenêtre/.test(w.message)));
});

/* ---------- Sémantique ---------- */
test('balise article et libellé accessible traduit et échappé', () => {
  const { site, pageId, sec } = base();
  let root = setProp(home(site).root, sec.id, 'tag', 'article');
  root = setAdvanced(root, sec.id, { ariaLabel: 'Actu "spéciale"', lang: 'fr' });
  const s = updatePageRoot(site, pageId, root);
  const html = renderPage(s, home(s), 'fr');
  assert.match(html, /<article class="sec[^"]*"[^>]*aria-label="Actu &quot;spéciale&quot;"/);
});

test('une instance ne reçoit pas d’enfants (son contenu vient du composant)', async () => {
  const { canContain } = await import('../core/tree.js');
  const { site, pageId, sec } = base();
  const r = createComponent(site, pageId, sec.id, 'B');
  assert.equal(canContain(home(r.site).root, r.instanceId, 'row'), false);
});

test('presets dans un composant ou l’en-tête : même fonctionnement que sur une page', async () => {
  const { presetFromNode, setNodePreset } = await import('../core/presets.js');
  const s0 = customizeHeader(base().site);
  const target = { kind: 'header' };
  let logo = null;
  walk(s0.layout.header, n => { if (n.type === 'site-logo') logo = n; return true; });
  const r = presetFromNode(s0, target, logo.id, 'Logo');
  let found = null;
  walk(r.site.layout.header, n => { if (n.id === logo.id) found = n; return true; });
  assert.equal(found.preset, r.id);
  const s2 = setNodePreset(r.site, target, logo.id, '-');
  walk(s2.layout.header, n => { if (n.id === logo.id) found = n; return true; });
  assert.equal(found.preset, '-');
});

/*
 * Fenêtre « Publier » : fichier zip, OVH avec publish.php, ou GitHub (intégration Git d'OVH).
 * Cycle 25 : le jeton est gardé par origine (php-token:<origine>) ou par dépôt (github-token:<owner/repo>) et n'est
 * pré-rempli que pour cette destination ; la première publication (ou le premier test avec jeton) vers une destination
 * jamais utilisée sur cet appareil demande une confirmation explicite.
 */
import { h, $, toast, download } from './dom.js';
import { state, commit } from './store.js';
import { setPublishSettings, slugify } from '../core/site.js';
import { renderSite, withoutHtaccess } from '../core/render.js';
import { htaccessOptions } from '../core/htaccess.js';
import { loadFontData } from './fontfiles.js';
import { createZip } from '../core/zip.js';
import { auditSite } from '../core/audit.js';
import { buildPublishPhp, sha256Hex, newToken, formsConfig, publishGitHub, filesForServer, errorMessage, PUBLISH_VERSION, publishOrigin, githubTarget, tokenKey, hostLabel } from '../core/publish.js';
import { getSecret, setSecret, migrateLegacyTokens, isKnownDestination, addKnownDestination } from './storage.js';
import { log } from './log.js';
import { __, __n } from '../core/ui-i18n.js';

let exportZipHandler = null;
export function setZipHandler(fn) { exportZipHandler = fn; }

let tab = null;
/* Migration des anciennes clés de jeton : une seule fois par ouverture de la fenêtre (cycle 25) */
let migration = Promise.resolve();
/* Jetons tapés pendant la séance, avec leur destination : jamais repris pour une autre adresse ou un autre dépôt.
   Un jeton tout juste créé (publish.php téléchargé) n'a pas encore de destination : il suit la personne jusqu'au premier envoi. */
const memory = { php: new Map(), github: new Map() };

function setStatus(el, text, kind) {
  el.textContent = text;
  el.className = `pub-status${kind ? ` is-${kind}` : ''}`;
  if (kind === 'ok') el.setAttribute('data-pub-ok', ''); else el.removeAttribute('data-pub-ok');
}

function apply(patch) {
  try { commit(setPublishSettings(state.site, patch), { source: 'site' }); return true; } catch (e) { log.warn('publish.settings-invalid', __('Réglage de publication refusé : {message}', { message: e.message }), { patch }); toast(e.message, 'error'); return false; }
}

/* Garde le jeton pour cette destination (en séance, et sur l'appareil si demandé) */
async function remember(kind, target, token, on) {
  memory[kind].delete('');
  memory[kind].set(target, { token, keep: on });
  const key = tokenKey(kind, target);
  if (!key) return;
  try { await setSecret(key, on ? token : ''); } catch { /* stockage indisponible */ }
}

/* Jeton à pré-remplir pour la destination affichée : celui de la séance (même destination, ou pas encore envoyé), sinon celui gardé sur l'appareil pour elle */
async function tokenFor(kind, target) {
  const m = memory[kind].get(target) || memory[kind].get('');
  if (m?.token) return { token: m.token, keep: m.keep, from: 'séance' };
  const key = tokenKey(kind, target);
  const saved = key ? await getSecret(key) : '';
  return saved ? { token: saved, keep: true, from: 'appareil' } : { token: '', keep: false, from: '' };
}

const destLabel = (kind, target) => (kind === 'github' ? target : hostLabel(target));

/* Première fois vers cette destination sur cet appareil : fenêtre de confirmation explicite ; vrai si la personne confirme */
function confirmFirst(kind, target, action) {
  const host = destLabel(kind, target);
  log.info('publish.first-origin', action === 'test' ? __('Premier envoi du jeton à {host} depuis cet appareil (test de connexion) : confirmation demandée', { host }) : __('Première publication vers {host} depuis cet appareil : confirmation demandée', { host }), { kind, target, action });
  return new Promise(resolve => {
    $('#publishConfirmDialog')?.remove();
    let answered = false;
    const finish = ok => { answered = true; resolve(ok); d.close(); };
    const what = kind === 'github'
      ? __('Vous allez publier dans le dépôt GitHub {host} pour la première fois depuis cet appareil.', { host })
      : action === 'test' ? __('Vous allez envoyer votre jeton de publication à {host} pour la première fois depuis cet appareil (test de connexion).', { host }) : __('Vous allez publier sur {host} pour la première fois depuis cet appareil.', { host });
    const d = h('dialog', { class: 'audit', id: 'publishConfirmDialog', 'aria-labelledby': 'publishConfirmTitle' },
      h('header', { class: 'audit__head' }, h('h2', { id: 'publishConfirmTitle' }, __('Première publication vers {host}', { host })), h('button', { type: 'button', class: 'icon-btn', 'aria-label': __('Fermer'), onclick: () => finish(false) }, '✕')),
      h('div', { class: 'a11y-form' },
        h('p', {}, what),
        h('p', { class: 'hint' }, __('Vérifiez que c’est bien votre site : le jeton donne le droit de publier à cette adresse. Si l’adresse vient d’un projet reçu ou modifié par quelqu’un d’autre, annulez et contrôlez-la dans l’onglet Publier.'))),
      h('footer', { class: 'audit__foot' },
        h('button', { type: 'button', class: 'btn', 'data-confirm-cancel': '', onclick: () => finish(false) }, __('Annuler')),
        h('button', { type: 'button', class: 'btn btn--primary', 'data-confirm-ok': '', onclick: () => finish(true) }, __('Continuer vers {host}', { host }))));
    d.addEventListener('close', () => { d.remove(); if (!answered) resolve(false); });
    document.body.append(d);
    d.showModal();
  });
}

/* Vrai si la destination est connue de l'appareil, ou si la personne vient de la confirmer */
async function destinationOk(kind, target, action) {
  const key = `${kind}:${target}`;
  if (isKnownDestination(key)) return true;
  const ok = await confirmFirst(kind, target, action);
  if (ok) addKnownDestination(key);
  return ok;
}

/* Fichiers du site (polices comprises) ; publish.php écrit lui-même le .htaccess, il n'est pas dans le paquet */
async function siteFiles() {
  const fontData = await loadFontData(state.site);
  return renderSite(state.site, { fontData, lastmod: new Date(state.lastTime || Date.now()).toISOString().slice(0, 10) }).files;
}

async function siteZip(version = PUBLISH_VERSION) {
  const r = filesForServer(withoutHtaccess(await siteFiles()), version);
  return { zip: createZip([...r.files].map(([name, data]) => ({ name, data }))), files: r.files, skipped: r.skipped };
}

function phpTab(d) {
  const p = state.site.publish || {};
  const url = h('input', { class: 'input input--mono', type: 'url', value: p.url || (state.site.baseUrl ? `${state.site.baseUrl}/publish.php` : ''), placeholder: __('https://www.votre-site.be/publish.php'), 'data-pub': 'url' });
  const token = h('input', { class: 'input input--mono', type: 'password', autocomplete: 'off', placeholder: __('Jeton de publication'), 'data-pub': 'token' });
  const keep = h('input', { type: 'checkbox', 'data-pub': 'remember' });
  const status = h('p', { class: 'pub-status', 'data-pub-status': '', role: 'status' });
  const origin = () => publishOrigin(url.value);
  /* Pré-remplit le jeton gardé pour l'origine affichée seulement ; une autre adresse → champ vide et message */
  const fill = async () => {
    const o = origin();
    const typed = token.value;
    const kept = keep.checked;
    const t = await tokenFor('php', o);
    if (token.value !== typed || keep.checked !== kept) return; /* la personne a tapé un jeton pendant la lecture : on le garde */
    token.value = t.token;
    keep.checked = t.keep;
    log.debug('publish.token-for', t.token ? __('Jeton pré-rempli pour {host} ({from})', { host: hostLabel(o), from: t.from }) : o ? __('Aucun jeton gardé pour {host}', { host: hostLabel(o) }) : __('Pas d’adresse publish.php : aucun jeton pré-rempli'), { origin: o || undefined, from: t.from || undefined, known: o ? isKnownDestination(`php:${o}`) : undefined });
    if (!t.token && o && !isKnownDestination(`php:${o}`)) setStatus(status, __('Adresse jamais utilisée sur cet appareil ({host}) : aucun jeton n’est repris ; une confirmation sera demandée au premier envoi.', { host: hostLabel(o) }), 'info');
  };
  migration.then(fill);
  url.addEventListener('change', () => { apply({ url: url.value }); fill(); });
  const generate = async () => {
    const t = newToken();
    token.value = t;
    memory.php.set('', { token: t, keep: keep.checked }); /* gardé sur l'appareil au premier envoi, sous l'adresse réellement utilisée */
    download('publish.php', buildPublishPhp({ tokenHash: await sha256Hex(t), baseUrl: state.site.baseUrl }), 'application/x-httpd-php');
    log.info('publish.php.generate', __('publish.php v{version} téléchargé avec un nouveau jeton (l’ancien publish.php ne l’acceptera pas)', { version: PUBLISH_VERSION }), { version: PUBLISH_VERSION, remember: keep.checked });
    apply({ mode: 'php' });
    setStatus(status, __('publish.php téléchargé, avec un nouveau jeton (gardé dans ce champ). Déposez le fichier à la racine du site par FTP, puis « Tester la connexion ».'), 'info');
  };
  const testConn = async () => {
    if (!apply({ url: url.value })) return;
    const f = log.flow('publish.test', __('Test de connexion à publish.php'), { url: url.value, token: !!token.value });
    if (token.value && !(await destinationOk('php', origin(), 'test'))) { f.cancel(__('Test annulé : envoi du jeton à {host} non confirmé', { host: hostLabel(origin()) }), { origin: origin() }); setStatus(status, __('Test annulé : vérifiez l’adresse avant d’y envoyer votre jeton (ou videz le champ Jeton pour un test sans diagnostic).'), 'error'); return; }
    if (token.value) await remember('php', origin(), token.value, keep.checked);
    setStatus(status, __('Test en cours…'));
    try {
      const r = await fetch(url.value, { method: 'GET', cache: 'no-store', headers: token.value ? { 'X-Atelier-Token': token.value } : {} });
      const text = await r.text();
      let b;
      try { b = JSON.parse(text); } catch { f.step('not-json', __('La réponse n’est pas du JSON : PHP n’est peut-être pas exécuté, ou une page d’erreur de l’hébergement répond'), { status: r.status, start: text.slice(0, 120) }, 'warn'); throw new Error(__('réponse {status} qui n’est pas celle de publish.php', { status: r.status })); }
      if (!b.atelier) throw new Error(__('réponse inattendue'));
      const old = Number(b.version) < Number(PUBLISH_VERSION);
      if (old) f.warn('old-version', __('publish.php installé en version {installed} : la version {expected} ajoute le .htaccess, les polices, la page 404 et protège mieux la collaboration', { installed: b.version, expected: PUBLISH_VERSION }), { installed: b.version, expected: PUBLISH_VERSION });
      if (b.diag) f.info('diag', __('Diagnostic de l’hébergement'), b.diag);
      else if (token.value && !old) f.warn('token-refused', __('Le jeton saisi ne correspond pas à ce publish.php (diagnostic refusé) : la publication sera refusée'), {});
      if (!b.zip) f.warn('no-zip', __('Extension PHP zip absente : la publication est impossible sur cet hébergement'));
      f.ok(__('publish.php répond'), { version: b.version, php: b.php, zip: b.zip, req: b.req });
      const dg = b.diag;
      setStatus(status, [
        b.zip ? __('Connexion réussie : publish.php version {version}, PHP {php}.', { version: b.version, php: b.php || '?' }) : __('Connexion réussie : publish.php version {version}, PHP {php} — extension zip absente !', { version: b.version, php: b.php || '?' }),
        dg ? __('Envoi max. {upload} (formulaire {post}), mail() {mail}, dossier {folder}.', { upload: dg.upload_max_filesize, post: dg.post_max_size, mail: dg.mail ? __('présent') : __('ABSENT'), folder: dg.data_writable ? __('inscriptible') : __('NON inscriptible') }) : '',
        old ? __('Mise à jour conseillée : publish.php version {version} existe (polices, .htaccess, page 404, sécurité). Retéléchargez-le et redéposez-le par FTP.', { version: PUBLISH_VERSION }) : '',
        token.value && !dg && !old ? __('Attention : le jeton saisi ne correspond pas à ce publish.php.') : ''
      ].filter(Boolean).join(' '), b.zip ? 'ok' : 'error');
    } catch (e) {
      const net = e instanceof TypeError;
      f.fail(e, { url: url.value, hint: net ? 'Le navigateur n’a reçu aucune réponse utilisable : serveur injoignable, adresse fausse, ou réponse sans autorisation CORS (fichier absent → page d’erreur de l’hébergement, ou PHP non exécuté).' : undefined });
      setStatus(status, net ? __('Pas de réponse de publish.php à cette adresse ({message}). Vérifiez que le fichier est bien déposé à cet endroit (et que l’adresse s’ouvre dans un onglet : elle doit afficher {"atelier":true,…}).', { message: e.message }) : __('Pas de réponse de publish.php à cette adresse ({message}). Vérifiez que le fichier est bien déposé à cet endroit.', { message: e.message }), 'error');
    }
  };
  const run = async () => {
    if (!apply({ url: url.value, mode: 'php' })) return;
    const f = log.flow('publish.php', __('Publication sur OVH (publish.php)'), { url: url.value });
    if (!token.value) { f.fail(new Error(__('jeton absent'))); setStatus(status, __('Indiquez le jeton de publication (ou créez un nouveau publish.php).'), 'error'); return; }
    if (!(await destinationOk('php', origin(), 'publish'))) { f.cancel(__('Publication annulée : première publication vers {host} non confirmée', { host: hostLabel(origin()) }), { origin: origin() }); setStatus(status, __('Publication annulée : vérifiez l’adresse de publish.php avant de publier.'), 'error'); return; }
    await remember('php', origin(), token.value, keep.checked);
    const audit = auditSite(state.site);
    if (!audit.ok) { f.fail(new Error(audit.errors[0]), { errors: audit.errors.slice(0, 5) }, __('Publication bloquée par la vérification')); setStatus(status, __('Publication impossible : {error}', { error: audit.errors[0] }), 'error'); return; }
    if (audit.warnings.length) f.step('warnings', __n(audit.warnings.length, '{n} point à vérifier (la publication continue)', '{n} points à vérifier (la publication continue)'), { warnings: audit.warnings.slice(0, 5) }, 'info');
    setStatus(status, __('Publication en cours…'));
    try {
      let version = PUBLISH_VERSION;
      try { const r0 = await fetch(state.site.publish.url, { method: 'GET', cache: 'no-store' }); version = String((await r0.json()).version || '1'); } catch (e0) { version = '1'; f.warn('version-unknown', __('Version de publish.php inconnue ({message}) : envoi prudent, sans les .ics', { message: e0.message })); }
      f.step('version', __('publish.php installé : version {version}', { version }), { version });
      const t0 = performance.now();
      const { zip, files, skipped } = await siteZip(version);
      const forms = formsConfig(state.site);
      f.step('package', __n(files.size, 'Paquet prêt : {n} fichier', 'Paquet prêt : {n} fichiers'), { files: files.size, kb: Math.round(zip.length / 1024), forms: Object.keys(forms).length, skipped: skipped.length || undefined, ms: Math.round(performance.now() - t0) }, 'info');
      const fd = new FormData();
      fd.append('site', new Blob([zip], { type: 'application/zip' }), 'site.zip');
      fd.append('forms', JSON.stringify(forms));
      if (Number(version) >= 5 && state.site.publish?.server !== 'pages') fd.append('htaccess', JSON.stringify(htaccessOptions(state.site)));
      const r = await fetch(state.site.publish.url, { method: 'POST', body: fd, headers: { 'X-Atelier-Token': token.value } });
      const b = await r.json().catch(() => ({}));
      const ref = r.headers.get('x-atelier-request') || b.req;
      if (!r.ok || !b.ok) {
        if (b.rejected?.length) f.step('rejected', __n(b.rejected.length, '{n} fichier refusé par publish.php', '{n} fichiers refusés par publish.php'), { rejected: b.rejected.slice(0, 10) }, 'warn');
        if (b.failed?.length) f.step('partial', __n(b.failed.length, 'Publication incomplète : {n} fichier non mis en place', 'Publication incomplète : {n} fichiers non mis en place'), { failed: b.failed.slice(0, 10), moved: b.moved }, 'error');
        const main = b.code || b.error || b.message ? errorMessage(b, r.status) : (r.status === 413 ? __('erreur {status} (site trop lourd pour l’hébergement)', { status: r.status }) : __('erreur {status}', { status: r.status }));
        throw Object.assign(new Error([main, ...(b.rejected || b.failed || []).slice(0, 3)].filter(Boolean).join(' — ')), { status: r.status, ref, code: b.code });
      }
      f.ok(__n(b.written, 'Site publié : {n} fichier', 'Site publié : {n} fichiers'), { written: b.written, removed: b.removed, ref });
      const sent = __n(b.written, 'Site publié : {n} fichier envoyé', 'Site publié : {n} fichiers envoyés');
      setStatus(status, [
        b.removed ? __('{sent}, {removed}.', { sent, removed: __n(b.removed, '{n} ancien fichier retiré', '{n} anciens fichiers retirés') }) : __('{sent}.', { sent }),
        __('Les formulaires de contact arrivent par e-mail via publish.php.'),
        Number(version) < 5 ? __('Mise à jour conseillée : publish.php version {version} existe (polices, .htaccess, page 404, sécurité). Retéléchargez-le et redéposez-le par FTP.', { version: PUBLISH_VERSION }) : '',
        skipped.length && Number(version) >= 2 ? __n(skipped.length, '{n} fichier non envoyé (polices, icône SVG, manifeste) : votre publish.php est en version {version}.', '{n} fichiers non envoyés (polices, icône SVG, manifeste) : votre publish.php est en version {version}.', { version }) : skipped.length ? __n(skipped.length, '{n} fichier d’agenda (.ics) non envoyé : votre publish.php est en version {version}, téléchargez le nouveau et redéposez-le pour le publier.', '{n} fichiers d’agenda (.ics) non envoyés : votre publish.php est en version {version}, téléchargez le nouveau et redéposez-le pour les publier.', { version }) : ''
      ].filter(Boolean).join(' '), 'ok');
      toast(__n(files.size, 'Site publié ({n} fichier).', 'Site publié ({n} fichiers).'));
    } catch (e) { f.fail(e, { status: e.status, ref: e.ref, code: e.code }); setStatus(status, e.ref ? __('Échec de la publication : {message} (référence {ref} dans le journal du serveur)', { message: e.message, ref: e.ref }) : __('Échec de la publication : {message}', { message: e.message }), 'error'); }
  };
  return h('div', { class: 'pub-pane', 'data-pane': 'php' },
    h('ol', { class: 'pub-steps' },
      h('li', {}, h('span', {}, h('strong', {}, __('Une seule fois :')), ' ' + __('téléchargez votre fichier publish.php personnalisé, puis déposez-le par FTP dans le dossier du site chez OVH (« www »), à côté de index.html.')), h('div', { class: 'row-btns' }, h('button', { type: 'button', class: 'btn btn--small', 'data-pub-generate': '', onclick: generate }, __('⇩ Télécharger publish.php')))),
      h('li', {}, __('Indiquez son adresse :') + ' ', url),
      h('li', {}, __('Jeton :') + ' ', token, h('label', { class: 'check check--sm' }, keep, __('Se souvenir sur cet appareil, pour cette adresse seulement (jamais dans le projet)'))),
      h('li', {}, h('div', { class: 'row-btns' }, h('button', { type: 'button', class: 'btn btn--small', 'data-pub-test': '', onclick: testConn }, __('Tester la connexion')), h('button', { type: 'button', class: 'btn btn--small btn--primary', 'data-pub-run': '', onclick: run }, __('🚀 Publier le site'))))),
    status,
    h('p', { class: 'hint' }, __('publish.php n’accepte que des pages, styles, scripts et images du site (aucun fichier PHP), refuse tout envoi sans jeton, et ne supprime jamais les fichiers que vous avez ajoutés vous-même. Il relaie aussi les formulaires de contact par e-mail : les adresses ne figurent jamais dans les pages.')));
}

function githubTab() {
  const g = state.site.publish?.gh || {};
  const field = (k, ph, v) => h('input', { class: 'input input--mono', type: 'text', value: v || '', placeholder: ph, 'data-gh': k, spellcheck: 'false' });
  const owner = field('owner', __('propriétaire (ex. aktina)'), g.owner);
  const repo = field('repo', __('dépôt (ex. site-mab)'), g.repo);
  const branch = field('branch', 'main', g.branch || 'main');
  const dir = field('dir', __('dossier (vide = racine)'), g.dir);
  const token = h('input', { class: 'input input--mono', type: 'password', autocomplete: 'off', placeholder: __('Jeton GitHub (contenu : lecture et écriture)'), 'data-gh': 'token' });
  const keep = h('input', { type: 'checkbox', 'data-gh': 'remember' });
  const status = h('p', { class: 'pub-status', 'data-gh-status': '', role: 'status' });
  const target = () => githubTarget({ owner: owner.value, repo: repo.value });
  const fill = async () => {
    const tg = target();
    const typed = token.value;
    const kept = keep.checked;
    const t = await tokenFor('github', tg);
    if (token.value !== typed || keep.checked !== kept) return; /* jeton tapé pendant la lecture : gardé */
    token.value = t.token;
    keep.checked = t.keep;
    log.debug('publish.token-for', t.token ? __('Jeton GitHub pré-rempli pour {host} ({from})', { host: tg, from: t.from }) : tg ? __('Aucun jeton GitHub gardé pour {host}', { host: tg }) : __('Dépôt GitHub incomplet : aucun jeton pré-rempli'), { target: tg || undefined, from: t.from || undefined, known: tg ? isKnownDestination(`github:${tg}`) : undefined });
    if (!t.token && tg && !isKnownDestination(`github:${tg}`)) setStatus(status, __('Dépôt jamais utilisé sur cet appareil ({host}) : aucun jeton n’est repris ; une confirmation sera demandée à la première publication.', { host: tg }), 'info');
  };
  migration.then(fill);
  const save = () => apply({ gh: { owner: owner.value, repo: repo.value, branch: branch.value || 'main', dir: dir.value } });
  [owner, repo, branch, dir].forEach(i => i.addEventListener('change', save));
  [owner, repo].forEach(i => i.addEventListener('change', fill));
  const run = async () => {
    if (!save()) return;
    const f = log.flow('publish.github', __('Publication sur GitHub'), { owner: owner.value, repo: repo.value, branch: branch.value || 'main', dir: dir.value || '(racine)', token: !!token.value });
    if (!target()) { f.fail(new Error(__('dépôt incomplet'))); setStatus(status, __('Indiquez le propriétaire et le nom du dépôt.'), 'error'); return; }
    if (!(await destinationOk('github', target(), 'publish'))) { f.cancel(__('Publication annulée : première publication vers {host} non confirmée', { host: target() }), { target: target() }); setStatus(status, __('Publication annulée : vérifiez le dépôt avant de publier.'), 'error'); return; }
    await remember('github', target(), token.value, keep.checked);
    const audit = auditSite(state.site);
    if (!audit.ok) { f.fail(new Error(audit.errors[0]), { errors: audit.errors.slice(0, 5) }, __('Publication bloquée par la vérification')); setStatus(status, __('Publication impossible : {error}', { error: audit.errors[0] }), 'error'); return; }
    setStatus(status, __('Publication sur GitHub…'));
    try {
      const files = await siteFiles();
      f.step('package', __n(files.size, '{n} fichier généré', '{n} fichiers générés'), { files: files.size }, 'info');
      const r = await publishGitHub({ token: token.value, owner: owner.value, repo: repo.value, branch: branch.value || 'main', dir: dir.value, files, message: __('Publication du site {name} depuis Atelier', { name: state.site.name }), onProgress: p => { f.step('upload', __('Fichier envoyé {done} / {total}', p), p); setStatus(status, __('Envoi des fichiers modifiés : {done} / {total}…', p)); } });
      f.ok(__('Publié sur GitHub : commit {commit}', { commit: r.commit.slice(0, 7) }), r);
      setStatus(status, __('Publié : commit {commit} — {uploaded}, {unchanged}, {removed}. OVH met le site à jour dans la minute (webhook).', { commit: r.commit.slice(0, 7), uploaded: __n(r.uploaded, '{n} fichier envoyé', '{n} fichiers envoyés'), unchanged: __n(r.unchanged, '{n} inchangé', '{n} inchangés'), removed: __n(r.removed, '{n} retiré', '{n} retirés') }), 'ok');
    } catch (e) { f.fail(e); setStatus(status, e.message, 'error'); }
  };
  return h('div', { class: 'pub-pane', 'data-pane': 'github' },
    h('p', { class: 'hint' }, __('Sans PHP : Atelier envoie le site dans un dépôt GitHub (un commit par publication, seulement les fichiers modifiés), et l’hébergement OVH le déploie grâce à son intégration Git (Hébergement → Git → associer le dépôt, avec le webhook « push »).')),
    h('div', { class: 'mini-grid' }, h('label', { class: 'mini' }, h('span', {}, __('Propriétaire')), owner), h('label', { class: 'mini' }, h('span', {}, __('Dépôt')), repo), h('label', { class: 'mini' }, h('span', {}, __('Branche')), branch), h('label', { class: 'mini' }, h('span', {}, __('Dossier du site')), dir)),
    h('label', { class: 'mini' }, h('span', {}, __('Jeton à accès limité (GitHub → Settings → Developer settings → Fine-grained tokens, ce dépôt seulement, « Contents : Read and write »)')), token),
    h('label', { class: 'check check--sm' }, keep, __('Se souvenir sur cet appareil, pour ce dépôt seulement (jamais dans le projet)')),
    h('div', { class: 'row-btns' }, h('button', { type: 'button', class: 'btn btn--small btn--primary', 'data-gh-run': '', onclick: run }, __('🚀 Publier sur GitHub'))),
    status);
}

function zipTab(d) {
  return h('div', { class: 'pub-pane', 'data-pane': 'zip' },
    h('p', { class: 'hint' }, __('Téléchargez le site complet en .zip, puis déposez son contenu sur n’importe quel hébergement (FTP, gestionnaire de fichiers).')),
    h('button', { type: 'button', class: 'btn btn--small btn--primary', 'data-pub-zip': '', onclick: () => { d.close(); exportZipHandler?.(); } }, __('⇩ Télécharger le site (.zip)')));
}

export function openPublish() {
  $('#publishDialog')?.remove();
  const mode = state.site.publish?.mode || 'zip';
  tab = tab || (mode === 'github' ? 'github' : mode === 'php' ? 'php' : 'php');
  const audit = auditSite(state.site);
  log.info('publish.open', __('Fenêtre Publier'), { mode, tab, ok: audit.ok, errors: audit.errors.length, warnings: audit.warnings.length, firstError: audit.errors[0] });
  migration = migrateLegacyTokens(state.site).catch(() => {});
  const d = h('dialog', { class: 'audit', id: 'publishDialog', 'aria-labelledby': 'publishTitle' });
  const panes = { php: phpTab(d), github: githubTab(), zip: zipTab(d) };
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, [['php', 'OVH (publish.php)'], ['github', 'GitHub → OVH'], ['zip', __('Fichier .zip')]].map(([k, l]) => h('button', {
    type: 'button', role: 'tab', 'data-pub-tab': k, 'aria-selected': String(tab === k),
    onclick: () => { tab = k; tabs.querySelectorAll('[role=tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.pubTab === k))); Object.entries(panes).forEach(([n, el]) => { el.hidden = n !== k; }); }
  }, l)));
  Object.entries(panes).forEach(([n, el]) => { el.hidden = n !== tab; });
  d.append(
    h('header', { class: 'audit__head' }, h('h2', { id: 'publishTitle' }, __('Publier le site')), h('button', { type: 'button', class: 'icon-btn', 'aria-label': __('Fermer'), onclick: () => d.close() }, '✕')),
    h('p', { class: `audit__summary ${audit.ok ? (audit.warnings.length ? 'is-warn' : 'is-ok') : 'is-error'}` }, audit.ok ? (audit.warnings.length ? __n(audit.warnings.length, '{n} point à vérifier (bouton « Exporter le site » pour le détail) : vous pouvez publier.', '{n} points à vérifier (bouton « Exporter le site » pour le détail) : vous pouvez publier.') : __('Vérification réussie : prêt à publier.')) : __('Publication bloquée : {error}', { error: audit.errors[0] })),
    tabs, h('div', { class: 'a11y-form' }, ...Object.values(panes)),
    h('footer', { class: 'audit__foot' }, h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Fermer'))));
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
}

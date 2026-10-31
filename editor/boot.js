/*
 * Démarrage de l'éditeur (cycle 29, script classique, sans code en ligne pour la CSP de index.html) :
 * 1. note les erreurs de chargement et un démarrage qui n'aboutit pas (le journal complet prend ensuite le relais) ;
 * 2. choisit la langue de l'interface (?lang=, choix retenu, langue du navigateur) ;
 * 3. charge le catalogue de cette langue (i18n/<langue>.js) puis seulement editor/app.js (les modules traduisent
 *    certains libellés dès leur chargement : le catalogue doit être là avant). Plus de document.write.
 */
(function () {
  var E = window.__atelierEarly = [];
  function push(k, d) {
    if (window.atelierDebug) return;
    E.push({ t: Date.now(), k: k, d: d });
    try { console.error('[Atelier] ' + k + ' ' + JSON.stringify(d)); } catch (e) { /* console indisponible */ }
  }
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t !== window && t.nodeType === 1) push('boot.resource', { message: 'Fichier non chargé : ' + (t.src || t.href || t.tagName), url: t.src || t.href, tag: t.tagName });
    else push('boot.error', { message: e.message, file: e.filename, line: e.lineno, col: e.colno });
  }, true);
  window.addEventListener('unhandledrejection', function (e) { push('boot.rejection', { message: String((e.reason && e.reason.message) || e.reason) }); });
  setTimeout(function () {
    if (window.__atelier && window.__atelier.ready) return;
    var m = 'L’éditeur n’a pas démarré en 15 s (erreurs de démarrage : ' + E.length + ')';
    if (window.atelierDebug) window.atelierDebug.log.error('boot.timeout', m, { early: E.length });
    else { E.push({ t: Date.now(), k: 'boot.timeout', d: { message: m } }); console.error('[Atelier] boot.timeout ' + m); }
  }, 15000);

  var L = { fr: 1, en: 1, ja: 1 };
  var l = null;
  var q = null;
  try { q = new URLSearchParams(location.search).get('lang'); } catch (e) { /* adresse illisible */ }
  if (q && L[q]) { l = q; try { localStorage.setItem('atelier-ui-lang', q); } catch (e) { /* stockage indisponible */ } }
  if (!l) { try { var s = localStorage.getItem('atelier-ui-lang'); if (s && L[s]) l = s; } catch (e) { /* stockage indisponible */ } }
  if (!l) {
    var n = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < n.length && !l; i++) { var b = String(n[i] || '').toLowerCase().slice(0, 2); if (L[b]) l = b; }
    if (!l) l = n.length ? 'en' : 'fr';
  }
  window.__atelierUiLang = l;
  document.documentElement.lang = l;

  function start() {
    var app = document.createElement('script');
    app.type = 'module';
    app.src = 'editor/app.js';
    document.head.appendChild(app);
  }
  if (l === 'fr') { start(); return; }
  var cat = document.createElement('script');
  cat.src = 'i18n/' + l + '.js';
  cat.onload = start;
  cat.onerror = start;
  document.head.appendChild(cat);
})();

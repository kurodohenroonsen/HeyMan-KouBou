/* Guide d'Atelier : recherche dans la langue, détails techniques, menu sur petit écran. Sans dépendance. */
(function () {
  var G = window.GUIDE || {};
  var INDEX = window.GUIDE_INDEX || [];
  var root = document.documentElement;

  /* Détails techniques (journal, codes) : repliés par défaut, choix retenu */
  var tech = document.getElementById('gTech');
  if (tech) {
    tech.checked = root.classList.contains('show-tech');
    tech.addEventListener('change', function () {
      root.classList.toggle('show-tech', tech.checked);
      try { localStorage.setItem('atelier-guide-tech', tech.checked ? '1' : '0'); } catch (e) { /* stockage indisponible */ }
    });
  }

  /* Menu sur petit écran */
  var menu = document.getElementById('gMenu');
  var nav = document.getElementById('gNav');
  if (menu && nav) menu.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    menu.setAttribute('aria-expanded', String(open));
  });

  /* Recherche : tous les mots (sans accents en français et en anglais ; sous-chaîne en japonais) */
  var input = document.getElementById('gSearch');
  var list = document.getElementById('gResults');
  if (!input || !list) return;
  var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var escHtml = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var words = function (q) { return norm(q).split(/[\s　]+/).filter(Boolean); };
  var prepared = INDEX.map(function (e) { return { e: e, h: norm(e.h), c: norm(e.c), x: norm(e.x) }; });
  function search(q) {
    var w = words(q);
    if (!w.length) return [];
    var out = [];
    for (var i = 0; i < prepared.length; i++) {
      var p = prepared[i];
      var all = p.h + ' ' + p.c + ' ' + p.x;
      var ok = true, score = 0;
      for (var k = 0; k < w.length; k++) {
        if (all.indexOf(w[k]) < 0) { ok = false; break; }
        if (p.h.indexOf(w[k]) >= 0) score += 5;
        if (p.c.indexOf(w[k]) >= 0) score += 2;
        score += 1;
      }
      if (ok) out.push({ e: p.e, s: score });
    }
    out.sort(function (a, b) { return b.s - a.s; });
    return out.slice(0, 12);
  }
  function snippet(text, q) {
    var w = words(q)[0] || '';
    var n = norm(text);
    var at = Math.max(0, n.indexOf(w) - 50);
    var part = text.slice(at, at + 150);
    var html = escHtml(part);
    if (w) {
      var nh = norm(part);
      var pos = nh.indexOf(w);
      if (pos >= 0) html = escHtml(part.slice(0, pos)) + '<mark>' + escHtml(part.slice(pos, pos + w.length)) + '</mark>' + escHtml(part.slice(pos + w.length));
    }
    return (at ? '… ' : '') + html + ' …';
  }
  function render() {
    var q = input.value.trim();
    if (q.length < 2) { list.hidden = true; list.innerHTML = ''; return; }
    var r = search(q);
    list.innerHTML = r.length ? r.map(function (x) {
      return '<li><a href="' + escHtml(x.e.p) + '"><strong>' + escHtml(x.e.h) + '</strong><small>' + escHtml(x.e.c) + ' — ' + snippet(x.e.x, q) + '</small></a></li>';
    }).join('') : '<li><small>' + escHtml(G.noResult || '') + '</small></li>';
    list.hidden = false;
  }
  input.addEventListener('input', render);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { input.value = ''; render(); }
    if (e.key === 'Enter') { var a = list.querySelector('a'); if (a) location.href = a.href; }
    if (e.key === 'ArrowDown') { var f = list.querySelector('a'); if (f) { e.preventDefault(); f.focus(); } }
  });
  list.addEventListener('keydown', function (e) {
    var items = Array.prototype.slice.call(list.querySelectorAll('a'));
    var i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' && i < items.length - 1) { e.preventDefault(); items[i + 1].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? items[i - 1] : input).focus(); }
    if (e.key === 'Escape') { input.focus(); input.value = ''; render(); }
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.g-search')) list.hidden = true; });
  /* « / » pour chercher */
  var typing = function (el) { return el && (el.isContentEditable || el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset)$/.test(el.type))); };
  document.addEventListener('keydown', function (e) { if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !typing(document.activeElement)) { e.preventDefault(); input.focus(); input.select(); } });
})();

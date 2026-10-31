/*
 * Auto-test en console (cycle 20) : catalogue des cas d'usage rejoués dans l'éditeur, évaluation, rapport.
 * Sans DOM : l'éditeur (editor/selftest.js) joue les cas, ce module juge et met en forme.
 *   expect : codes du journal attendus pendant le cas (« a|b » : l'un ou l'autre)
 *   allow  : erreurs prévues par le cas (motif « domaine.* » accepté)
 *   needs  : 'ai' (modèle d'IA), 'publish' (adresse de publish.php), 'collab' (deux appareils)
 */
import { formatEntry, headerLabel } from './log.js';
import { __, __n } from './ui-i18n.js';

const C = (id, chapter, title, expect, { needs = [], allow = [], timeout = 15000 } = {}) => ({ id, chapter, title, expect, needs, allow, timeout });

export const SELFTEST_CASES = [
  C('demarrage', 1, __('Projet de test chargé et enregistré sur l’appareil'), ['store.load', 'storage.save']),
  C('journal', 0, __('Fenêtre 🐞 Journal : ouvrir, régler, fermer'), ['ui.dialog.open', 'log.settings', 'ui.dialog.close']),
  C('selection', 2, __('Sélectionner : clic, flèche ↓, Échap'), ['store.select', 'canvas.key', 'action.parent']),
  C('ajout', 2, __('Ajouter un widget depuis la bibliothèque'), ['library.insert', 'action.add', 'store.commit']),
  C('annuler', 2, __('Annuler puis rétablir'), ['store.undo', 'store.redo']),
  C('raccourcis', 2, __('Dupliquer, copier, coller, supprimer au clavier'), ['action.duplicate', 'action.copy', 'action.paste', 'action.delete']),
  C('texte', 2, __('Modifier un titre directement dans la page'), ['edit.dblclick', 'edit.start', 'store.commit', 'edit.ok']),
  C('infobulles', 2, __('Infobulles des boutons : survol, raccourci, masquage'), []),
  C('panneaux', 2, __('Élargir les panneaux de gauche et de droite (clavier, double-clic)'), ['ui.panel-resize', 'ui.panel-reset']),
  C('commande', 2, __('Ctrl+K : lancer une commande'), ['cmdk.run', 'ui.dialog.open']),
  C('style', 3, __('Style : taille du texte, puis réinitialiser'), ['inspector.tab', 'style.set', 'style.reset']),
  C('appareils', 3, __('Aperçu mobile puis ordinateur'), ['store.view', 'canvas.scale']),
  C('pages', 4, __('Créer puis supprimer une page'), ['page.add', 'page.delete', 'store.commit']),
  C('image', 4, __('Importer un logo (image dessinée par le test)'), ['image.import.start', 'image.import.ok', 'settings.logo']),
  C('collection', 4, __('Agenda : créer, ajouter un événement, exporter en CSV'), ['collection.new.kind', 'collection.create', 'collection.open', 'collection.item.add', 'collection.item.value', 'collection.csv-export']),
  C('versions', 4, __('Versions : enregistrer puis supprimer'), ['version.open', 'version.save.start', 'version.save.ok', 'version.delete']),
  C('traductions', 5, __('Tableau des traductions : ouvrir, filtrer'), ['i18n.open', 'i18n.filter']),
  C('seo', 6, __('Référencement : ouvrir, changer de langue'), ['seo.open', 'seo.lang']),
  C('ia-etat', 7, __('IA locale : état des modèles'), ['ai.dialog']),
  C('verifier-exporter', 8, __('Vérifier puis exporter le site en .zip'), ['audit.open', 'audit.export', 'export.zip.start', 'export.zip.ok']),
  C('enregistrer-json', 1, __('Enregistrer le projet en .json (menu Fichier)'), ['project.export-json']),
  C('publication', 8, __('Tester la connexion à publish.php (sans publier)'), ['publish.test.start', 'publish.test.ok|publish.test.fail'], { needs: ['publish'], allow: ['publish.test.*', 'net.fail'], timeout: 20000 }),
  C('palette', 12, __('Palette depuis le logo, puis annuler'), ['smart.palette.start', 'smart.palette.colors', 'smart.palette.ok', 'store.undo']),
  C('contenus-texte', 12, __('Fiches créées depuis un texte collé (IA)'), ['smart.paste.start', 'ai.extract.start', 'ai.extract.ok', 'smart.paste.ok'], { needs: ['ai'], timeout: 60000 }),
  C('demander', 13, __('Demander à Atelier : « ajoute une FAQ de 3 questions » (IA)'), ['assist.open', 'ai.plan.start', 'ai.plan.ok', 'assist.apply.ok'], { needs: ['ai'], timeout: 60000 }),
  C('collaboration', 10, __('Collaboration en direct (deux appareils)'), [], { needs: ['collab'] })
];

export const STATUS_TEXT = { ok: __('✓ réussi'), fail: __('✗ échoué'), error: __('⚠ erreur'), skipped: __('– ignoré') };

const list = v => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const matches = (c, x) => (typeof x === 'number' || /^\d+$/.test(String(x)) ? c.chapter === Number(x) : c.id === x);

export function pickCases(cases, { only, skip } = {}) {
  const o = list(only);
  const s = list(skip);
  return cases.filter(c => (!o.length || o.some(x => matches(c, x))) && !s.some(x => matches(c, x)));
}

export function checkCodes(entries, expect) {
  const have = new Set(entries.map(e => e.code));
  const seen = [];
  const missing = [];
  for (const x of expect) (x.split('|').some(c => have.has(c)) ? seen : missing).push(x);
  return { seen, missing };
}

const allowed = (code, allow) => allow.some(a => (a.endsWith('.*') ? code.startsWith(a.slice(0, -1)) : code === a));
export function unexpectedErrors(entries, allow = []) {
  return entries.filter(e => e.level === 'error' && !allowed(e.code, allow));
}

export function caseResult(c, { checks = [], entries = [], error = null, skipped = null, ms = 0 } = {}) {
  const base = { id: c.id, chapter: c.chapter, title: c.title, ms: Math.round(ms) };
  if (skipped) return { ...base, status: 'skipped', reason: skipped, checks: [], failed: [], missing: [], errors: [], lines: [] };
  const failed = checks.filter(x => !x.ok);
  const { missing } = checkCodes(entries, c.expect);
  const errors = unexpectedErrors(entries, c.allow);
  const status = error ? 'error' : failed.length || missing.length || errors.length ? 'fail' : 'ok';
  return {
    ...base, status, checks, failed, missing,
    errors: errors.map(e => ({ code: e.code, msg: e.msg })),
    cause: error ? String(error.message || error) : undefined,
    lines: status === 'ok' ? [] : entries.slice(-80).map(e => formatEntry(e))
  };
}

export function selftestSummary(results) {
  const n = k => results.filter(r => r.status === k).length;
  const s = { total: results.length, ok: n('ok'), fail: n('fail'), error: n('error'), skipped: n('skipped') };
  const played = s.total - s.skipped;
  return { ...s, score: played ? Math.round((100 * s.ok) / played) : 0 };
}

const AI_TEXT = { fake: __('faux modèle intégré (vérifie les écrans, pas la qualité des réponses)'), real: __('Gemini Nano de ce navigateur'), false: __('cas d’IA ignorés') };

/* Ligne de résultat (rapport, fenêtre, console) : construite depuis le résumé, jamais relue dans le texte */
export const resultShort = s => __('{ok} / {played} réussis', { ok: s.ok, played: s.total - s.skipped });
export const resultLine = s => __('Résultat : {result}', { result: resultShort(s) });
export const resultDetail = s => __('· {fail} échoué(s) · {error} erreur(s) · {skipped} ignoré(s) — Note : {score} / 100', { fail: s.fail, error: s.error, skipped: s.skipped, score: s.score });

export function rollbackText(r) {
  if (!r) return __('Retour arrière : non effectué');
  if (r.ok && r.same) {
    const back = r.name ? __n(r.pages, 'Retour arrière : ✓ ton projet est revenu exactement comme avant (« {name} », {n} page)', 'Retour arrière : ✓ ton projet est revenu exactement comme avant (« {name} », {n} pages)', { name: r.name }) : __('Retour arrière : ✓ ton projet est revenu exactement comme avant');
    return r.versions || r.assets ? __('{rollback} ; {versions} version(s) et {assets} image(s) temporaires supprimées.', { rollback: back, versions: r.versions || 0, assets: r.assets || 0 }) : __('{rollback}.', { rollback: back });
  }
  return __('Retour arrière : ✗ {problems}. La copie de secours est gardée : lance `await atelierDebug.rollback()`, ou restaure la version « Avant l’auto-test » (Fichier → Versions).', { problems: [...(r.problems || []), __('à vérifier')].join(' ; ') });
}

export function selftestReport({ results, summary, rollback, env = {}, options = {}, started = '', ms = 0, issues = [], full = [] }) {
  const s = summary || selftestSummary(results);
  const out = [__('# Auto-test d’Atelier'), ''];
  out.push(__('- Date : {date}', { date: started }), __('- Durée : {s} s', { s: (ms / 1000).toFixed(1) }), __('- IA : {ai}', { ai: AI_TEXT[String(options.ai ?? 'fake')] || options.ai }));
  const only = list(options.only).join(', ');
  const skip = list(options.skip).join(', ');
  if (options.only && options.skip) out.push(__('- Sélection : seulement {only} sauf {skip}', { only, skip }));
  else if (options.only) out.push(__('- Sélection : seulement {only}', { only }));
  else if (options.skip) out.push(__('- Sélection : sauf {skip}', { skip }));
  out.push('', `**${resultLine(s)}** ${resultDetail(s)}`, '', `**${rollbackText(rollback)}**`, '');
  out.push(__('| # | Cas d’usage | Chapitre | Statut | Durée |'), '|---|---|---|---|---|');
  results.forEach((r, i) => out.push(`| ${i + 1} | ${r.title} | ${r.chapter} | ${r.status === 'skipped' ? `${STATUS_TEXT.skipped} — ${r.reason}` : STATUS_TEXT[r.status]} | ${r.status === 'skipped' ? '' : `${r.ms} ms`} |`));
  const bad = results.filter(r => r.status === 'fail' || r.status === 'error');
  if (bad.length) {
    out.push('', __('## Détail des problèmes'));
    for (const r of bad) {
      out.push('', __('### {icon} {title} (`{id}`, chapitre {chapter})', { icon: r.status === 'error' ? '⚠' : '✗', title: r.title, id: r.id, chapter: r.chapter }));
      if (r.cause) out.push(__('- arrêt du cas : {cause}', { cause: r.cause }));
      for (const c of r.failed) out.push(`- ✗ ${c.label}${c.detail ? ` — ${c.detail}` : ''}`);
      for (const m of r.missing) out.push(__('- journal attendu manquant : `{code}`', { code: m }));
      for (const e of r.errors) out.push(__('- erreur inattendue : `{code}` {message}', { code: e.code, message: e.msg }));
      if (r.lines.length) out.push('', __('Journal du cas :'), '```', ...r.lines, '```');
    }
  }
  if (issues.length) out.push('', __('## Avertissements et erreurs pendant l’auto-test'), '```', ...issues.slice(-60).map(e => formatEntry(e)), '```');
  out.push('', __('## Environnement'), ...Object.entries(env).map(([k, v]) => `- ${headerLabel(k)} : ${typeof v === 'string' ? v : JSON.stringify(v)}`));
  if (full.length) out.push('', __('## Journal complet de l’auto-test'), '```', ...full.map(e => formatEntry(e)), '```');
  return out.join('\n') + '\n';
}

/* JSON à clés triées : deux projets identiques donnent la même chaîne, quel que soit l'ordre des clés */
export function stableJson(v) {
  if (Array.isArray(v)) return `[${v.map(x => (x === undefined ? 'null' : stableJson(x))).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${stableJson(v[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
}

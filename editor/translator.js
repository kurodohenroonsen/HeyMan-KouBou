/*
 * Traduction sur l'appareil : API Translator intégrée à Chrome (138+, ordinateur). Rien n'est envoyé à un serveur.
 * Pour les tests, window.__atelierTranslator(text, from, to) peut remplacer l'API.
 *
 * Journal (domaine translate.*) : état par paire de langues, création et téléchargement du modèle, chaque texte traduit (trace),
 * échecs avec la cause probable.
 */
import { log } from './log.js';
import { __ } from '../core/ui-i18n.js';

const cache = new Map();
const states = new Map();
const msSince = t0 => Math.round(performance.now() - t0);

/* Dernier état connu par paire, pour l'en-tête du journal */
export function translatorStates() {
  if (!states.size) return 'pas encore vérifié';
  return [...states].map(([k, v]) => `${k}=${v}`).join(' ');
}

/* Cause probable : donnée du journal (non traduite) */
const hint = e => (e?.name === 'NotAllowedError' ? 'Chrome exige un clic de la personne pour télécharger le modèle de traduction (geste requis).'
  : e?.name === 'NotSupportedError' ? 'Paire de langues non prise en charge par Chrome.'
    : e?.name === 'NetworkError' ? 'Téléchargement du modèle interrompu (connexion).'
      : e?.name === 'QuotaExceededError' ? 'Texte trop long ou espace disque insuffisant.' : undefined);

export async function translatorStatus(from, to) {
  const pair = `${from}>${to}`;
  if (typeof window.__atelierTranslator === 'function') {
    states.set(pair, 'test');
    log.info('translate.status', __('Traducteur {from} → {to} : traducteur de test', { from, to }), { from, to, state: 'available', source: 'test' });
    return { available: true, state: 'available', label: __('Traducteur de test') };
  }
  if (!('Translator' in self)) {
    states.set(pair, 'absent');
    log.warn('translate.absent', __('Pas d’API Translator dans ce navigateur (Chrome 138+ sur ordinateur) : export CSV proposé'), { from, to, ua: navigator.userAgentData?.brands?.map(b => `${b.brand} ${b.version}`).join(', ') || undefined });
    return { available: false, state: 'unsupported', label: __('La traduction automatique sur l’appareil demande Chrome 138 ou plus récent, sur ordinateur. Vous pouvez aussi exporter le tableau en CSV pour un traducteur.') };
  }
  const t0 = performance.now();
  try {
    const a = await Promise.race([
      self.Translator.availability({ sourceLanguage: from, targetLanguage: to }),
      new Promise(res => setTimeout(() => res('timeout'), 4000))
    ]);
    states.set(pair, a);
    if (a === 'timeout') {
      log.warn('translate.timeout', __('Translator.availability({from} → {to}) sans réponse après 4 s : considéré indisponible', { from, to }), { from, to, ms: msSince(t0) });
      return { available: false, state: a, label: __('Chrome ne répond pas pour la traduction automatique sur cet appareil (modèle indisponible). Utilisez l’export CSV pour un traducteur.') };
    }
    if (a === 'unavailable') {
      log.warn('translate.unavailable', __('Chrome ne propose pas {from} → {to} sur cet appareil', { from, to }), { from, to, state: a, ms: msSince(t0) });
      return { available: false, state: a, label: __('Chrome ne propose pas la traduction {from} → {to} sur cet appareil.', { from: from.toUpperCase(), to: to.toUpperCase() }) };
    }
    log.info('translate.status', a === 'available' ? __('Traducteur {from} → {to} : {state}', { from, to, state: a }) : __('Traducteur {from} → {to} : {state} (modèle à télécharger au premier clic)', { from, to, state: a }), { from, to, state: a, ms: msSince(t0), source: 'chrome' });
    return { available: true, state: a, label: a === 'available' ? __('Traducteur prêt (sur cet appareil).') : __('Le modèle de traduction sera téléchargé une fois par Chrome, puis tout reste sur cet appareil.') };
  } catch (e) {
    states.set(pair, 'error');
    log.warn('translate.status-fail', __('Translator.availability({from} → {to}) a échoué : {name} — {error}', { from, to, name: e?.name || 'Error', error: e?.message || e }), { from, to, ms: msSince(t0), error: e, hint: hint(e) });
    return { available: false, state: 'error', label: __('Traduction automatique indisponible : {error}', { error: e.message }) };
  }
}

/* Mesure chaque texte traduit (trace) et journalise les échecs */
function measured(fn, from, to, source) {
  return async t => {
    const t0 = performance.now();
    try {
      const out = await fn(t);
      log.trace('translate.text', __('Texte traduit {from} → {to} ({in} → {out} car., {ms} ms)', { from, to, in: String(t ?? '').length, out: String(out ?? '').length, ms: msSince(t0) }), { from, to, inLen: String(t ?? '').length, outLen: String(out ?? '').length, ms: msSince(t0), source });
      return out;
    } catch (e) {
      log.warn('translate.text-fail', __('Traduction {from} → {to} d’un texte impossible : {name} — {error}', { from, to, name: e?.name || 'Error', error: e?.message || e }), { from, to, inLen: String(t ?? '').length, ms: msSince(t0), error: e, hint: hint(e) });
      throw e;
    }
  };
}

/* Renvoie une fonction (texte) => texte traduit ; à appeler après un clic (activation requise pour le téléchargement) */
export async function getTranslator(from, to, onDownload) {
  if (typeof window.__atelierTranslator === 'function') {
    log.debug('translate.create', __('Traducteur {from} → {to} : traducteur de test', { from, to }), { from, to, source: 'test' });
    return measured(t => window.__atelierTranslator(t, from, to), from, to, 'test');
  }
  const key = `${from}>${to}`;
  if (!cache.has(key)) {
    if (!('Translator' in self)) {
      log.warn('translate.absent', __('Pas d’API Translator dans ce navigateur : traduction impossible'), { from, to });
      throw new Error(__('La traduction sur l’appareil demande Chrome 138 ou plus récent, sur ordinateur.'));
    }
    const f = log.flow('translate.model', __('Préparation du traducteur {from} → {to}', { from, to }), { from, to });
    let shown = -1;
    const p = self.Translator.create({
      sourceLanguage: from,
      targetLanguage: to,
      monitor(m) {
        m.addEventListener('downloadprogress', e => {
          const pct = Math.round((e.loaded || 0) * 100);
          if (pct >= 100 || pct - shown >= 10) { shown = pct; f.step('download', __('Téléchargement du modèle {from} → {to} : {pct} %', { from, to, pct }), { pct }); }
          onDownload?.(e.loaded);
        });
      }
    }).then(tr => { states.set(key, 'available'); f.ok(__('Traducteur {from} → {to} prêt', { from, to }), { downloaded: shown >= 0 }); return tr; },
      e => { cache.delete(key); states.set(key, 'error'); f.fail(e, { from, to, hint: hint(e) }, __('Traducteur {from} → {to} impossible : {name} — {error}', { from, to, name: e?.name || 'Error', error: e?.message || e })); throw e; });
    cache.set(key, p);
  } else log.debug('translate.reuse', __('Traducteur {from} → {to} déjà prêt', { from, to }), { from, to });
  const tr = await cache.get(key);
  return measured(t => tr.translate(t), from, to, 'chrome');
}

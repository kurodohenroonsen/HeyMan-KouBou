/*
 * Polices embarquées (cycle 29) : lecture des fichiers woff2 de fonts/ depuis l'éditeur (même origine), pour les
 * écrire dans assets/fonts/ du site exporté ou publié ; adresse absolue du dossier fonts/ pour le canevas et l'aperçu.
 */
import { fontFilesFor } from '../core/fonts.js';
import { log } from './log.js';
import { __ } from '../core/ui-i18n.js';

const cache = new Map();

export const fontBase = () => new URL('fonts/', document.baseURI).toString();

/* Octets des polices du thème : Map chemin dans l'éditeur → Uint8Array (fichier illisible : absent, noté dans le journal) */
export async function loadFontData(site) {
  const out = new Map();
  for (const f of fontFilesFor(site)) {
    if (!cache.has(f.src)) {
      cache.set(f.src, fetch(f.src, { cache: 'force-cache' }).then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.arrayBuffer();
      }).then(b => new Uint8Array(b)).catch(e => {
        cache.delete(f.src);
        log.warn('fonts.load-fail', __('Police introuvable dans l’éditeur ({file}) : le site utilisera la police de repli', { file: f.src }), { file: f.src, error: e });
        return null;
      }));
    }
    const bytes = await cache.get(f.src);
    if (bytes) out.set(f.src, bytes);
  }
  if (out.size) log.debug('fonts.load', __('{n} fichiers de polices prêts pour le site', { n: out.size }), { files: out.size, kb: Math.round([...out.values()].reduce((n, b) => n + b.length, 0) / 1024) });
  return out;
}

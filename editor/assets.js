/*
 * Magasin d'images de l'éditeur (cycle 27) : une seule instance, partagée par l'état (store.js), le canevas (adresses
 * blob:), l'export, la publication, les versions, la collaboration et IndexedDB (storage.js). Les octets n'entrent
 * jamais dans state.site ; voir core/asset-store.js.
 */
import { createAssetStore, absorbAssets, inlineAssets, pruneStore } from '../core/asset-store.js';
import { log } from './log.js';
import { __n } from '../core/ui-i18n.js';

export const assets = createAssetStore();

/* Octets trouvés dans un site (projet .json, version, pair, test) → magasin ; le site ne garde que les métadonnées */
export function absorb(site) {
  const out = absorbAssets(site, assets);
  if (out !== site) log.debug('asset.absorb', __n(Object.keys(out.assets || {}).length, '{n} image du projet rangée dans le magasin d’images', '{n} images du projet rangées dans le magasin d’images'), { images: Object.keys(out.assets || {}).length, kb: Math.round(assets.bytes() / 1024) });
  return out;
}

/* Site autonome pour le fichier .json (octets réinjectés en data URL) */
export const inline = site => inlineAssets(site, assets);

/* Ménage : octets qu'aucun état (actuel, historique) ne référence plus */
export function prune(sites) {
  const gone = pruneStore(assets, sites);
  if (gone.length) log.debug('asset.prune', __n(gone.length, '{n} image retirée de la mémoire (plus utilisée, même dans l’historique)', '{n} images retirées de la mémoire (plus utilisées, même dans l’historique)'), { ids: gone.slice(0, 10), kb: Math.round(assets.bytes() / 1024) });
  return gone;
}

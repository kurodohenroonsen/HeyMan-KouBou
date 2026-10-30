/*
 * Conversion des images importées en WebP, directement dans le navigateur :
 * une version jusqu'à 1600 px et des variantes 480 et 960 px pour les petits écrans (srcset).
 */
import { log } from './log.js';
import { __, __n } from '../core/ui-i18n.js';

const MAX = 1600;
const VARIANTS = [480, 960];
/* Seuils du journal seulement (aucun refus) : fichier source très lourd, résultat encore lourd */
const HEAVY_IN = 8 * 1048576;
const HEAVY_OUT = 400 * 1024;
const kb = n => Math.max(1, Math.round(n / 1024));

function toDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

async function encode(bitmap, w, h, f) {
  const t0 = performance.now();
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(bitmap, 0, 0, w, h);
  let blob = await new Promise(r => canvas.toBlob(r, 'image/webp', 0.82));
  if (!blob || blob.type !== 'image/webp') {
    f?.warn('webp-unsupported', __('Ce navigateur ne sait pas produire du WebP : image enregistrée en JPEG'), { w, h, got: blob?.type || null });
    blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85));
  }
  if (!blob) throw new Error(__('La conversion de l’image a échoué.'));
  return { blob, ms: Math.round(performance.now() - t0) };
}

export async function imageToWebp(file) {
  const info = { name: String(file?.name || '').slice(0, 80), type: file?.type || '(inconnu)', kb: kb(file?.size || 0) };
  if (!/^image\/(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.type)) {
    log.warn('image.type-refused', __('Image refusée : type « {type} » non pris en charge (JPG, PNG, WebP, GIF, AVIF ou BMP)', { type: info.type }), info);
    throw new Error(__('Format non pris en charge. Utilisez une image JPG, PNG, WebP ou GIF.'));
  }
  const f = log.flow('image.import', __('Import de l’image « {name} »', { name: info.name }), info);
  if (file.size > HEAVY_IN) f.warn('heavy', __('Fichier très lourd ({mb} Mo) : la conversion peut prendre plusieurs secondes', { mb: Math.round(file.size / 1048576) }), { kb: info.kb, limit: kb(HEAVY_IN) });
  let bitmap;
  try {
    const t0 = performance.now();
    try { bitmap = await createImageBitmap(file); } catch (e) {
      throw Object.assign(new Error(__('Image illisible : fichier abîmé, incomplet, ou format que ce navigateur ne sait pas décoder.')), { cause: e });
    }
    f.step('decode', __('Image lue : {w}×{h} px', { w: bitmap.width, h: bitmap.height }), { width: bitmap.width, height: bitmap.height, ms: Math.round(performance.now() - t0) });
    const scale = Math.min(1, MAX / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    if (scale < 1) f.step('resize', __('Réduite à {w}×{h} px (largeur maximale {max} px)', { w, h, max: MAX }), { from: `${bitmap.width}×${bitmap.height}`, to: `${w}×${h}` });
    const main = await encode(bitmap, w, h, f);
    f.step('encode', __('Version principale : {w}×{h} px, {kb} Ko ({mime})', { w, h, kb: kb(main.blob.size), mime: main.blob.type }), { w, h, mime: main.blob.type, kb: kb(main.blob.size), ms: main.ms });
    const variants = [];
    for (const vw of VARIANTS) {
      if (vw >= w) continue;
      const v = await encode(bitmap, vw, Math.round(h * vw / w), f);
      variants.push({ w: vw, dataUrl: await toDataUrl(v.blob), bytes: v.blob.size });
      f.step('variant', __('Variante {w} px : {kb} Ko', { w: vw, kb: kb(v.blob.size) }), { w: vw, kb: kb(v.blob.size), ms: v.ms });
    }
    bitmap.close?.();
    if (main.blob.size > HEAVY_OUT) f.warn('big-output', __('Image encore lourde après conversion ({kb} Ko) : le site sera plus lent à charger', { kb: kb(main.blob.size) }), { kb: kb(main.blob.size), limit: kb(HEAVY_OUT) });
    const ext = main.blob.type === 'image/webp' ? 'webp' : 'jpg';
    const base = file.name.replace(/\.[^.]+$/, '') || 'image';
    const out = { name: `${base}.${ext}`, mime: main.blob.type, dataUrl: await toDataUrl(main.blob), width: w, height: h, bytes: main.blob.size, variants };
    const gain = file.size ? Math.min(99, Math.round((1 - main.blob.size / file.size) * 100)) : 0;
    f.ok(__n(variants.length, 'Image prête : {w}×{h} px, {kb} Ko ({gain}), {n} variante', 'Image prête : {w}×{h} px, {kb} Ko ({gain}), {n} variantes', { w, h, kb: kb(main.blob.size), gain: gain >= 0 ? `−${gain} %` : `+${-gain} %` }), { name: out.name, mime: out.mime, width: w, height: h, kbIn: info.kb, kbOut: kb(main.blob.size), gain, variants: variants.map(v => v.w) });
    return out;
  } catch (e) {
    bitmap?.close?.();
    f.fail(e, { name: info.name, type: info.type, kb: info.kb, cause: e.cause ? String(e.cause.message || e.cause).slice(0, 120) : undefined });
    throw e;
  }
}

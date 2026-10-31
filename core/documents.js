/* Documents à télécharger (cycle 33, W4) : types acceptés (PDF, bureautique, archive, audio, agenda), taille
 * maximale, taille réelle d'un data: URL et libellé « PDF, 1,2 Mo » dans les cinq langues du site. */

export const MAX_DOC_BYTES = 25 * 1024 * 1024;

export const DOC_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  ics: 'text/calendar'
};

/* Extensions pour le champ « fichier » (attribut accept) */
export const DOC_ACCEPT = Object.keys(DOC_TYPES).map(e => `.${e}`).join(',');

/* { ext, mime } d'après le nom du fichier, ou null si le type n'est pas accepté */
export function docTypeOf(name) {
  const ext = /\.([a-z0-9]+)$/i.exec(String(name || ''))?.[1]?.toLowerCase();
  return ext && DOC_TYPES[ext] ? { ext, mime: DOC_TYPES[ext] } : null;
}

/* Nombre d'octets d'un data:…;base64, (null si illisible) */
export function dataUrlBytes(dataUrl) {
  const m = /^data:[\w.+/-]*(;[\w-]+=[\w-]+)*;base64,([a-z0-9+/]*={0,2})$/i.exec(String(dataUrl || ''));
  if (!m) return null;
  const b = m[2];
  return Math.floor(b.length * 3 / 4) - (b.endsWith('==') ? 2 : b.endsWith('=') ? 1 : 0);
}

const UNITS = { fr: ['Ko', 'Mo'], nl: ['KB', 'MB'], de: ['KB', 'MB'], en: ['KB', 'MB'], ja: ['KB', 'MB'] };
const DECIMAL = { fr: ',', nl: ',', de: ',', en: '.', ja: '.' };

/* « PDF, 1,2 Mo » (fr) · « PDF、1.2 MB » (ja) : type et taille d'un document, pour le lien publié */
export function docMeta(asset, lang = 'fr') {
  const l = UNITS[lang] ? lang : 'en';
  const ext = (/\.([a-z0-9]+)$/i.exec(asset?.file || '')?.[1] || '').toUpperCase();
  const n = Number(asset?.size) || 0;
  const mb = n / 1048576;
  const size = mb >= 1 ? `${(Math.round(mb * 10) / 10).toFixed(1).replace('.', DECIMAL[l])} ${UNITS[l][1]}` : `${Math.max(1, Math.round(n / 1024))} ${UNITS[l][0]}`;
  return [ext, size].filter(Boolean).join(l === 'ja' ? '、' : ', ');
}

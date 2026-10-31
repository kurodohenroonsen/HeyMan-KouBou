/*
 * Empreinte courte et stable d'un contenu (FNV-1a 32 bits, 8 caractères hexadécimaux), pour suffixer les noms
 * des fichiers de assets/ : un fichier modifié change de nom, le cache long du navigateur ne sert jamais une
 * ancienne version. Pas une empreinte de sécurité : seulement un identifiant de contenu.
 */
export function fingerprint(input) {
  let h = 0x811c9dc5;
  if (typeof input === 'string') {
    for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i) & 0xff; h = Math.imul(h, 0x01000193); }
  } else {
    for (let i = 0; i < input.length; i++) { h ^= input[i]; h = Math.imul(h, 0x01000193); }
  }
  h ^= input.length;
  h = Math.imul(h, 0x01000193);
  return (h >>> 0).toString(16).padStart(8, '0');
}

/* « logo.png » → « logo-1a2b3c4d.png » (le suffixe précède l'extension) */
export function suffixed(file, hash) {
  const dot = file.lastIndexOf('.');
  return dot > 0 ? `${file.slice(0, dot)}-${hash}${file.slice(dot)}` : `${file}-${hash}`;
}

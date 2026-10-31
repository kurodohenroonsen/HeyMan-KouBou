/*
 * Illustrations de la démonstration (cycle 26) : dessinées à la volée sur un canvas (formes et couleurs sobres,
 * nom du lieu), converties en WebP. Aucune photo tierce : le site d'exemple n'emprunte rien à personne.
 */

const PALETTE = { sky: '#dbe9f3', sky2: '#f6f1e6', green: '#2f6b4f', green2: '#4f8f6a', green3: '#8fbf9b', ochre: '#c8902e', rock: '#8a8178', rock2: '#b9b0a4', water: '#3d8f99', night: '#101a33', snow: '#f7f9fc', ink: '#18181c', wood: '#7a4a2a' };

function base(g, w, h, top, bottom) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, top);
  sky.addColorStop(1, bottom);
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
}

function mountains(g, w, h, color, y0, peaks) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, h);
  g.lineTo(0, y0);
  for (const [x, y] of peaks) g.lineTo(x * w, y * h);
  g.lineTo(w, y0);
  g.lineTo(w, h);
  g.closePath();
  g.fill();
}

function trees(g, w, h, n, color, y, seed = 1) {
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const x = rnd() * w;
    const th = 40 + rnd() * 70;
    g.beginPath();
    g.moveTo(x, y - th);
    g.lineTo(x + th * 0.35, y);
    g.lineTo(x - th * 0.35, y);
    g.closePath();
    g.fill();
  }
}

function label(g, w, h, text) {
  if (!text) return;
  g.fillStyle = 'rgba(24,24,28,.55)';
  g.fillRect(0, h - 64, w, 64);
  g.fillStyle = '#fff';
  g.font = `600 ${Math.round(h / 16)}px system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif`;
  g.textBaseline = 'middle';
  g.fillText(text, 28, h - 32);
}

const KINDS = {
  logo(g, w, h) {
    base(g, w, h, PALETTE.green, PALETTE.green2);
    g.fillStyle = PALETTE.snow;
    g.beginPath(); g.moveTo(w * 0.5, h * 0.18); g.lineTo(w * 0.78, h * 0.78); g.lineTo(w * 0.22, h * 0.78); g.closePath(); g.fill();
    g.fillStyle = PALETTE.ochre;
    g.beginPath(); g.arc(w * 0.76, h * 0.26, h * 0.09, 0, Math.PI * 2); g.fill();
  },
  highland(g, w, h) {
    base(g, w, h, PALETTE.sky, PALETTE.sky2);
    mountains(g, w, h, PALETTE.rock2, h * 0.62, [[0.2, 0.42], [0.42, 0.3], [0.62, 0.45], [0.85, 0.34]]);
    mountains(g, w, h, PALETTE.green2, h * 0.75, [[0.3, 0.6], [0.6, 0.66], [0.9, 0.58]]);
    mountains(g, w, h, PALETTE.green, h * 0.85, [[0.25, 0.8], [0.55, 0.86], [0.8, 0.78]]);
    trees(g, w, h, 18, PALETTE.green, h * 0.98, 3);
  },
  karst(g, w, h) {
    base(g, w, h, PALETTE.sky, '#eef4ec');
    mountains(g, w, h, PALETTE.green3, h * 0.55, [[0.3, 0.46], [0.7, 0.5]]);
    mountains(g, w, h, PALETTE.green2, h * 0.7, [[0.2, 0.62], [0.5, 0.68], [0.8, 0.6]]);
    g.fillStyle = PALETTE.rock2;
    for (let i = 0; i < 14; i++) { const x = (i * 97 + 31) % w; const y = h * 0.72 + ((i * 53) % 100); g.beginPath(); g.ellipse(x, y, 16 + (i % 4) * 5, 10 + (i % 3) * 3, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = PALETTE.ink;
    for (let i = 0; i < 4; i++) { const x = w * (0.2 + i * 0.2); const y = h * 0.84; g.fillRect(x, y, 26, 14); g.fillRect(x + 20, y - 8, 12, 10); }
  },
  gorge(g, w, h) {
    base(g, w, h, PALETTE.sky, '#e6efe8');
    mountains(g, w, h, PALETTE.rock, h * 0.3, [[0.35, 0.2], [0.42, 0.95]]);
    mountains(g, w, h, PALETTE.rock2, h * 0.25, [[0.58, 0.95], [0.66, 0.18]]);
    g.fillStyle = PALETTE.water;
    g.beginPath(); g.moveTo(w * 0.42, h * 0.95); g.quadraticCurveTo(w * 0.5, h * 0.7, w * 0.44, h * 0.5); g.lineTo(w * 0.56, h * 0.5); g.quadraticCurveTo(w * 0.52, h * 0.7, w * 0.58, h * 0.95); g.closePath(); g.fill();
    trees(g, w, h, 10, PALETTE.green, h * 0.5, 7);
  },
  temple(g, w, h) {
    base(g, w, h, PALETTE.sky2, '#e8eadf');
    trees(g, w, h, 26, PALETTE.green, h * 0.9, 11);
    g.fillStyle = PALETTE.wood;
    g.fillRect(w * 0.36, h * 0.5, w * 0.28, h * 0.32);
    g.fillStyle = PALETTE.ink;
    g.beginPath(); g.moveTo(w * 0.28, h * 0.52); g.quadraticCurveTo(w * 0.5, h * 0.28, w * 0.72, h * 0.52); g.lineTo(w * 0.5, h * 0.46); g.closePath(); g.fill();
    g.fillStyle = PALETTE.sky2;
    g.fillRect(w * 0.46, h * 0.62, w * 0.08, h * 0.2);
  },
  stars(g, w, h) {
    base(g, w, h, PALETTE.night, '#2a3a63');
    g.fillStyle = '#fff';
    for (let i = 0; i < 90; i++) { const x = (i * 131 + 17) % w; const y = (i * 71 + 23) % (h * 0.7); const r = 1 + (i % 3); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.12)';
    g.beginPath(); g.moveTo(0, h * 0.5); g.quadraticCurveTo(w * 0.5, h * 0.05, w, h * 0.4); g.lineTo(w, h * 0.55); g.quadraticCurveTo(w * 0.5, h * 0.2, 0, h * 0.65); g.closePath(); g.fill();
    mountains(g, w, h, '#0b1226', h * 0.85, [[0.3, 0.72], [0.6, 0.8], [0.85, 0.7]]);
    g.fillStyle = '#d9dde8';
    g.beginPath(); g.arc(w * 0.5, h * 0.86, h * 0.08, Math.PI, 0); g.fill();
  },
  autumn(g, w, h) {
    base(g, w, h, PALETTE.sky, PALETTE.sky2);
    mountains(g, w, h, PALETTE.rock2, h * 0.6, [[0.3, 0.38], [0.7, 0.46]]);
    trees(g, w, h, 22, '#c2410c', h * 0.92, 5);
    trees(g, w, h, 14, PALETTE.ochre, h * 0.98, 9);
  },
  snow(g, w, h) {
    base(g, w, h, '#cfd8e3', PALETTE.snow);
    mountains(g, w, h, '#e4e9ef', h * 0.55, [[0.25, 0.3], [0.5, 0.42], [0.8, 0.28]]);
    mountains(g, w, h, PALETTE.snow, h * 0.8, [[0.4, 0.66], [0.75, 0.74]]);
    trees(g, w, h, 16, PALETTE.green, h * 0.95, 13);
    g.strokeStyle = '#9fb3c8'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(w * 0.15, h * 0.95); g.quadraticCurveTo(w * 0.5, h * 0.5, w * 0.9, h * 0.35); g.stroke();
  },
  observatory(g, w, h) {
    base(g, w, h, PALETTE.night, '#1d2a4d');
    g.fillStyle = '#fff';
    for (let i = 0; i < 60; i++) { const x = (i * 151 + 7) % w; const y = (i * 67 + 11) % (h * 0.6); g.beginPath(); g.arc(x, y, 1.5, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#c9ced9';
    g.fillRect(w * 0.4, h * 0.6, w * 0.2, h * 0.3);
    g.beginPath(); g.arc(w * 0.5, h * 0.6, w * 0.1, Math.PI, 0); g.fill();
    g.fillStyle = PALETTE.night; g.fillRect(w * 0.49, h * 0.5, w * 0.02, h * 0.1);
  }
};

export const ILLUSTRATION_KINDS = Object.keys(KINDS);

/* Renvoie un File WebP (ou PNG si le navigateur ne sait pas encoder le WebP) */
export async function drawIllustration(kind, { title = '', w = 960, h = 640, name } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d');
  (KINDS[kind] || KINDS.highland)(g, w, h);
  label(g, w, h, title);
  let blob = await new Promise(r => cv.toBlob(r, 'image/webp', 0.84));
  if (!blob || blob.type !== 'image/webp') blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  const ext = blob.type === 'image/webp' ? 'webp' : 'png';
  return new File([blob], `${name || kind}.${ext}`, { type: blob.type });
}

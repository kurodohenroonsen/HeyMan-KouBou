import { tokensCss, defaultTokens } from './tokens.js';
import { N_ } from './ui-i18n.js';

/* Polices proposées et feuille de style de base des sites produits (mobile d'abord). */

export const FONTS = {
  system: { label: N_('Système (aucun téléchargement)'), stack: 'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif' },
  georgia: { label: N_('Georgia (classique)'), stack: 'Georgia,"Times New Roman",serif' },
  archivo: { label: 'Archivo', google: 'Archivo:wght@400..900', stack: '"Archivo",system-ui,sans-serif' },
  'dm-sans': { label: 'DM Sans', google: 'DM+Sans:opsz,wght@9..40,400..800', stack: '"DM Sans",system-ui,sans-serif' },
  'public-sans': { label: 'Public Sans', google: 'Public+Sans:wght@400..800', stack: '"Public Sans",system-ui,sans-serif' },
  'source-serif': { label: 'Source Serif 4', google: 'Source+Serif+4:opsz,wght@8..60,400..700', stack: '"Source Serif 4",Georgia,serif' },
  fraunces: { label: 'Fraunces', google: 'Fraunces:opsz,wght@9..144,400..800', stack: '"Fraunces",Georgia,serif' },
  lora: { label: 'Lora', google: 'Lora:wght@400..700', stack: '"Lora",Georgia,serif' },
  oswald: { label: N_('Oswald (condensée)'), google: 'Oswald:wght@400..700', stack: '"Oswald","Arial Narrow",sans-serif' }
};

export function googleFontsHref(theme) {
  const fams = [...new Set([theme?.fonts?.heading, theme?.fonts?.body])].map(k => FONTS[k]?.google).filter(Boolean);
  return fams.length ? `https://fonts.googleapis.com/css2?${fams.map(f => `family=${f}`).join('&')}&display=swap` : '';
}

const HEX = /^#[0-9a-f]{6}$/i;
const num = (v, min, max, d) => (Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Number(v))) : d);

export function buildBaseCss(theme = {}, tokens = defaultTokens()) {
  const p = theme.palette || {};
  const c = k => (HEX.test(p[k] || '') ? p[k] : { c1: '#0f766e', c2: '#f59e0b', c3: '#16161a', c4: '#f7f7f4', c5: '#5f5f69', c6: '#ffffff' }[k]);
  const fh = (FONTS[theme.fonts?.heading] || FONTS.system).stack;
  const fb = (FONTS[theme.fonts?.body] || FONTS.system).stack;
  const base = num(theme.baseSize, 14, 22, 17);
  const radius = num(theme.radius, 0, 40, 10);
  const width = num(theme.contentWidth, 720, 1600, 1160);
  const extra = ['c7', 'c8', 'c9', 'c10', 'c11', 'c12'].filter(k => HEX.test(p[k] || '')).map(k => `--${k}:${p[k]};`).join('');
  return `:root{--c1:${c('c1')};--c2:${c('c2')};--c3:${c('c3')};--c4:${c('c4')};--c5:${c('c5')};--c6:${c('c6')};${extra}${tokensCss(tokens)};--font-h:${fh};--font-b:${fb};--base:${base}px;--radius:${radius}px;--content:${width}px;--gutter:clamp(16px,4vw,40px);--line:color-mix(in srgb,var(--c3) 14%,var(--c4))}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--c4);color:var(--c3);font:400 var(--step-base)/1.65 var(--font-b);overflow-x:clip}
img{max-width:100%;height:auto;display:block}
a{color:var(--c1)}
h1,h2,h3,h4{font-family:var(--font-h);line-height:1.12;margin:0;text-wrap:balance}
h1{font-size:var(--step-4xl);letter-spacing:-.02em}
h2{font-size:var(--step-3xl);letter-spacing:-.01em}
h3{font-size:var(--step-xl)}
h4{font-size:var(--step-lg)}
p{margin:0;text-wrap:pretty}
:focus-visible{outline:3px solid var(--c1);outline-offset:2px}
.skip{position:absolute;left:-999px;top:8px;background:var(--c3);color:var(--c4);padding:8px 12px;border-radius:6px;z-index:99}
.skip:focus{left:8px}
.site-header{background:var(--c4);border-bottom:1px solid var(--line);z-index:20}
.site-header--sticky{position:sticky;top:0}
.site-header__inner{max-width:var(--content);margin-inline:auto;padding:12px var(--gutter);display:flex;flex-wrap:wrap;align-items:center;gap:8px 24px}
.brand{display:inline-flex;align-items:center;gap:10px;margin-right:auto;color:var(--c3);text-decoration:none;font:800 1.15rem/1.1 var(--font-h)}
.brand img{height:40px;width:auto}
.menu,.langs{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:4px 18px}
.menu a{color:var(--c3);text-decoration:none;font-weight:600}
.menu a[aria-current="page"]{color:var(--c1);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:6px}
.langs{gap:4px}
.langs a{display:inline-block;min-width:38px;padding:4px 7px;text-align:center;border:1px solid var(--line);border-radius:6px;color:var(--c3);text-decoration:none;font-size:.78rem;font-weight:700}
.langs a[aria-current="true"]{background:var(--c3);color:var(--c4);border-color:var(--c3)}
@media (max-width:640px){.site-header--sticky{position:static}.site-nav{order:3;width:100%;overflow-x:auto}.menu{flex-wrap:nowrap}.menu a{white-space:nowrap}}
.sec{position:relative;padding-block:clamp(48px,5vw + 24px,104px);background-size:cover;background-position:center}
.sec__inner{max-width:var(--content);margin-inline:auto;padding-inline:var(--gutter)}
.sec__inner--wide{max-width:1440px}
.sec__inner--full{max-width:none;padding-inline:0}
.row{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:clamp(16px,2.5vw,32px);align-items:start}
.row + .row{margin-top:clamp(16px,2.5vw,32px)}
:where(.row) > :where(.col){grid-column:span 12}
.col{display:flex;flex-direction:column;gap:16px;min-width:0}
@media (max-width:1024px){.row--stack-tablet > .col:not(.col--ts){grid-column:span 12}}
@media (max-width:640px){.row--stack-tablet > .col:not(.col--ms),.row--stack-mobile > .col:not(.col--ms){grid-column:span 12}}
.w{min-width:0}
.heading a{color:inherit;text-decoration:none}
.rich > * + *{margin-top:1em}
.rich ul,.rich ol{padding-left:1.3em;margin:0}
.rich li + li,.rich li > ul,.rich li > ol{margin-top:.3em}
.rich h2{font-size:var(--step-xl)}.rich h3{font-size:var(--step-lg)}
.rich blockquote{margin:0;padding:.3em 0 .3em 1em;border-left:4px solid var(--c2);color:var(--c5);font-style:italic}
.rich sup,.rich sub{font-size:.75em;line-height:0}
.figure{margin:0}
.figure img{width:100%;border-radius:var(--radius);object-fit:cover}
.figure figcaption{margin-top:8px;color:var(--c5);font-size:.92em}
.img-empty{min-height:160px;aspect-ratio:16/9;border:2px dashed var(--line);border-radius:var(--radius);display:grid;place-items:center;color:var(--c5);font-size:.9rem;text-align:center;padding:12px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:var(--radius);border:2px solid transparent;font-weight:700;text-decoration:none;line-height:1.2;transition:filter .15s,transform .15s,background-color .15s,color .15s}
.btn--sm{min-height:38px;padding:8px 14px;font-size:.9rem}
.btn--md{min-height:48px;padding:11px 20px}
.btn--lg{min-height:58px;padding:14px 28px;font-size:1.1rem}
.btn--primary{background:var(--c1);color:var(--c6)}
.btn--secondary{background:var(--c2);color:var(--c3)}
.btn--outline{border-color:currentColor;color:var(--c1);background:transparent}
.btn--link{padding-inline:0;color:var(--c1);text-decoration:underline;text-underline-offset:4px;min-height:0}
.btn:hover{filter:brightness(1.07)}
.divider{border:0;margin:0}
.nav-burger{display:none;align-items:center;gap:6px;min-height:44px;padding:6px 12px;border:1px solid var(--line);border-radius:var(--radius);background:var(--c6);color:var(--c3);font:inherit;font-weight:700;cursor:pointer}
.site-nav{position:relative}
.nav--center .menu{justify-content:center}.nav--end .menu{justify-content:flex-end}
.nav--vertical .menu{flex-direction:column;gap:8px}
.has-sub{position:relative}
.submenu{list-style:none;margin:0;padding:8px;display:none;position:absolute;top:100%;left:-8px;min-width:200px;background:var(--c6);border:1px solid var(--line);border-radius:var(--radius);box-shadow:0 12px 30px -12px rgb(0 0 0/.25);z-index:30}
.submenu li + li{margin-top:4px}
.has-sub:hover > .submenu,.has-sub:focus-within > .submenu{display:block}
.has-sub > a::after{content:" ▾";font-size:.8em}
.site-header--custom{background:var(--c4);border-bottom:1px solid var(--line);z-index:20}
.site-header--custom .sec{padding-block:12px}
.site-header--custom .brand{margin-right:0}
.w-lang-switch .langs{justify-content:flex-end}
.site-footer--custom{padding:0;font-size:inherit}
.site-footer--custom .nav--vertical .menu a{font-weight:500}
@media (max-width:640px){
html.js .nav-burger{display:inline-flex}
html.js .site-nav .menu{display:none}
.site-header,.site-header--custom{position:relative}
html.js .site-nav{position:static}
html.js .site-header__inner > .site-nav{order:1;width:auto;margin-left:auto}
html.js .site-header__inner > .langs{order:2;width:100%}
html.js .site-header__inner > .brand{max-width:calc(100% - 120px)}
html.js .site-nav.is-open .menu{display:flex;flex-direction:column;flex-wrap:nowrap;gap:2px;position:absolute;left:var(--gutter);right:var(--gutter);top:calc(100% - 4px);padding:10px;background:var(--c6);border:1px solid var(--line);border-radius:var(--radius);box-shadow:0 18px 40px -16px rgb(0 0 0/.35);z-index:40;overflow:visible}
html.js .site-nav.is-open .menu a{display:block;padding:10px 8px;white-space:normal}
.submenu{display:block;position:static;box-shadow:none;border:0;padding:0 0 0 14px;min-width:0;background:none}
.has-sub > a::after{content:none}
.site-header--custom .site-nav{display:flex;justify-content:flex-end}
.site-header--custom .row{row-gap:8px}
.site-header--custom .w-lang-switch .langs,.hdr-langs .langs{justify-content:flex-start}
}
.nav-burger{white-space:nowrap}
[popover].popup{border:0;padding:0;width:min(720px,92vw);max-height:88vh;overflow:auto;border-radius:calc(var(--radius) + 4px);background:var(--c4);color:var(--c3);box-shadow:0 30px 80px -20px rgb(0 0 0/.55)}
[popover].popup::backdrop{background:rgb(0 0 0/.5)}
.popup .sec{padding-block:clamp(28px,4vw,48px)}
.popup__close{position:sticky;top:8px;float:right;margin:8px 8px 0 0;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--c6);color:var(--c3);font-size:22px;line-height:1;cursor:pointer;z-index:2}
.site-footer{border-top:1px solid var(--line);padding-block:32px;color:var(--c5);font-size:.92rem}
.site-footer__inner{max-width:var(--content);margin-inline:auto;padding-inline:var(--gutter)}
@keyframes atelier-fade{from{opacity:0}to{opacity:1}}
@keyframes atelier-up{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
@keyframes atelier-zoom{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}
${theme.pageTransitions === false ? '' : '@media (prefers-reduced-motion: no-preference){@view-transition{navigation:auto}}'}
.footer-links{display:flex;flex-wrap:wrap;gap:4px 18px;margin-top:10px}
.footer-links a{color:inherit}
.site-footer--custom .footer-links{max-width:var(--content);margin:0 auto;padding:0 var(--gutter) 24px;color:var(--c5);font-size:.92rem}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;
}

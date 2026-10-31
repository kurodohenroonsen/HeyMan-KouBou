/*
 * Widgets complémentaires : listes à icônes, encadrés, citation, chiffres clés, FAQ, galerie,
 * vidéo et carte (façades : rien n'est chargé chez un tiers avant le clic), réseaux sociaux,
 * formulaire de contact, carte de contenu, tarif.
 * Chaque widget apporte sa CSS ; ceux qui ont besoin de JavaScript sur le site publié déclarent `script`.
 */
import { register, L5 } from './widgets.js';
import { iconSvg } from './icons.js';
import { __, __c, N_ } from './ui-i18n.js';

/*
 * Libellés de l'éditeur (widgets, réglages, choix) : __(), langue de l'interface.
 * Textes publiés sur le site (boutons, libellés accessibles, messages du formulaire…) : SITE_TEXT,
 * dans la langue de la page affichée — jamais celle de l'éditeur. Valeurs par défaut du contenu : L5(fr, nl, de, en, ja),
 * posées sous la langue principale du site à l'insertion (cycle 28).
 */
export const SITE_TEXT = {
  skip: { fr: 'Aller au contenu', nl: 'Naar de inhoud', de: 'Zum Inhalt', en: 'Skip to content', ja: '本文へ移動' },
  menu: { fr: 'Menu', nl: 'Menu', de: 'Menü', en: 'Menu', ja: 'メニュー' },
  info: { fr: 'Informations', nl: 'Informatie', de: 'Informationen', en: 'Information', ja: 'サイト情報' },
  close: { fr: 'Fermer', nl: 'Sluiten', de: 'Schließen', en: 'Close', ja: '閉じる' },
  home: { fr: 'Accueil', nl: 'Home', de: 'Startseite', en: 'Home', ja: 'ホーム' },
  video: { fr: 'Vidéo', nl: 'Video', de: 'Video', en: 'Video', ja: '動画' },
  playVideo: { fr: 'Lire la vidéo : {title}', nl: 'Video afspelen: {title}', de: 'Video abspielen: {title}', en: 'Play video: {title}', ja: '動画を再生：{title}' },
  videoNote: { fr: 'La vidéo se charge depuis {provider} quand vous cliquez.', nl: 'De video wordt pas van {provider} geladen als u klikt.', de: 'Das Video wird erst beim Klicken von {provider} geladen.', en: 'The video loads from {provider} when you click.', ja: 'クリックすると {provider} から動画を読み込みます。' },
  showMap: { fr: 'Afficher la carte : {address}', nl: 'Kaart tonen: {address}', de: 'Karte anzeigen: {address}', en: 'Show map: {address}', ja: '地図を表示：{address}' },
  showMapGoogle: { fr: 'Afficher la carte (Google Maps)', nl: 'Kaart tonen (Google Maps)', de: 'Karte anzeigen (Google Maps)', en: 'Show map (Google Maps)', ja: '地図を表示（Google マップ）' },
  zoom: { fr: 'Agrandir', nl: 'Vergroten', de: 'Vergrößern', en: 'Enlarge', ja: '拡大' },
  email: { fr: 'E-mail', nl: 'E-mail', de: 'E-Mail', en: 'Email', ja: 'メール' },
  website: { fr: 'Site web', nl: 'Website', de: 'Website', en: 'Website', ja: 'ウェブサイト' },
  link: { fr: 'Lien', nl: 'Link', de: 'Link', en: 'Link', ja: 'リンク' },
  field: { fr: 'Champ {n}', nl: 'Veld {n}', de: 'Feld {n}', en: 'Field {n}', ja: '項目 {n}' },
  send: { fr: 'Envoyer', nl: 'Verzenden', de: 'Senden', en: 'Send', ja: '送信' },
  sent: { fr: 'Merci, votre message a été envoyé.', nl: 'Bedankt, uw bericht is verzonden.', de: 'Danke, Ihre Nachricht wurde gesendet.', en: 'Thank you, your message has been sent.', ja: 'ありがとうございます。メッセージを送信しました。' },
  mailOpen: { fr: 'Votre logiciel de courriel s’ouvre.', nl: 'Uw e-mailprogramma wordt geopend.', de: 'Ihr E-Mail-Programm wird geöffnet.', en: 'Your email app is opening.', ja: 'メールアプリが開きます。' },
  failed: { fr: 'L’envoi a échoué. Réessayez plus tard.', nl: 'Verzenden mislukt. Probeer later opnieuw.', de: 'Senden fehlgeschlagen. Bitte später erneut versuchen.', en: 'Sending failed. Please try again later.', ja: '送信できませんでした。しばらくしてからもう一度お試しください。' },
  notFound: { fr: 'Page introuvable', nl: 'Pagina niet gevonden', de: 'Seite nicht gefunden', en: 'Page not found', ja: 'ページが見つかりません' },
  notFoundText: { fr: 'Cette page n’existe pas ou a été déplacée. Vérifiez l’adresse, ou repartez de l’accueil.', nl: 'Deze pagina bestaat niet of is verplaatst. Controleer het adres of ga terug naar de homepagina.', de: 'Diese Seite existiert nicht oder wurde verschoben. Prüfen Sie die Adresse oder beginnen Sie auf der Startseite.', en: 'This page does not exist or has moved. Check the address, or start again from the home page.', ja: 'このページは存在しないか、移動しました。アドレスをご確認いただくか、ホームからやり直してください。' },
  consent: { fr: 'J’accepte que ces données soient utilisées pour répondre à ma demande (voir {link}).', nl: 'Ik ga ermee akkoord dat deze gegevens worden gebruikt om mijn vraag te beantwoorden (zie {link}).', de: 'Ich bin einverstanden, dass diese Daten zur Beantwortung meiner Anfrage verwendet werden (siehe {link}).', en: 'I agree that this information is used to answer my request (see {link}).', ja: 'この情報が問い合わせへの回答のために使われることに同意します（{link}を参照）。' },
  privacy: { fr: 'la page Vie privée', nl: 'de privacypagina', de: 'die Datenschutzseite', en: 'the privacy page', ja: 'プライバシーポリシー' },
  consentMissing: { fr: 'Cochez la case de consentement pour envoyer le message.', nl: 'Vink het toestemmingsvakje aan om het bericht te verzenden.', de: 'Bitte stimmen Sie zu, um die Nachricht zu senden.', en: 'Tick the consent box to send the message.', ja: '送信するには同意のチェックボックスをオンにしてください。' }
};
/* Texte publié dans la langue de la page (français pour une langue inconnue) */
export function siteText(key, lang, params) {
  const d = SITE_TEXT[key] || {};
  const s = d[lang] ?? d.fr ?? '';
  return params ? s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined && params[k] !== null ? String(params[k]) : m)) : s;
}

const empty = () => L5('');
const opt = (value, label) => ({ value, label });
const pick = (v, allowed, dflt) => (allowed.includes(v) ? v : dflt);

/* ---------- Vidéo : analyse d'adresse stricte ---------- */
export function parseVideo(url) {
  let u;
  try { u = new URL(String(url || '')); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.replace(/^www\.|^m\./, '');
  const ok = id => (/^[A-Za-z0-9_-]{6,20}$/.test(id || '') ? id : null);
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = u.pathname === '/watch' ? u.searchParams.get('v') : (u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/) || [])[1];
    return ok(id) ? { provider: 'youtube', id } : null;
  }
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    return ok(id) ? { provider: 'youtube', id } : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = (u.pathname.match(/(\d{5,12})/) || [])[1];
    return id ? { provider: 'vimeo', id } : null;
  }
  return null;
}

export function videoEmbedUrl(v) {
  if (!v) return '';
  return v.provider === 'youtube' ? `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1` : `https://player.vimeo.com/video/${v.id}?autoplay=1&dnt=1`;
}

/* ---------- Liste à icônes ---------- */
register('icon-list', {
  label: __('Liste à icônes'), icon: '☑', category: __('Texte'),
  fields: [
    { key: 'items', type: 'list', label: __('Éléments'), itemLabel: __('Élément'), fields: [
      { key: 'icon', type: 'icon', label: __('Icône') },
      { key: 'text', type: 'inline', i18n: true, label: __('Texte') }
    ], newItem: () => ({ icon: 'check', text: L5('Nouvel élément', 'Nieuw item', 'Neuer Eintrag', 'New item', '新しい項目') }) },
    { key: 'size', type: 'select', label: __('Taille des icônes'), options: [opt('18', __('Petite')), opt('22', __('Moyenne')), opt('28', __('Grande'))] }
  ],
  defaults: () => ({ size: '22', items: [
    { icon: 'check', text: L5('Premier point important', 'Eerste belangrijk punt', 'Erster wichtiger Punkt', 'First key point', '大切なポイント その1') },
    { icon: 'check', text: L5('Deuxième point', 'Tweede punt', 'Zweiter Punkt', 'Second point', 'ポイント その2') },
    { icon: 'check', text: L5('Troisième point', 'Derde punt', 'Dritter Punkt', 'Third point', 'ポイント その3') }
  ] }),
  css: `.icon-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.icon-list li{display:flex;gap:10px;align-items:flex-start}
.icon-list .icon{flex:none;color:var(--c1);margin-top:.15em}`,
  render(p, c) {
    const size = Number(pick(p.size, ['18', '22', '28'], '22'));
    return `<ul class="icon-list">${(p.items || []).map((it, i) => `<li>${iconSvg(it.icon, size)}<span data-edit="items.${i}.text">${c.inline(c.t(it.text))}</span></li>`).join('')}</ul>`;
  }
});

/* ---------- Encadré avec icône ---------- */
register('icon-box', {
  label: __('Encadré icône'), icon: '✦', category: __('Contenu'),
  styleTarget: '.ibox',
  fields: [
    { key: 'icon', type: 'icon', label: __('Icône') },
    { key: 'title', type: 'inline', i18n: true, label: __('Titre') },
    { key: 'text', type: 'richtext', i18n: true, label: __('Texte') },
    { key: 'layout', type: 'select', label: __('Disposition'), options: [opt('top', __('Icône au-dessus')), opt('left', __('Icône à gauche')), opt('center', __('Centré'))] },
    { key: 'link', type: 'url', label: __('Lien (facultatif)') }
  ],
  defaults: () => ({ icon: 'bolt', title: L5('Un avantage clair', 'Een duidelijk voordeel', 'Ein klarer Vorteil', 'A clear benefit', 'わかりやすい利点'),
    text: L5('<p>Expliquez en une ou deux phrases ce que cela change concrètement.</p>', '<p>Leg in een of twee zinnen uit wat het concreet verandert.</p>', '<p>Erklären Sie in ein, zwei Sätzen, was sich konkret ändert.</p>', '<p>Explain in one or two sentences what difference it makes.</p>', '<p>何がどう変わるのかを、1〜2文で具体的に説明しましょう。</p>'), layout: 'top', link: '' }),
  css: `.ibox{display:grid;gap:10px}
.ibox__icon{width:48px;height:48px;border-radius:calc(var(--radius) + 2px);display:grid;place-items:center;background:color-mix(in srgb,var(--c1) 12%,transparent);color:var(--c1)}
.ibox--left{grid-template-columns:auto 1fr;column-gap:16px}.ibox--left .ibox__icon{grid-row:span 2}
.ibox--center{justify-items:center;text-align:center}
.ibox__title{font-size:1.2rem}.ibox__title a{color:inherit;text-decoration:none}`,
  render(p, c) {
    const layout = pick(p.layout, ['top', 'left', 'center'], 'top');
    const link = c.url(p.link);
    const title = c.inline(c.t(p.title));
    return `<div class="ibox ibox--${layout}"><div class="ibox__icon">${iconSvg(p.icon, 24)}</div><div class="ibox__body"><h3 class="ibox__title" data-edit="title">${link ? `<a href="${c.attr(link)}">${title}</a>` : title}</h3><div class="rich" data-edit="text">${c.rich(c.t(p.text))}</div></div></div>`;
  }
});

/* ---------- Citation / témoignage ---------- */
register('quote', {
  label: __('Citation'), icon: '❝', category: __('Contenu'),
  styleTarget: '.quote',
  fields: [
    { key: 'text', type: 'richtext', i18n: true, label: __('Citation') },
    { key: 'author', type: 'text', label: __('Auteur') },
    { key: 'role', type: 'text', i18n: true, label: __('Fonction ou média') },
    { key: 'photo', type: 'image', label: __('Photo (facultatif)') },
    { key: 'variant', type: 'select', label: __('Apparence'), options: [opt('line', __('Trait')), opt('card', __c('card', 'Carte')), opt('big', __('Grande citation'))] }
  ],
  defaults: () => ({ text: L5('<p>Un accueil chaleureux et des conseils précieux : nous reviendrons !</p>', '<p>Een warm onthaal en waardevol advies: we komen zeker terug!</p>', '<p>Ein herzlicher Empfang und wertvolle Tipps: Wir kommen wieder!</p>', '<p>A warm welcome and great advice: we will be back!</p>', '<p>温かく迎えていただき、アドバイスもとても役立ちました。また来ます！</p>'),
    author: 'Prénom Nom', role: L5('Client ou membre', 'Klant of lid', 'Kunde oder Mitglied', 'Customer or member', 'お客さま・会員'), photo: '', variant: 'line' }),
  css: `.quote{margin:0;display:grid;gap:14px}
.quote blockquote{margin:0;font-size:1.15rem}
.quote--line blockquote{border-left:4px solid var(--c1);padding-left:18px}
.quote--card{background:var(--c6);border:1px solid var(--line);border-radius:var(--radius);padding:24px}
.quote--big blockquote{font:600 clamp(1.3rem,1rem + 1.2vw,1.9rem)/1.35 var(--font-h)}
.quote--big blockquote::before{content:"“";display:block;font-size:3em;line-height:.6;color:var(--c1)}
.quote figcaption{display:flex;gap:12px;align-items:center;color:var(--c5);font-size:.95rem}
.quote figcaption img{width:44px;height:44px;border-radius:50%;object-fit:cover}
.quote cite{font-style:normal;font-weight:700;color:var(--c3);display:block}`,
  render(p, c) {
    const variant = pick(p.variant, ['line', 'card', 'big'], 'line');
    const photo = c.img(p.photo);
    const role = c.t(p.role);
    return `<figure class="quote quote--${variant}"><blockquote class="rich" data-edit="text">${c.rich(c.t(p.text))}</blockquote><figcaption>${photo ? `<img src="${c.attr(photo)}" alt="" loading="lazy">` : ''}<span><cite data-edit="author">${c.esc(p.author || '')}</cite>${role ? c.esc(role) : ''}</span></figcaption></figure>`;
  }
});

/* ---------- Chiffres clés ---------- */
register('stats', {
  label: __('Chiffres clés'), icon: '#', category: __('Contenu'),
  fields: [
    { key: 'items', type: 'list', label: __('Chiffres'), itemLabel: __('Chiffre'), fields: [
      { key: 'value', type: 'text', label: __('Valeur (ex. 120, 35 %, 2 k€)') },
      { key: 'label', type: 'text', i18n: true, label: __('Légende') }
    ], newItem: () => ({ value: '10', label: L5('Nouvelle légende', 'Nieuw onderschrift', 'Neue Beschriftung', 'New caption', '新しい説明') }) },
    { key: 'align', type: 'select', label: __('Alignement'), options: [opt('center', __('Centré')), opt('left', __('À gauche'))] }
  ],
  defaults: () => ({ align: 'center', items: [
    { value: '12', label: L5('années d’expérience', 'jaar ervaring', 'Jahre Erfahrung', 'years of experience', '年の実績') },
    { value: '250', label: L5('personnes accueillies', 'bezoekers ontvangen', 'Gäste empfangen', 'people welcomed', '人の来訪者') },
    { value: '100 %', label: L5('local et indépendant', 'lokaal en onafhankelijk', 'lokal und unabhängig', 'local and independent', '地元密着・独立運営') }
  ] }),
  css: `.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(140px,100%),1fr));gap:24px}
.stats--center{text-align:center}
.stats__value{display:block;font:800 clamp(2rem,1.4rem + 2vw,3rem)/1 var(--font-h);color:var(--c1)}
.stats__label{display:block;margin-top:6px;color:var(--c5)}`,
  render(p, c) {
    const align = pick(p.align, ['center', 'left'], 'center');
    return `<div class="stats stats--${align}">${(p.items || []).map((it, i) => `<div class="stats__item"><strong class="stats__value" data-edit="items.${i}.value">${c.esc(it.value || '')}</strong><span class="stats__label" data-edit="items.${i}.label">${c.esc(c.t(it.label))}</span></div>`).join('')}</div>`;
  }
});

/* ---------- Accordéon / FAQ ---------- */
register('accordion', {
  label: __('Accordéon (FAQ)'), icon: '☰', category: __('Interaction'),
  fields: [
    { key: 'items', type: 'list', label: __('Questions'), itemLabel: __('Question'), fields: [
      { key: 'title', type: 'inline', i18n: true, label: __('Question') },
      { key: 'content', type: 'richtext', i18n: true, label: __('Réponse') }
    ], newItem: () => ({ title: L5('Nouvelle question ?', 'Nieuwe vraag?', 'Neue Frage?', 'New question?', '新しい質問は？'), content: L5('<p>Réponse.</p>', '<p>Antwoord.</p>', '<p>Antwort.</p>', '<p>Answer.</p>', '<p>回答。</p>') }) },
    { key: 'firstOpen', type: 'toggle', label: __('Première réponse ouverte') },
    { key: 'faqSchema', type: 'toggle', label: __('Signaler à Google comme FAQ (données structurées)') }
  ],
  defaults: () => ({ firstOpen: true, faqSchema: false, items: [
    { title: L5('Comment vous contacter ?', 'Hoe kan ik u bereiken?', 'Wie erreiche ich Sie?', 'How can I contact you?', 'お問い合わせ方法は？'),
      content: L5('<p>Par le formulaire de contact, par téléphone ou en passant nous voir.</p>', '<p>Via het contactformulier, telefonisch of door langs te komen.</p>', '<p>Über das Kontaktformular, telefonisch oder bei einem Besuch.</p>', '<p>Through the contact form, by phone or by dropping in.</p>', '<p>お問い合わせフォーム、お電話、またはご来訪でどうぞ。</p>') },
    { title: L5('Quels sont vos horaires ?', 'Wat zijn uw openingsuren?', 'Wann haben Sie geöffnet?', 'What are your opening hours?', '営業時間は？'),
      content: L5('<p>Indiquez ici vos jours et heures d’ouverture.</p>', '<p>Vermeld hier uw openingsdagen en -uren.</p>', '<p>Geben Sie hier Ihre Öffnungstage und -zeiten an.</p>', '<p>Give your opening days and hours here.</p>', '<p>営業日と営業時間をここに書きます。</p>') }
  ] }),
  css: `.acc{display:grid;gap:8px}
.acc details{border:1px solid var(--line);border-radius:var(--radius);background:var(--c6)}
.acc summary{cursor:pointer;list-style:none;padding:14px 18px;font-weight:700;display:flex;justify-content:space-between;gap:12px}
.acc summary::-webkit-details-marker{display:none}
.acc summary::after{content:"+";font-size:1.3em;line-height:1;color:var(--c1);transition:transform .2s}
.acc details[open] summary::after{transform:rotate(45deg)}
.acc .rich{padding:0 18px 16px}`,
  render(p, c) {
    const items = p.items || [];
    const html = `<div class="acc">${items.map((it, i) => `<details${p.firstOpen && i === 0 ? ' open' : ''}><summary><span data-edit="items.${i}.title">${c.inline(c.t(it.title))}</span></summary><div class="rich" data-edit="items.${i}.content">${c.rich(c.t(it.content))}</div></details>`).join('')}</div>`;
    if (!p.faqSchema || c.canvas || !items.length) return html;
    const data = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(it => ({ '@type': 'Question', name: c.text(c.t(it.title)), acceptedAnswer: { '@type': 'Answer', text: c.text(c.t(it.content)) } })) };
    return `${html}<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
  }
});

/* ---------- Galerie ---------- */
register('gallery', {
  label: __('Galerie'), icon: '▦', category: __('Média'),
  fields: [
    { key: 'items', type: 'list', label: __('Images'), itemLabel: __('Image'), fields: [
      { key: 'src', type: 'image', label: __('Image') },
      { key: 'alt', type: 'text', i18n: true, label: __('Description') },
      { key: 'caption', type: 'text', i18n: true, label: __('Légende') }
    ], newItem: () => ({ src: '', alt: empty(), caption: empty() }) },
    { key: 'columns', type: 'select', label: __('Colonnes (ordinateur)'), options: [opt('2', '2'), opt('3', '3'), opt('4', '4')] },
    { key: 'ratio', type: 'select', label: __('Format'), options: [opt('1/1', __('Carré')), opt('4/3', '4:3'), opt('16/9', '16:9'), opt('auto', __('Original'))] },
    { key: 'zoom', type: 'toggle', label: __('Agrandir au clic') }
  ],
  defaults: () => ({ columns: '3', ratio: '4/3', zoom: true, items: [0, 1, 2].map(() => ({ src: '', alt: empty(), caption: empty() })) }),
  css: `.gal{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:12px}
@media (max-width:640px){.gal{grid-template-columns:repeat(2,minmax(0,1fr))}}
.gal figure{margin:0}
.gal img,.gal .img-empty{width:100%;border-radius:var(--radius);object-fit:cover;min-height:0}
.gal figcaption{margin-top:6px;font-size:.88em;color:var(--c5)}
.gal a{display:block}
.lb{position:fixed;inset:0;z-index:999;background:rgb(0 0 0/.88);display:grid;place-items:center;padding:24px;cursor:zoom-out}
.lb img{max-height:90vh;width:auto;border-radius:6px}`,
  script: `(function(){document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('.gal[data-zoom] a');if(!a)return;e.preventDefault();var d=document.createElement('div');d.className='lb';d.setAttribute('role','dialog');d.setAttribute('aria-label',a.getAttribute('aria-label')||'');var i=document.createElement('img');i.src=a.getAttribute('href');i.alt=a.querySelector('img')?a.querySelector('img').alt:'';d.appendChild(i);var close=function(){d.remove();document.removeEventListener('keydown',k);a.focus();};var k=function(ev){if(ev.key==='Escape')close();};d.addEventListener('click',close);document.addEventListener('keydown',k);document.body.appendChild(d);if(window.__aLog)window.__aLog('site.gallery','Image agrandie',{src:a.getAttribute('href').slice(0,80)});});})();`,
  render(p, c) {
    const cols = pick(p.columns, ['2', '3', '4'], '3');
    const ratio = pick(p.ratio, ['1/1', '4/3', '16/9', 'auto'], '4/3');
    const style = ratio === 'auto' ? '' : ` style="aspect-ratio:${ratio}"`;
    const figs = (p.items || []).map(it => {
      const src = c.img(it.src);
      const choose = __('Image à choisir');
      if (!src) return c.canvas ? `<figure><div class="img-empty"${style}>${c.esc(choose)}</div></figure>` : '';
      const alt = c.t(it.alt);
      const img = `<img src="${c.attr(src)}" alt="${c.attr(alt)}" loading="lazy"${style}>`;
      const cap = c.t(it.caption);
      return `<figure>${p.zoom ? `<a href="${c.attr(src)}" aria-label="${c.attr(alt || siteText('zoom', c.lang))}">${img}</a>` : img}${cap ? `<figcaption>${c.esc(cap)}</figcaption>` : ''}</figure>`;
    }).join('');
    return `<div class="gal" style="--cols:${cols}"${p.zoom ? ' data-zoom' : ''}>${figs}</div>`;
  }
});

/* ---------- Vidéo (façade respectueuse de la vie privée) ---------- */
const FACADE_SCRIPT = `(function(){document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-video],[data-map]');if(!b)return;e.preventDefault();var f=document.createElement('iframe');f.src=b.getAttribute('data-video')||b.getAttribute('data-map');f.title=b.getAttribute('aria-label')||'';f.loading='lazy';f.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';f.allowFullscreen=true;f.referrerPolicy='strict-origin-when-cross-origin';f.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0';b.replaceWith(f);if(window.__aLog)window.__aLog('site.facade','Contenu externe chargé après clic',{src:String(f.src).replace(/[?#].*$/,'').slice(0,80)});});})();`;

register('video', {
  label: __('Vidéo'), icon: '▶', category: __('Média'),
  fields: [
    { key: 'url', type: 'url', label: __('Adresse YouTube ou Vimeo') },
    { key: 'title', type: 'text', i18n: true, label: __('Titre (lu par les lecteurs d’écran)') },
    { key: 'poster', type: 'image', label: __('Image d’aperçu (facultatif)') },
    { key: 'ratio', type: 'select', label: __('Format'), options: [opt('16/9', '16:9'), opt('4/3', '4:3'), opt('1/1', __('Carré')), opt('9/16', __('Vertical 9:16'))] }
  ],
  defaults: () => ({ url: '', title: L5('Vidéo', 'Video', 'Video', 'Video', '動画'), poster: '', ratio: '16/9' }),
  css: `.vid{position:relative;width:100%;border-radius:var(--radius);overflow:hidden;background:var(--c3)}
.vid__play{all:unset;box-sizing:border-box;position:absolute;inset:0;cursor:pointer;display:grid;place-items:center;align-content:center;gap:10px;color:#fff;text-align:center;padding:16px;background:linear-gradient(rgb(0 0 0/.15),rgb(0 0 0/.45)) center/cover}
.vid__play:focus-visible{outline:3px solid var(--c2);outline-offset:-3px}
.vid__btn{width:68px;height:48px;border-radius:14px;background:var(--c1);display:grid;place-items:center}
.vid__btn::before{content:"";border-style:solid;border-width:10px 0 10px 17px;border-color:transparent transparent transparent #fff;margin-left:4px}
.vid__note{font-size:.78rem;opacity:.85;max-width:36ch}
.vid--9-16{max-width:360px;margin-inline:auto}`,
  script: FACADE_SCRIPT,
  render(p, c) {
    const ratio = pick(p.ratio, ['16/9', '4/3', '1/1', '9/16'], '16/9');
    const v = parseVideo(p.url);
    const title = c.t(p.title) || siteText('video', c.lang);
    const poster = c.img(p.poster);
    const bg = poster ? ` style="background-image:linear-gradient(rgb(0 0 0/.1),rgb(0 0 0/.45)),url('${c.attr(poster)}')"` : '';
    const pasteUrl = __('Collez une adresse YouTube ou Vimeo dans l’inspecteur');
    const inner = v
      ? `<button type="button" class="vid__play" data-video="${c.attr(videoEmbedUrl(v))}" aria-label="${c.attr(siteText('playVideo', c.lang, { title }))}"${bg}><span class="vid__btn" aria-hidden="true"></span><span>${c.esc(title)}</span><span class="vid__note">${c.esc(siteText('videoNote', c.lang, { provider: v.provider === 'youtube' ? 'YouTube' : 'Vimeo' }))}</span></button>`
      : `<div class="vid__play"${bg}><span class="vid__btn" aria-hidden="true"></span><span>${c.canvas ? c.esc(pasteUrl) : c.esc(title)}</span></div>`;
    return `<div class="vid vid--${ratio.replace('/', '-')}" style="aspect-ratio:${ratio}">${inner}</div>`;
  }
});

/* ---------- Carte (façade) ---------- */
register('map', {
  label: __('Carte géographique'), icon: '⌖', category: __('Contact'),
  fields: [
    { key: 'address', type: 'text', label: __('Adresse') },
    { key: 'zoom', type: 'number', label: __('Zoom (3 à 20)'), min: 3, max: 20 },
    { key: 'height', type: 'select', label: __('Hauteur'), options: [opt('240', '240 px'), opt('320', '320 px'), opt('400', '400 px'), opt('480', '480 px')] }
  ],
  defaults: () => ({ address: 'Rue de la Loi 16, 1000 Bruxelles', zoom: 15, height: '320' }),
  css: `.map{position:relative;border-radius:var(--radius);overflow:hidden;background:color-mix(in srgb,var(--c1) 10%,var(--c4));border:1px solid var(--line)}
.map__open{all:unset;box-sizing:border-box;position:absolute;inset:0;cursor:pointer;display:grid;place-items:center;align-content:center;gap:8px;text-align:center;padding:16px;color:var(--c3)}
.map__open .icon{color:var(--c1)}
.map__open:focus-visible{outline:3px solid var(--c1);outline-offset:-3px}
.map__links{position:absolute;right:8px;bottom:8px;font-size:.8rem}
.map__links a{background:var(--c6);padding:3px 8px;border-radius:6px}`,
  script: FACADE_SCRIPT,
  render(p, c) {
    const h = pick(String(p.height), ['240', '320', '400', '480'], '320');
    const addr = String(p.address || '').trim();
    const zoom = Math.max(3, Math.min(20, Math.round(Number(p.zoom) || 15)));
    const q = encodeURIComponent(addr);
    const embed = `https://maps.google.com/maps?q=${q}&z=${zoom}&output=embed`;
    const osm = `https://www.openstreetmap.org/search?query=${q}`;
    const needAddr = __('Indiquez une adresse dans l’inspecteur');
    return `<div class="map" style="height:${h}px">${addr ? `<button type="button" class="map__open" data-map="${c.attr(embed)}" aria-label="${c.attr(siteText('showMap', c.lang, { address: addr }))}">${iconSvg('pin', 32)}<strong>${c.esc(addr)}</strong><span>${c.esc(siteText('showMapGoogle', c.lang))}</span></button><span class="map__links"><a href="${c.attr(osm)}" target="_blank" rel="noopener">OpenStreetMap</a></span>` : `<div class="map__open">${c.canvas ? c.esc(needAddr) : ''}</div>`}</div>`;
  }
});

/* ---------- Réseaux sociaux ---------- */
const NETWORKS = { facebook: 'Facebook', instagram: 'Instagram', x: 'X', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok', mastodon: 'Mastodon', bluesky: 'Bluesky', email: N_('E-mail'), website: N_('Site web') };
/* Nom d'un réseau : marques telles quelles ; « E-mail » et « Site web » dans la langue de l'éditeur (choix) ou de la page (site) */
const networkName = (k, lang) => (k === 'email' || k === 'website' ? (lang ? siteText(k, lang) : __(NETWORKS[k])) : NETWORKS[k]);
register('social', {
  label: __('Réseaux sociaux'), icon: '@', category: __('Contact'),
  fields: [
    { key: 'items', type: 'list', label: __('Liens'), itemLabel: __('Lien'), fields: [
      { key: 'network', type: 'select', label: __('Réseau'), options: Object.keys(NETWORKS).map(k => opt(k, networkName(k))) },
      { key: 'url', type: 'url', label: __c('url', 'Adresse') }
    ], newItem: () => ({ network: 'website', url: 'https://' }) },
    { key: 'variant', type: 'select', label: __('Apparence'), options: [opt('pill', __('Pastilles')), opt('text', __('Liens texte'))] },
    { key: 'align', type: 'select', label: __('Alignement'), options: [opt('start', __('Gauche')), opt('center', __('Centre')), opt('end', __('Droite'))] }
  ],
  defaults: () => ({ variant: 'pill', align: 'start', items: [{ network: 'facebook', url: 'https://www.facebook.com/' }, { network: 'instagram', url: 'https://www.instagram.com/' }, { network: 'mastodon', url: 'https://mastodon.social/' }] }),
  css: `.social{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.social--center{justify-content:center}.social--end{justify-content:flex-end}
.social--pill a{display:inline-flex;align-items:center;min-height:40px;padding:6px 14px;border-radius:999px;border:1px solid var(--line);background:var(--c6);color:var(--c3);font-weight:600;text-decoration:none}
.social--pill a:hover{border-color:var(--c1);color:var(--c1)}`,
  render(p, c) {
    const variant = pick(p.variant, ['pill', 'text'], 'pill');
    const align = pick(p.align, ['start', 'center', 'end'], 'start');
    const items = (p.items || []).map(it => {
      const name = networkName(it.network, c.lang) || siteText('link', c.lang);
      const raw = it.network === 'email' && /^[^@\s]+@[^@\s]+$/.test(it.url || '') ? `mailto:${it.url}` : it.url;
      const href = c.url(raw);
      if (!href || href === '#') return '';
      const ext = /^https?:/i.test(href) ? ' target="_blank" rel="noopener me"' : '';
      return `<li><a href="${c.attr(href)}"${ext} aria-label="${c.attr(name)}">${c.esc(name)}</a></li>`;
    }).join('');
    return `<ul class="social social--${variant} social--${align}">${items}</ul>`;
  }
});

/* ---------- Formulaire de contact ---------- */
const FIELD_TYPES = ['text', 'email', 'tel', 'textarea'];
export function obfuscate(email) {
  return [...String(email)].reverse().map(ch => ch.charCodeAt(0).toString(16).padStart(2, '0')).join('');
}
register('form', {
  label: __('Formulaire'), icon: '✉', category: __('Contact'),
  fields: [
    { key: 'email', type: 'text', label: __('Adresse qui reçoit les messages') },
    { key: 'action', type: 'url', label: __('Ou adresse d’envoi (service de formulaire, https://…)') },
    { key: 'subject', type: 'text', i18n: true, label: __('Objet du message') },
    { key: 'fields', type: 'list', label: __('Champs'), itemLabel: __('Champ'), fields: [
      { key: 'label', type: 'text', i18n: true, label: __('Libellé') },
      { key: 'type', type: 'select', label: __('Type'), options: [opt('text', __('Texte court')), opt('email', __('E-mail')), opt('tel', __('Téléphone')), opt('textarea', __('Texte long'))] },
      { key: 'required', type: 'toggle', label: __('Obligatoire') }
    ], newItem: () => ({ label: L5('Nouveau champ', 'Nieuw veld', 'Neues Feld', 'New field', '新しい項目'), type: 'text', required: false }) },
    { key: 'submit', type: 'text', i18n: true, label: __('Texte du bouton') },
    { key: 'consent', type: 'text', i18n: true, label: __('Mention vie privée (facultatif)') }
  ],
  defaults: () => ({
    email: '', action: '', subject: L5('Message depuis le site', 'Bericht via de website', 'Nachricht über die Website', 'Message from the website', 'サイトからのお問い合わせ'),
    fields: [
      { label: L5('Nom', 'Naam', 'Name', 'Name', 'お名前'), type: 'text', required: true },
      { label: L5('E-mail', 'E-mail', 'E-Mail', 'Email', 'メールアドレス'), type: 'email', required: true },
      { label: L5('Message', 'Bericht', 'Nachricht', 'Message', 'メッセージ'), type: 'textarea', required: true }
    ],
    submit: L5('Envoyer', 'Verzenden', 'Senden', 'Send', '送信'),
    consent: L5('Vos données servent uniquement à vous répondre.', 'Uw gegevens dienen enkel om u te antwoorden.', 'Ihre Daten dienen nur zur Beantwortung Ihrer Nachricht.', 'Your details are only used to reply to you.', 'ご入力の情報は返信のためにのみ使用します。')
  }),
  css: `.form{display:grid;gap:14px}
.form label{display:grid;gap:6px;font-weight:600}
.form input,.form textarea{font:inherit;color:var(--c3);background:var(--c6);border:1px solid color-mix(in srgb,var(--c3) 25%,transparent);border-radius:calc(var(--radius) - 2px);padding:11px 12px;min-height:46px;width:100%}
.form textarea{min-height:140px;resize:vertical}
.form input:focus,.form textarea:focus{outline:3px solid color-mix(in srgb,var(--c1) 40%,transparent);border-color:var(--c1)}
.form .req{color:var(--c1)}
.form__hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;overflow:hidden}
.form__note{font-size:.88rem;color:var(--c5)}
.form .form__consent{display:flex;gap:10px;align-items:flex-start;font-weight:400;font-size:.92rem}
.form .form__consent input{width:22px;height:22px;min-height:0;margin:2px 0 0;flex:none;accent-color:var(--c1)}
.form__status{font-weight:600}`,
  script: `(function(){document.addEventListener('submit',function(e){var f=e.target;if(!f.matches||!f.matches('form[data-endpoint]'))return;e.preventDefault();var L=window.__aLog||function(){};var st=f.querySelector('.form__status');var b=f.querySelector('[type=submit]');if(b)b.disabled=true;var fd=new FormData(f);L('site.form.submit','Envoi du formulaire',{action:f.action,fields:Array.from(fd.keys()).filter(function(k){return k.charAt(0)!=='_'&&k!=='website';}).length});fetch(f.action,{method:'POST',body:fd,headers:{Accept:'application/json'}}).then(function(r){return r.json().then(function(j){return{ok:r.ok&&j.ok,msg:j.message,status:r.status,req:r.headers.get('X-Atelier-Request')};},function(){return{ok:false,status:r.status,msg:'',bad:true};});}).catch(function(err){return{ok:false,net:String(err&&err.message||err)};}).then(function(r){L(r.ok?'site.form.ok':'site.form.fail',r.ok?'Message envoyé':(r.net?'Réseau injoignable : '+r.net:r.bad?'Réponse illisible (publish.php absent ?)':'Refusé par publish.php : '+(r.msg||r.status)),{status:r.status,req:r.req});if(st)st.textContent=r.ok?st.getAttribute('data-sent'):(r.msg||st.getAttribute('data-failed'));if(r.ok)f.reset();if(b)b.disabled=false;});});var q=location.search.match(/[?&]form=(ok|error)/);if(q){if(window.__aLog)window.__aLog(q[1]==='ok'?'site.form.ok':'site.form.fail','Retour du formulaire sans JavaScript : '+q[1]);document.querySelectorAll('form[data-endpoint] .form__status').forEach(function(st){st.textContent=st.getAttribute(q[1]==='ok'?'data-sent':'data-failed');});}})();
(function(){var hex=function(h){var s='';for(var i=0;i<h.length;i+=2)s+=String.fromCharCode(parseInt(h.substr(i,2),16));return s.split('').reverse().join('');};document.addEventListener('submit',function(e){var f=e.target;if(!f.matches||!f.matches('form[data-to]'))return;e.preventDefault();if(f.querySelector('.form__hp input').value)return;var lines=[];f.querySelectorAll('[data-label]').forEach(function(el){lines.push(el.getAttribute('data-label')+' : '+el.value);});var to=hex(f.getAttribute('data-to'));location.href='mailto:'+to+'?subject='+encodeURIComponent(f.getAttribute('data-subject')||'')+'&body='+encodeURIComponent(lines.join('\\n\\n'));var st=f.querySelector('.form__status');if(st)st.textContent=st.getAttribute('data-sent');});})();`,
  render(p, c, node) {
    const base = `f-${node?.id || 'form'}`;
    const fields = (p.fields || []).map((f, i) => {
      const type = pick(f.type, FIELD_TYPES, 'text');
      const label = c.t(f.label) || siteText('field', c.lang, { n: i + 1 });
      const id = `${base}-${i}`;
      const req = f.required ? ' required' : '';
      const ac = type === 'email' ? ' autocomplete="email"' : type === 'tel' ? ' autocomplete="tel"' : i === 0 ? ' autocomplete="name"' : '';
      const ctl = type === 'textarea'
        ? `<textarea id="${id}" name="${c.attr(label)}" data-label="${c.attr(label)}"${req}></textarea>`
        : `<input id="${id}" type="${type}" name="${c.attr(label)}" data-label="${c.attr(label)}"${ac}${req}>`;
      return `<label for="${id}"><span>${c.esc(label)}${f.required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</span>${ctl}</label>`;
    }).join('');
    const action = c.url(p.action);
    const useAction = /^https:\/\//i.test(action);
    const email = /^[^@\s<>\x22]+@[^@\s<>\x22]+\.[a-z]{2,}$/i.test(p.email || '') ? p.email : '';
    const viaServer = !useAction && email && c.site?.publish?.mode === 'php';
    const back = c.from?.length ? `${c.from.join('/')}/` : './';
    const attrs = useAction ? ` action="${c.attr(action)}" method="post"`
      : viaServer ? ` action="${c.attr(`${c.toRoot || ''}publish.php`)}" method="post" data-endpoint`
      : email ? ` data-to="${obfuscate(email)}" data-subject="${c.attr(c.t(p.subject))}"` : '';
    const hidden = viaServer ? `<input type="hidden" name="_form" value="${c.attr(node?.id || '')}"><input type="hidden" name="_back" value="${c.attr(back)}"><input type="hidden" name="_subject" value="${c.attr(c.t(p.subject))}">` : '';
    const consent = c.t(p.consent);
    /* Case de consentement obligatoire (cycle 29), liée à la page « Vie privée » générée si elle existe */
    const priv = [...(c.site?.pages || [])].reverse().find(x => x.legal === 'privacy');
    const privLabel = c.esc(siteText('privacy', c.lang));
    const privLink = priv ? `<a href="${c.attr(c.url(`page:${priv.id}`))}">${privLabel}</a>` : privLabel;
    const consentText = c.esc(siteText('consent', c.lang)).replace('{link}', privLink);
    const box = `<label class="form__consent"><input type="checkbox" name="_consent" value="oui" required> <span>${consentText}</span></label>`;
    const needEmail = __('⚠ Indiquez l’adresse qui reçoit les messages dans l’inspecteur.');
    const missing = !useAction && !email && c.canvas ? `<p class="form__note">${c.esc(needEmail)}</p>` : '';
    const sent = siteText(viaServer ? 'sent' : 'mailOpen', c.lang);
    const failed = siteText('failed', c.lang);
    return `<form class="form"${attrs}>${hidden}${fields}<span class="form__hp" aria-hidden="true"><input type="text" name="website" tabindex="-1" autocomplete="off"></span>${consent ? `<p class="form__note">${c.esc(consent)}</p>` : ''}${box}${missing}<div><button type="submit" class="btn btn--primary btn--md" data-edit="submit">${c.esc(c.t(p.submit) || siteText('send', c.lang))}</button></div><p class="form__status" role="status" data-sent="${c.attr(sent)}" data-failed="${c.attr(failed)}"></p></form>`;
  }
});

/* ---------- Carte de contenu ---------- */
const imageLabel = () => __('Image');
register('card', {
  label: __('Carte de contenu'), icon: '▤', category: __('Contenu'),
  styleTarget: '.card',
  fields: [
    { key: 'image', type: 'image', label: __('Image') },
    { key: 'alt', type: 'text', i18n: true, label: __('Description de l’image') },
    { key: 'title', type: 'inline', i18n: true, label: __('Titre') },
    { key: 'text', type: 'richtext', i18n: true, label: __('Texte') },
    { key: 'button', type: 'text', i18n: true, label: __('Texte du lien') },
    { key: 'link', type: 'url', label: __('Lien') }
  ],
  defaults: () => ({ image: '', alt: empty(), title: L5('Titre de la carte', 'Titel van de kaart', 'Titel der Karte', 'Card title', 'カードの見出し'),
    text: L5('<p>Un court texte de présentation.</p>', '<p>Een korte voorstellingstekst.</p>', '<p>Ein kurzer Vorstellungstext.</p>', '<p>A short introduction.</p>', '<p>短い紹介文を入れます。</p>'),
    button: L5('Lire la suite', 'Lees meer', 'Weiterlesen', 'Read more', '続きを読む'), link: '#' }),
  css: `.card{display:flex;flex-direction:column;height:100%;background:var(--c6);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden}
.card__img img,.card__img .img-empty{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:0;border:0;min-height:0}
.card__body{padding:20px;display:grid;gap:10px;flex:1;align-content:start}
.card__title{font-size:1.2rem}
.card__more{margin-top:auto;font-weight:700}`,
  render(p, c) {
    const src = c.img(p.image);
    const img = src ? `<div class="card__img"><img src="${c.attr(src)}" alt="${c.attr(c.t(p.alt))}" loading="lazy"></div>` : c.canvas ? `<div class="card__img"><div class="img-empty">${c.esc(imageLabel())}</div></div>` : '';
    const link = c.url(p.link);
    const btn = c.t(p.button);
    return `<article class="card">${img}<div class="card__body"><h3 class="card__title" data-edit="title">${c.inline(c.t(p.title))}</h3><div class="rich" data-edit="text">${c.rich(c.t(p.text))}</div>${btn && link ? `<a class="card__more" href="${c.attr(link)}" data-edit="button">${c.esc(btn)} →</a>` : ''}</div></article>`;
  }
});

/* ---------- Tarif ---------- */
register('pricing', {
  label: __('Tarif'), icon: '€', category: __('Contenu'),
  styleTarget: '.price',
  fields: [
    { key: 'title', type: 'inline', i18n: true, label: __('Formule') },
    { key: 'price', type: 'text', label: __('Prix (ex. 49 €)') },
    { key: 'period', type: 'text', i18n: true, label: __('Période (ex. par mois)') },
    { key: 'features', type: 'richtext', i18n: true, label: __('Ce qui est inclus (liste à puces)') },
    { key: 'button', type: 'text', i18n: true, label: __('Texte du bouton') },
    { key: 'link', type: 'url', label: __('Lien du bouton') },
    { key: 'highlight', type: 'toggle', label: __('Mettre en avant') },
    { key: 'badge', type: 'text', i18n: true, label: __('Badge (ex. Le plus choisi)') }
  ],
  defaults: () => ({ title: L5('Formule', 'Formule', 'Angebot', 'Plan', 'プラン'), price: '49 €', period: L5('par mois', 'per maand', 'pro Monat', 'per month', '月額'),
    features: L5('<ul><li>Premier avantage</li><li>Deuxième avantage</li><li>Troisième avantage</li></ul>', '<ul><li>Eerste voordeel</li><li>Tweede voordeel</li><li>Derde voordeel</li></ul>', '<ul><li>Erster Vorteil</li><li>Zweiter Vorteil</li><li>Dritter Vorteil</li></ul>', '<ul><li>First benefit</li><li>Second benefit</li><li>Third benefit</li></ul>', '<ul><li>特典 その1</li><li>特典 その2</li><li>特典 その3</li></ul>'),
    button: L5('Choisir', 'Kiezen', 'Auswählen', 'Choose', '選ぶ'), link: '#contact', highlight: false, badge: empty() }),
  css: `.price{position:relative;height:100%;display:flex;flex-direction:column;gap:14px;padding:28px;background:var(--c6);border:1px solid var(--line);border-radius:var(--radius)}
.price--hi{border:2px solid var(--c1);box-shadow:0 18px 40px -24px color-mix(in srgb,var(--c1) 70%,transparent)}
.price__badge{position:absolute;top:-12px;left:24px;background:var(--c1);color:var(--c6);font-size:.78rem;font-weight:700;padding:4px 10px;border-radius:999px}
.price__amount{font:800 clamp(2rem,1.6rem + 1.4vw,2.8rem)/1 var(--font-h)}
.price__period{color:var(--c5);font-size:.95rem;margin-left:6px}
.price .rich ul{list-style:none;padding:0;display:grid;gap:8px}
.price .rich li{padding-left:26px;position:relative}
.price .rich li::before{content:"✓";position:absolute;left:0;color:var(--c1);font-weight:800}
.price .btn{margin-top:auto}`,
  render(p, c) {
    const badge = c.t(p.badge);
    const link = c.url(p.link);
    const btn = c.t(p.button);
    return `<div class="price${p.highlight ? ' price--hi' : ''}">${badge ? `<span class="price__badge">${c.esc(badge)}</span>` : ''}<h3 data-edit="title">${c.inline(c.t(p.title))}</h3><p><span class="price__amount" data-edit="price">${c.esc(p.price || '')}</span><span class="price__period">${c.esc(c.t(p.period))}</span></p><div class="rich" data-edit="features">${c.rich(c.t(p.features))}</div>${btn ? `<a class="btn ${p.highlight ? 'btn--primary' : 'btn--outline'} btn--md" href="${c.attr(link || '#')}" data-edit="button">${c.esc(btn)}</a>` : ''}</div>`;
  }
});

/* ---------- Structure du site : logo, menu, langues (en-tête et pied de page en blocs) ---------- */
register('site-logo', {
  label: __('Logo du site'), icon: '◆', category: __('Site'),
  fields: [
    { key: 'showName', type: 'toggle', label: __('Afficher le nom du site') },
    { key: 'size', type: 'select', label: __('Hauteur du logo'), options: [opt('32', '32 px'), opt('40', '40 px'), opt('56', '56 px'), opt('72', '72 px')] }
  ],
  defaults: () => ({ showName: true, size: '40' }),
  render(p, c) {
    const logo = c.img(c.site?.header?.logo);
    const h = pick(String(p.size), ['32', '40', '56', '72'], '40');
    const name = c.esc(c.site?.name || '');
    return `<a class="brand" href="${c.attr(c.homeHref || './')}"${!p.showName ? ` aria-label="${c.attr(c.site?.name || siteText('home', c.lang))}"` : ''}>${logo ? `<img src="${c.attr(logo)}" alt="" style="height:${h}px">` : ''}${p.showName || !logo ? `<span>${name}</span>` : ''}</a>`;
  }
});

register('nav-menu', {
  label: __('Menu'), icon: '≡', category: __('Site'),
  fields: [
    { key: 'layout', type: 'select', label: __('Disposition'), options: [opt('horizontal', __('En ligne')), opt('vertical', __('En colonne'))] },
    { key: 'align', type: 'select', label: __('Alignement'), options: [opt('start', __('Gauche')), opt('center', __('Centre')), opt('end', __('Droite'))] },
    { key: 'burger', type: 'toggle', label: __('Bouton « Menu » sur mobile') }
  ],
  defaults: () => ({ layout: 'horizontal', align: 'end', burger: true }),
  render(p, c, node) {
    const layout = pick(p.layout, ['horizontal', 'vertical'], 'horizontal');
    const align = pick(p.align, ['start', 'center', 'end'], 'end');
    const id = `menu-${node?.id || 'm'}`;
    const burger = p.burger && layout === 'horizontal' ? `<button type="button" class="nav-burger" aria-expanded="false" aria-controls="${c.attr(id)}"><span aria-hidden="true">☰</span> ${c.esc(siteText('menu', c.lang))}</button>` : '';
    return `<nav class="site-nav nav--${layout} nav--${align}" aria-label="${c.attr(siteText('menu', c.lang))}">${burger}${c.menu ? c.menu(id) : ''}</nav>`;
  }
});

register('lang-switch', {
  label: __('Choix de langue'), icon: '⇄', category: __('Site'),
  fields: [{ key: 'style', type: 'select', label: __('Affichage'), options: [opt('codes', __('Codes (FR, NL…)')), opt('names', __('Noms (Français…)'))] }],
  defaults: () => ({ style: 'codes' }),
  render(p, c) { return c.langLinks ? c.langLinks(pick(p.style, ['codes', 'names'], 'codes')) : ''; }
});

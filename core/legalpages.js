/*
 * Pages légales générées (cycle 29) : « Mentions légales » (identification de l'éditeur du site : dénomination, forme,
 * siège, numéro d'entreprise, RPM, contact, hébergeur — Code de droit économique, art. XII.6) et « Vie privée »
 * (formulaire relayé par e-mail sans stockage, façades vidéo et carte, polices locales, aucun cookie, hébergeur,
 * droits RGPD). Même mécanique que la déclaration d'accessibilité (core/a11ypage.js) : page générée dans les langues
 * du site, modifiable ensuite, liée dans le pied de page. Texte modèle à adapter et à faire relire par un juriste.
 */
import { createNode, createSectionWithColumns } from './tree.js';
import { newPageId } from './site.js';
import { escapeHtml } from './escape.js';
import { __ } from './ui-i18n.js';
import { cloneSite } from './asset-store.js';

const L5 = (fr, nl, de, en, ja) => ({ fr, nl, de, en, ja });

/* Marque des champs laissés à compléter par un modèle de site (cycle 28) ; le contrôle avant export la signale */
export const TO_COMPLETE = L5('[à compléter]', '[in te vullen]', '[auszufüllen]', '[to be completed]', '［要記入］');

export const LEGAL_FORMS = {
  asbl: L5('ASBL (association sans but lucratif)', 'VZW (vereniging zonder winstoogmerk)', 'VoG (Vereinigung ohne Gewinnerzielungsabsicht)', 'Non-profit association (ASBL)', '非営利社団（ASBL）'),
  srl: L5('SRL (société à responsabilité limitée)', 'BV (besloten vennootschap)', 'GmbH (Gesellschaft mit beschränkter Haftung)', 'Private limited company (SRL)', '有限責任会社（SRL）'),
  sa: L5('SA (société anonyme)', 'NV (naamloze vennootschap)', 'AG (Aktiengesellschaft)', 'Public limited company (SA)', '株式会社（SA）'),
  sc: L5('SC (société coopérative)', 'CV (coöperatieve vennootschap)', 'Genossenschaft (SC)', 'Cooperative company (SC)', '協同組合会社（SC）'),
  independant: L5('Personne physique (indépendant)', 'Natuurlijk persoon (zelfstandige)', 'Natürliche Person (Selbstständige)', 'Sole trader (self-employed)', '個人事業主'),
  fondation: L5('Fondation', 'Stichting', 'Stiftung', 'Foundation', '財団'),
  autre: L5('Autre forme', 'Andere vorm', 'Andere Rechtsform', 'Other legal form', 'その他の形態')
};

const T = {
  legal: L5('Mentions légales', 'Wettelijke vermeldingen', 'Impressum', 'Legal notice', '法的表示'),
  privacy: L5('Vie privée', 'Privacy', 'Datenschutz', 'Privacy', 'プライバシーポリシー'),
  hPublisher: L5('Éditeur du site', 'Uitgever van de website', 'Herausgeber der Website', 'Website publisher', 'サイト運営者'),
  name: L5('Dénomination', 'Naam', 'Name', 'Name', '名称'),
  form: L5('Forme juridique', 'Rechtsvorm', 'Rechtsform', 'Legal form', '法人形態'),
  seat: L5('Siège', 'Zetel', 'Sitz', 'Registered office', '所在地'),
  number: L5('Numéro d’entreprise (BCE)', 'Ondernemingsnummer (KBO)', 'Unternehmensnummer (ZDU)', 'Company number (CBE)', '企業番号（BCE）'),
  rpm: L5('RPM', 'RPR', 'HRJP', 'Register of legal entities (RPM)', '法人登記（RPM）'),
  vat: L5('TVA', 'BTW', 'MwSt', 'VAT', '付加価値税番号'),
  email: L5('E-mail', 'E-mail', 'E-Mail', 'Email', 'メール'),
  phone: L5('Téléphone', 'Telefoon', 'Telefon', 'Phone', '電話'),
  hHost: L5('Hébergement', 'Hosting', 'Hosting', 'Hosting', 'ホスティング'),
  host: L5('Ce site est hébergé par :', 'Deze website wordt gehost door:', 'Diese Website wird gehostet von:', 'This website is hosted by:', 'このサイトのホスティング事業者：'),
  hRights: L5('Propriété intellectuelle', 'Intellectuele eigendom', 'Geistiges Eigentum', 'Intellectual property', '知的財産'),
  rights: L5('Les textes, images et logos de ce site appartiennent à leurs auteurs. Toute reproduction demande une autorisation préalable.',
    'De teksten, afbeeldingen en logo’s op deze website behoren toe aan hun auteurs. Voor elke reproductie is voorafgaande toestemming nodig.',
    'Texte, Bilder und Logos dieser Website gehören ihren Urhebern. Jede Vervielfältigung bedarf einer vorherigen Genehmigung.',
    'The texts, images and logos on this website belong to their authors. Any reproduction requires prior permission.',
    'このサイトの文章・画像・ロゴの権利は各著作者に帰属します。転載には事前の許可が必要です。'),
  hData: L5('Données traitées', 'Verwerkte gegevens', 'Verarbeitete Daten', 'Data we process', '取り扱う情報'),
  data: L5('Ce site ne dépose aucun cookie et ne contient aucun outil de mesure d’audience ni script d’un tiers.',
    'Deze website plaatst geen cookies en bevat geen bezoekersstatistieken of scripts van derden.',
    'Diese Website setzt keine Cookies und enthält weder Reichweitenmessung noch Skripte Dritter.',
    'This website sets no cookies and contains no audience measurement or third-party scripts.',
    'このサイトはクッキーを使用せず、アクセス解析や第三者のスクリプトも含みません。'),
  hForm: L5('Formulaire de contact', 'Contactformulier', 'Kontaktformular', 'Contact form', 'お問い合わせフォーム'),
  form_: L5('Les données que vous saisissez dans le formulaire (nom, adresse e-mail, message) sont transmises par e-mail à {name} pour répondre à votre demande, avec votre consentement. Elles ne sont pas enregistrées sur le site ; le courriel est conservé le temps nécessaire au traitement de votre demande.',
    'De gegevens die u in het formulier invult (naam, e-mailadres, bericht) worden met uw toestemming per e-mail naar {name} gestuurd om uw vraag te beantwoorden. Ze worden niet op de website opgeslagen; de e-mail wordt bewaard zolang nodig is om uw vraag te behandelen.',
    'Die im Formular eingegebenen Daten (Name, E-Mail-Adresse, Nachricht) werden mit Ihrer Einwilligung per E-Mail an {name} übermittelt, um Ihre Anfrage zu beantworten. Sie werden nicht auf der Website gespeichert; die E-Mail wird so lange aufbewahrt, wie es für die Bearbeitung nötig ist.',
    'The information you enter in the form (name, email address, message) is sent by email to {name} to answer your request, with your consent. It is not stored on the website; the email is kept as long as needed to handle your request.',
    'フォームに入力された情報（お名前・メールアドレス・メッセージ）は、ご同意のうえ、お問い合わせへの回答のために {name} へメールで送信されます。サイト上には保存されず、メールは対応に必要な期間のみ保管します。'),
  hEmbeds: L5('Vidéos, cartes et polices', 'Video’s, kaarten en lettertypes', 'Videos, Karten und Schriften', 'Videos, maps and fonts', '動画・地図・フォント'),
  embeds: L5('Les vidéos (YouTube, Vimeo) et les cartes (Google Maps) ne sont chargées que si vous cliquez dessus : votre navigateur contacte alors ce service, qui applique sa propre politique de confidentialité. Les polices de caractères sont hébergées sur ce site : aucune requête n’est envoyée à Google Fonts.',
    'Video’s (YouTube, Vimeo) en kaarten (Google Maps) worden pas geladen als u erop klikt: uw browser neemt dan contact op met die dienst, die zijn eigen privacybeleid toepast. De lettertypes worden op deze website gehost: er wordt geen verzoek naar Google Fonts gestuurd.',
    'Videos (YouTube, Vimeo) und Karten (Google Maps) werden erst geladen, wenn Sie darauf klicken: Ihr Browser kontaktiert dann diesen Dienst, für den dessen eigene Datenschutzerklärung gilt. Die Schriften werden auf dieser Website gehostet: Es wird keine Anfrage an Google Fonts gesendet.',
    'Videos (YouTube, Vimeo) and maps (Google Maps) only load if you click on them: your browser then contacts that service, which applies its own privacy policy. Fonts are hosted on this website: no request is sent to Google Fonts.',
    '動画（YouTube、Vimeo）と地図（Google マップ）は、クリックしたときにだけ読み込まれます。その際ブラウザは各サービスに接続し、各社のプライバシーポリシーが適用されます。フォントはこのサイト上にあり、Google Fonts への通信は行いません。'),
  hostLog: L5('Comme tout hébergeur, {host} peut conserver pendant une durée limitée les journaux techniques du serveur (adresse IP, page demandée), pour la sécurité du service.',
    'Zoals elke hostingprovider kan {host} de technische serverlogs (IP-adres, opgevraagde pagina) een beperkte tijd bewaren voor de veiligheid van de dienst.',
    'Wie jeder Hoster kann {host} technische Server-Protokolle (IP-Adresse, aufgerufene Seite) für begrenzte Zeit zur Sicherheit des Dienstes speichern.',
    'Like any host, {host} may keep technical server logs (IP address, requested page) for a limited time for the security of the service.',
    '一般的なホスティング事業者と同様に、{host} はサービスの安全のため、サーバーの技術ログ（IPアドレス、閲覧ページ）を一定期間保存することがあります。'),
  hGdpr: L5('Vos droits', 'Uw rechten', 'Ihre Rechte', 'Your rights', 'あなたの権利'),
  gdpr: L5('Conformément au RGPD, vous pouvez demander l’accès à vos données, leur rectification ou leur effacement, ou retirer votre consentement, en écrivant à {email}. Vous pouvez aussi introduire une réclamation auprès de l’Autorité de protection des données (www.autoriteprotectiondonnees.be).',
    'Overeenkomstig de AVG kunt u inzage, verbetering of verwijdering van uw gegevens vragen, of uw toestemming intrekken, door te schrijven naar {email}. U kunt ook een klacht indienen bij de Gegevensbeschermingsautoriteit (www.gegevensbeschermingsautoriteit.be).',
    'Gemäß der DSGVO können Sie Auskunft, Berichtigung oder Löschung Ihrer Daten verlangen oder Ihre Einwilligung widerrufen, indem Sie an {email} schreiben. Sie können auch Beschwerde bei der Datenschutzbehörde einreichen (www.datenschutzbehorde.be).',
    'Under the GDPR, you may request access to, correction or deletion of your data, or withdraw your consent, by writing to {email}. You may also lodge a complaint with the Data Protection Authority (www.dataprotectionauthority.be).',
    'GDPR（EU一般データ保護規則）に基づき、{email} 宛てにご連絡いただければ、ご自身の情報の開示・訂正・削除の請求や、同意の撤回ができます。ベルギーのデータ保護機関（www.dataprotectionauthority.be）に苦情を申し立てることもできます。'),
  hController: L5('Responsable du traitement', 'Verwerkingsverantwoordelijke', 'Verantwortlicher', 'Data controller', '個人情報取扱責任者')
};

const EMAIL = /^[^@\s<>"]+@[^@\s<>"]+\.[a-z]{2,}$/i;
const fill = (s, p) => s.replace(/\{(\w+)\}/g, (m, k) => (p[k] !== undefined ? p[k] : m));
const clean = v => String(v ?? '').trim();

function langsOf(site) { return site.languages?.length ? site.languages : ['fr']; }
const perLang = (site, fn) => Object.fromEntries(langsOf(site).map(l => [l, fn(l)]));
const tr = (o, l) => o[l] ?? o.fr;

function heading(text, level = 'h2') { const n = createNode('heading'); n.props.text = text; n.props.level = level; return n; }
function para(html) { const n = createNode('text'); n.props.content = html; return n; }

function article(children) {
  const sec = createSectionWithColumns(1);
  sec.props.tag = 'article';
  const col = sec.children[0].children[0];
  col.style.desktop.maxWidth = '72ch';
  col.children = children;
  const root = createNode('page');
  root.children = [sec];
  return root;
}

function need(opts, keys) {
  const msgs = { name: __('Indiquez la dénomination.'), seat: __('Indiquez l’adresse du siège.'), number: __('Indiquez le numéro d’entreprise (BCE).'), email: __('Indiquez une adresse e-mail valide.'), host: __('Indiquez l’hébergeur du site.') };
  for (const k of keys) if (!clean(opts[k])) throw new Error(msgs[k]);
  if (keys.includes('email') && !EMAIL.test(clean(opts.email))) throw new Error(msgs.email);
  if (keys.includes('number') && !/^(BE)?\s*0?\d{3}[.\s]?\d{3}[.\s]?\d{3}$|^\d{4}[.\s]?\d{3}[.\s]?\d{3}$/i.test(clean(opts.number))) throw new Error(__('Numéro d’entreprise invalide (format 0123.456.789).'));
}

export function buildLegalPage(site, opts, slug = 'mentions-legales') {
  need(opts, ['name', 'seat', 'number', 'email', 'host']);
  const e = k => escapeHtml(clean(opts[k]));
  const form = LEGAL_FORMS[opts.form] || null;
  const row = (l, key, value) => (value ? `<li><strong>${escapeHtml(tr(T[key], l))}</strong> : ${value}</li>` : '');
  const mail = e('email');
  const list = l => `<ul>${[row(l, 'name', e('name')), form ? row(l, 'form', escapeHtml(tr(form, l))) : '', row(l, 'seat', e('seat')), row(l, 'number', e('number')),
    row(l, 'rpm', e('rpm')), row(l, 'vat', e('vat')), row(l, 'email', `<a href="mailto:${mail}">${mail}</a>`), row(l, 'phone', e('phone'))].join('')}</ul>`;
  const root = article([
    heading(perLang(site, l => tr(T.legal, l)), 'h1'),
    heading(perLang(site, l => tr(T.hPublisher, l))), para(perLang(site, list)),
    heading(perLang(site, l => tr(T.hHost, l))), para(perLang(site, l => `<p>${escapeHtml(tr(T.host, l))} ${e('host')}</p>`)),
    heading(perLang(site, l => tr(T.hRights, l))), para(perLang(site, l => `<p>${escapeHtml(tr(T.rights, l))}</p>`))
  ]);
  return { id: newPageId(), slug, legal: 'legal', title: perLang(site, l => tr(T.legal, l)), seo: { description: perLang(site, l => `${tr(T.legal, l)} – ${site.name}`) }, footerLink: true, root };
}

export function buildPrivacyPage(site, opts, slug = 'vie-privee') {
  need(opts, ['name', 'email', 'host']);
  const name = escapeHtml(clean(opts.name));
  const mail = escapeHtml(clean(opts.email));
  const host = escapeHtml(clean(opts.host));
  const link = `<a href="mailto:${mail}">${mail}</a>`;
  const root = article([
    heading(perLang(site, l => tr(T.privacy, l)), 'h1'),
    heading(perLang(site, l => tr(T.hController, l))), para(perLang(site, l => `<p>${name} – ${link}</p>`)),
    heading(perLang(site, l => tr(T.hData, l))), para(perLang(site, l => `<p>${escapeHtml(tr(T.data, l))}</p>`)),
    heading(perLang(site, l => tr(T.hForm, l))), para(perLang(site, l => `<p>${fill(escapeHtml(tr(T.form_, l)), { name })}</p>`)),
    heading(perLang(site, l => tr(T.hEmbeds, l))), para(perLang(site, l => `<p>${escapeHtml(tr(T.embeds, l))}</p>`)),
    heading(perLang(site, l => tr(T.hHost, l))), para(perLang(site, l => `<p>${fill(escapeHtml(tr(T.hostLog, l)), { host })}</p>`)),
    heading(perLang(site, l => tr(T.hGdpr, l))), para(perLang(site, l => `<p>${fill(escapeHtml(tr(T.gdpr, l)), { email: link })}</p>`))
  ]);
  return { id: newPageId(), slug, legal: 'privacy', title: perLang(site, l => tr(T.privacy, l)), seo: { description: perLang(site, l => `${tr(T.privacy, l)} – ${site.name}`) }, footerLink: true, root };
}

const freeSlug = (site, base) => { let s = base; for (let n = 2; site.pages.some(p => p.slug === s); n++) s = `${base}-${n}`; return s; };

/* Crée les deux pages (ou une seule : which = 'legal' | 'privacy'), liées dans le pied de page */
export function addLegalPages(site, opts, which = 'both') {
  const s = cloneSite(site);
  const out = { site: s, legalId: null, privacyId: null };
  if (which !== 'privacy') { const p = buildLegalPage(s, opts, freeSlug(s, 'mentions-legales')); s.pages.push(p); out.legalId = p.id; }
  if (which !== 'legal') { const p = buildPrivacyPage(s, opts, freeSlug(s, 'vie-privee')); s.pages.push(p); out.privacyId = p.id; }
  return out;
}

/* Page « Vie privée » du site (la dernière générée), pour le lien de la case de consentement */
export function privacyPage(site) {
  return [...(site.pages || [])].reverse().find(p => p.legal === 'privacy') || null;
}

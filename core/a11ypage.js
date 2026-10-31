/*
 * Déclaration d'accessibilité en cinq langues (modèle inspiré des déclarations exigées par la directive
 * européenne 2016/2102 et l'European Accessibility Act). Texte informatif, à relire par le responsable du site.
 * Cycle 33 : référence WCAG 2.2 niveau AA et EN 301 549 v3.2.1 ; la version japonaise cite aussi JIS X 8341-3.
 */
import { createNode, createSectionWithColumns } from './tree.js';
import { newPageId } from './site.js';
import { escapeHtml } from './escape.js';
import { __ } from './ui-i18n.js';

const STATUS = {
  full: { fr: 'totalement conforme', nl: 'volledig conform', de: 'vollständig konform', en: 'fully compliant', ja: '完全に準拠' },
  partial: { fr: 'partiellement conforme', nl: 'gedeeltelijk conform', de: 'teilweise konform', en: 'partially compliant', ja: '一部準拠' },
  none: { fr: 'non conforme', nl: 'niet conform', de: 'nicht konform', en: 'non-compliant', ja: '非準拠' }
};

const T = {
  title: { fr: 'Accessibilité', nl: 'Toegankelijkheid', de: 'Barrierefreiheit', en: 'Accessibility', ja: 'アクセシビリティ' },
  intro: {
    fr: e => `${e} s’engage à rendre ce site accessible à toutes et à tous, quel que soit leur handicap ou leur équipement.`,
    nl: e => `${e} wil deze website toegankelijk maken voor iedereen, ongeacht beperking of apparatuur.`,
    de: e => `${e} verpflichtet sich, diese Website für alle Menschen zugänglich zu machen, unabhängig von Behinderung oder Ausstattung.`,
    en: e => `${e} is committed to making this website accessible to everyone, regardless of disability or equipment.`,
    ja: e => `${e}は、障害の有無や利用環境にかかわらず、すべての方がこのウェブサイトを利用できるよう取り組んでいます。`
  },
  hStatus: { fr: 'État de conformité', nl: 'Nalevingsstatus', de: 'Stand der Vereinbarkeit', en: 'Compliance status', ja: '準拠状況' },
  status: {
    fr: s => `Ce site est <strong>${s}</strong> avec les règles WCAG 2.2 niveau AA, reprises par la norme européenne EN 301 549 v3.2.1.`,
    nl: s => `Deze website is <strong>${s}</strong> met de WCAG 2.2-richtlijnen niveau AA, overgenomen in de Europese norm EN 301 549 v3.2.1.`,
    de: s => `Diese Website ist <strong>${s}</strong> mit den WCAG 2.2 auf Stufe AA, übernommen in die europäische Norm EN 301 549 v3.2.1.`,
    en: s => `This website is <strong>${s}</strong> with WCAG 2.2 level AA, as adopted in the European standard EN 301 549 v3.2.1.`,
    ja: s => `このウェブサイトは、WCAG 2.2 レベル AA（欧州規格 EN 301 549 v3.2.1 に採用）に<strong>${s}</strong>しています。日本産業規格 JIS X 8341-3（ウェブコンテンツ）の適合レベル AA も目安としています。`
  },
  hLimits: { fr: 'Contenus non accessibles', nl: 'Niet-toegankelijke inhoud', de: 'Nicht barrierefreie Inhalte', en: 'Non-accessible content', ja: 'アクセシビリティに対応していないコンテンツ' },
  noLimits: {
    fr: 'Aucun contenu non accessible n’a été identifié lors de la dernière vérification.',
    nl: 'Bij de laatste controle werd geen niet-toegankelijke inhoud gevonden.',
    de: 'Bei der letzten Prüfung wurden keine nicht barrierefreien Inhalte festgestellt.',
    en: 'No non-accessible content was identified during the last review.',
    ja: '前回の確認では、対応していないコンテンツは見つかりませんでした。'
  },
  hMethod: { fr: 'Établissement de cette déclaration', nl: 'Opstelling van deze verklaring', de: 'Erstellung dieser Erklärung', en: 'Preparation of this statement', ja: 'この方針の作成方法' },
  method: {
    fr: d => `Déclaration établie le ${d} par auto-évaluation : contrôle intégré à l’outil d’édition (contrastes, textes alternatifs, structure des titres, liens) et tests automatiques des pages publiées.`,
    nl: d => `Verklaring opgesteld op ${d} via zelfevaluatie: ingebouwde controle in het bewerkingsprogramma (contrast, alternatieve teksten, kopstructuur, links) en automatische tests van de gepubliceerde pagina’s.`,
    de: d => `Erklärung erstellt am ${d} durch Selbstbewertung: integrierte Prüfung im Bearbeitungswerkzeug (Kontraste, Alternativtexte, Überschriftenstruktur, Links) und automatische Tests der veröffentlichten Seiten.`,
    en: d => `Statement prepared on ${d} by self-assessment: built-in checks in the editing tool (contrast, alternative text, heading structure, links) and automated tests of the published pages.`,
    ja: d => `${d}に自己評価により作成しました。編集ツールに組み込まれたチェック（コントラスト、代替テキスト、見出しの構造、リンク）と、公開ページの自動テストによります。`
  },
  hContact: { fr: 'Signaler un problème', nl: 'Een probleem melden', de: 'Ein Problem melden', en: 'Report a problem', ja: '問題のご連絡' },
  contact: {
    fr: m => `Vous rencontrez une difficulté pour accéder à un contenu ? Écrivez-nous à <a href="mailto:${m}">${m}</a> : nous vous répondrons et vous proposerons une alternative accessible.`,
    nl: m => `Ondervindt u moeilijkheden om bepaalde inhoud te raadplegen? Schrijf ons op <a href="mailto:${m}">${m}</a>: we antwoorden u en bieden een toegankelijk alternatief aan.`,
    de: m => `Haben Sie Schwierigkeiten, auf einen Inhalt zuzugreifen? Schreiben Sie uns an <a href="mailto:${m}">${m}</a>: Wir antworten Ihnen und bieten eine barrierefreie Alternative an.`,
    en: m => `Having trouble accessing some content? Write to us at <a href="mailto:${m}">${m}</a>: we will reply and offer an accessible alternative.`,
    ja: m => `ご利用になれないコンテンツがありましたら、<a href="mailto:${m}">${m}</a> までお知らせください。ご返信のうえ、利用しやすい代わりの方法をご案内します。`
  },
  hRecourse: { fr: 'Voies de recours', nl: 'Beroepsmogelijkheden', de: 'Rechtsbehelfe', en: 'Enforcement procedure', ja: '苦情の申し立て' },
  recourse: {
    fr: 'Si notre réponse ne vous satisfait pas, vous pouvez vous adresser au service de médiation compétent (en Belgique, pour les organismes publics : le Médiateur fédéral ou le médiateur de votre région ou communauté).',
    nl: 'Bent u niet tevreden met ons antwoord, dan kunt u zich wenden tot de bevoegde ombudsdienst (in België, voor overheidsinstanties: de federale Ombudsman of de ombudsman van uw gewest of gemeenschap).',
    de: 'Wenn Sie mit unserer Antwort nicht zufrieden sind, können Sie sich an die zuständige Schlichtungsstelle wenden (in Belgien für öffentliche Stellen: der Föderale Ombudsmann oder der Ombudsdienst Ihrer Region oder Gemeinschaft).',
    en: 'If you are not satisfied with our reply, you can contact the competent ombudsman service (in Belgium, for public bodies: the Federal Ombudsman or the ombudsman of your region or community).',
    ja: '回答にご満足いただけない場合は、所管の相談窓口または苦情処理機関にご相談いただけます。'
  }
};

const LANGS = ['fr', 'nl', 'de', 'en', 'ja'];

function heading(text, level = 'h2') {
  const n = createNode('heading');
  n.props.text = text;
  n.props.level = level;
  return n;
}
function para(html) {
  const n = createNode('text');
  n.props.content = html;
  return n;
}

function formatDate(iso, lang) {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat({ fr: 'fr-BE', nl: 'nl-BE', de: 'de-BE', en: 'en-GB', ja: 'ja-JP' }[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}

export function buildAccessibilityPage(site, { entity, email, date, status = 'partial', limits = [], slug = 'accessibilite' }) {
  const e = escapeHtml(String(entity || site.name || '').trim());
  const m = /^[^@\s<>"]+@[^@\s<>"]+\.[a-z]{2,}$/i.test(email || '') ? email : '';
  if (!m) throw new Error(__('Indiquez une adresse e-mail valide pour le contact accessibilité.'));
  const st = STATUS[status] || STATUS.partial;
  /* Les langues du site (les cinq sont rédigées) */
  const langs = (site.languages || []).filter(l => LANGS.includes(l));
  const per = fn => Object.fromEntries((langs.length ? langs : LANGS).map(l => [l, fn(l)]));
  const items = (limits || []).map(x => String(x).trim()).filter(Boolean).slice(0, 30).map(x => `<li>${escapeHtml(x)}</li>`).join('');
  const sec = createSectionWithColumns(1);
  sec.props.tag = 'article';
  const col = sec.children[0].children[0];
  col.style.desktop.maxWidth = '72ch';
  col.children = [
    heading(per(l => T.title[l]), 'h1'),
    para(per(l => `<p>${T.intro[l](e)}</p>`)),
    heading(per(l => T.hStatus[l])),
    para(per(l => `<p>${T.status[l](st[l])}</p>`)),
    heading(per(l => T.hLimits[l])),
    para(per(l => (items ? `<ul>${items}</ul>` : `<p>${T.noLimits[l]}</p>`))),
    heading(per(l => T.hMethod[l])),
    para(per(l => `<p>${T.method[l](formatDate(date, l))}</p>`)),
    heading(per(l => T.hContact[l])),
    para(per(l => `<p>${T.contact[l](m)}</p>`)),
    heading(per(l => T.hRecourse[l])),
    para(per(l => `<p>${T.recourse[l]}</p>`))
  ];
  const root = createNode('page');
  root.children = [sec];
  return { id: newPageId(), slug, title: per(l => T.title[l]), seo: { description: per(l => `${T.title[l]} – ${site.name}`) }, footerLink: true, root };
}

export function addAccessibilityPage(site, opts) {
  let slug = 'accessibilite';
  for (let n = 2; site.pages.some(p => p.slug === slug); n++) slug = `accessibilite-${n}`;
  const page = buildAccessibilityPage(site, { ...opts, slug });
  const s = structuredClone(site);
  s.pages.push(page);
  return { site: s, pageId: page.id };
}

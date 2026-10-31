/*
 * Guide d'utilisation (cycle 24) : bouton ❓, menu Fichier, F1 et Ctrl+K ouvrent le guide HTML (guide/<langue>/)
 * dans un nouvel onglet ; si une fenêtre de l'éditeur est ouverte, F1 ouvre directement son chapitre.
 */
import { __, uiLang } from '../core/ui-i18n.js';
import { log } from './log.js';

const BY_DIALOG = {
  aiDialog: '07-ia-locale', benchDialog: '14-banc-essai', askDialog: '13-demander-a-atelier', smartDialog: '12-contenus-intelligents', paletteDialog: '12-contenus-intelligents',
  publishDialog: '08-verifier-exporter-publier', publishConfirmDialog: '08-verifier-exporter-publier', auditDialog: '08-verifier-exporter-publier', seoDialog: '06-seo', i18nDialog: '05-langues-traductions',
  versionsDialog: '04-pages-images-contenus', legalDialog: '04-pages-images-contenus', collectionDialog: '04-pages-images-contenus', collectionNewDialog: '04-pages-images-contenus',
  collabDialog: '10-collaboration', joinDialog: '10-collaboration', logDialog: '00-journal', selftestDialog: '15-auto-test', shortcutsDialog: '02-edition', newSiteDialog: '01-demarrage-projet', demoEndDialog: '01-demarrage-projet'
};

export function guideUrl(chapter = 'index') {
  return new URL(`guide/${uiLang()}/${chapter}.html`, location.href).toString();
}

export function openGuide(chapter) {
  const open = document.querySelector('dialog[open]');
  const ch = chapter || BY_DIALOG[open?.id] || 'index';
  log.info('ui.help', __('Guide d’utilisation ouvert : {page}', { page: ch }), { page: ch, lang: uiLang(), from: open?.id || undefined });
  window.open(guideUrl(ch), '_blank', 'noopener');
}

export function initHelp() {
  document.querySelector('#helpBtn')?.addEventListener('click', () => openGuide());
  document.querySelector('#guideBtn')?.addEventListener('click', () => { document.querySelector('#fileMenu').open = false; openGuide(); });
  /* F1 partout, même quand une fenêtre est ouverte (elle donne le chapitre) */
  document.addEventListener('keydown', e => { if (e.key === 'F1') { e.preventDefault(); openGuide(); } }, true);
}

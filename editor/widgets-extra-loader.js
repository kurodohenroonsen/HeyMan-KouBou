/* Charge les widgets complémentaires (cycle 5). */
import '../core/widgets-extra.js';
import { REGISTRY, isWidget } from '../core/widgets.js';
import { log } from './log.js';
import { __ } from '../core/ui-i18n.js';

/* Les widgets attendus : s'il en manque, un module du cœur n'a pas été chargé (fichier manquant ou ancien) */
const EXPECTED = ['icon-list', 'icon-box', 'quote', 'stats', 'accordion', 'gallery', 'video', 'map', 'social', 'form', 'card', 'pricing', 'site-logo', 'nav-menu', 'lang-switch'];
const missing = EXPECTED.filter(t => !REGISTRY[t]);
if (missing.length) log.warn('widgets.missing', __('Widgets supplémentaires absents : {list} (core/widgets-extra.js ancien ou incomplet)', { list: missing.join(', ') }), { missing });
else log.debug('widgets.extra', __('Widgets supplémentaires chargés : {n}', { n: EXPECTED.length }), { widgets: Object.keys(REGISTRY).filter(isWidget).length, extra: EXPECTED.length });

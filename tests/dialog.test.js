/* Cycle 33 (X8) : logique pure des fenêtres d'Atelier — focus initial, validation de askText, adresse d'un lien. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialFocusIndex, answerError, linkError } from '../core/dialog.js';

test('focus initial : autofocus, puis premier champ, puis bouton sûr, puis Fermer', () => {
  assert.equal(initialFocusIndex([{ kind: 'close' }, { kind: 'input' }, { kind: 'button' }]), 1);
  assert.equal(initialFocusIndex([{ kind: 'close' }, { kind: 'input' }, { kind: 'button', autofocus: true }]), 2);
  assert.equal(initialFocusIndex([{ kind: 'close' }, { kind: 'button' }, { kind: 'button', primary: true }]), 2);
  /* confirmation dangereuse : le focus va sur Annuler, jamais sur Supprimer */
  assert.equal(initialFocusIndex([{ kind: 'close' }, { kind: 'button' }, { kind: 'button', primary: true, danger: true }]), 1);
  assert.equal(initialFocusIndex([{ kind: 'close' }]), 0);
  assert.equal(initialFocusIndex([]), -1);
  /* un élément désactivé n'est jamais choisi */
  assert.equal(initialFocusIndex([{ kind: 'close' }, { kind: 'input', disabled: true }, { kind: 'button' }]), 2);
});

test('askText : réponse obligatoire et validation personnalisée', () => {
  assert.equal(answerError('', { required: true }), 'Ce champ est obligatoire.');
  assert.equal(answerError('   ', { required: true }), 'Ce champ est obligatoire.');
  assert.equal(answerError('Équipe', { required: true }), '');
  assert.equal(answerError('x', { validate: v => (v.length < 3 ? 'Trop court' : '') }), 'Trop court');
  assert.equal(answerError('xyz', { validate: v => (v.length < 3 ? 'Trop court' : '') }), '');
  assert.equal(answerError('', {}), '');
});

test('adresse d’un lien : schémas sûrs acceptés, javascript: et texte libre refusés', () => {
  for (const ok of ['https://exemple.be', 'http://exemple.be/a?b=1', 'mailto:info@exemple.be', 'tel:+3281000000', '#contact', '/agenda/', 'agenda/']) assert.equal(linkError(ok), '', ok);
  assert.match(linkError('javascript:alert(1)'), /non autorisée/);
  assert.match(linkError(' JavaScript:alert(1)'), /non autorisée/);
  assert.match(linkError('data:text/html,x'), /non autorisée/);
  assert.match(linkError(''), /obligatoire/);
  assert.match(linkError('https://'), /incomplète/);
  assert.match(linkError('mon site'), /espace/);
});


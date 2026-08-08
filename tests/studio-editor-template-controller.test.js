const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const templateController = require('../shared/studio-editor-template-controller.js');

test('template controller saves the active slide and finalizes persistence hooks', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Hero', nodes: [{ id: 'title', text: 'Hello' }] }]
  });
  const calls = [];
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    },
    triggerAutoSave() {
      calls.push(['save']);
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    },
    onTemplatesChanged(templates, nextDeck) {
      calls.push(['templates', templates.map((template) => template.id), nextDeck]);
    }
  });

  const result = controller.saveActiveSlide({ id: 'hero-template', name: 'Hero Template' });

  assert.equal(result.templates[0].name, 'Hero Template');
  assert.equal(result.templates[0].slide.title, 'Hero');
  assert.equal(sourceDeck.templates, undefined);
  assert.equal(calls[0][0], 'history');
  assert.equal(calls[0][1], false);
  assert.equal(calls[0][2], null);
  assert.equal(calls[0][3], result);
  assert.deepEqual(calls.slice(1, 3), [['save'], ['version', 'Auto: Saved Template "Hero Template"']]);
  assert.deepEqual(calls[3][0], 'templates');
  assert.deepEqual(calls[3][1], ['hero-template']);
});

test('template controller fails closed when the active slide or dependencies are unavailable', () => {
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] }),
    getActiveSlideId: () => ''
  });

  assert.equal(controller.saveActiveSlide({ name: 'Empty' }), null);
  assert.equal(templateController.createStudioEditorTemplateController().saveActiveSlide(), null);
});

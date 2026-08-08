const test = require('node:test');
const assert = require('node:assert/strict');
const persistence = require('../shared/studio-editor-persistence.js');
const persistenceState = require('../shared/studio-editor-persistence-state.js');
const persistenceController = require('../shared/studio-editor-persistence-controller.js');

test('persistence controller reuses the shared updater and preserves canonical normalization', () => {
  const stored = {};
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: persistenceState,
    resolveCanonicalDeck(value) {
      return value === canonicalDeck ? canonicalDeck : null;
    },
    normalizePlaybackState(value) {
      return value ? { activeSlideId: value.activeSlideId || '' } : null;
    },
    setPersistedDeckHtml(value) {
      stored.html = value;
    },
    setPersistedCanonicalDeck(value) {
      stored.canonicalDeck = value;
    },
    setPersistedPlaybackState(value) {
      stored.playbackState = value;
    }
  });

  assert.deepEqual(controller.update({
    cleanHtml: '<html></html>',
    canonicalDeck,
    playbackState: { activeSlideId: 'slide-2', extra: true }
  }), {
    cleanHtml: '<html></html>',
    canonicalDeck,
    playbackState: { activeSlideId: 'slide-2' }
  });
  assert.deepEqual(stored, {
    html: '<html></html>',
    canonicalDeck,
    playbackState: { activeSlideId: 'slide-2' }
  });
});

test('persistence controller fails closed when the shared state adapter is unavailable', () => {
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: null,
    persistenceStateApi: null
  });
  assert.deepEqual(controller.update({ cleanHtml: '<html></html>' }), {});
});

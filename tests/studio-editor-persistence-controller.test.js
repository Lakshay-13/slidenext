const test = require('node:test');
const assert = require('node:assert/strict');
const persistence = require('../shared/studio-editor-persistence.js');
const persistenceState = require('../shared/studio-editor-persistence-state.js');
const persistenceController = require('../shared/studio-editor-persistence-controller.js');
const canonicalDeckModel = require('../shared/canonical-deck.js');

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
  assert.deepEqual(controller.apply({ canonicalDeck: { slides: [] } }), {
    canonicalDeck: { slides: [] }
  });
});

test('persistence controller applies canonical state through the shared applier', () => {
  const stored = {};
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: persistenceState,
    currentPresentationUrl: '/presentations/deck/index.html',
    getCurrentPresentationUrl: () => '/presentations/deck/index.html',
    resolveCanonicalDeck(value) {
      return value === canonicalDeck ? canonicalDeck : null;
    },
    setPersistedCanonicalDeck(value) {
      stored.canonicalDeck = value;
    },
    setCurrentPresentationCanonicalDeck(value, presentationUrl) {
      stored.synced = { value, presentationUrl };
    }
  });

  assert.deepEqual(controller.apply({ canonicalDeck }), { canonicalDeck });
  assert.deepEqual(stored, {
    canonicalDeck,
    synced: {
      value: canonicalDeck,
      presentationUrl: '/presentations/deck/index.html'
    }
  });
});

test('persistence controller reuses canonical override and fallback adapters', () => {
  const canonicalDeck = canonicalDeckModel.createCanonicalDeck({ slides: [] });
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: persistenceState,
    isCanonicalDeck(value) {
      return canonicalDeckModel.isCanonicalDeck(value);
    }
  });

  assert.deepEqual(controller.resolveCanonicalDeckOverride(canonicalDeck), canonicalDeck);
  assert.equal(controller.resolveCanonicalDeckOverride({}), null);
  assert.deepEqual(controller.resolveFallbackCanonicalDeck({}, {
    buildCanonicalDeck: () => canonicalDeck
  }), canonicalDeck);
});

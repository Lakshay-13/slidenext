const test = require('node:test');
const assert = require('node:assert/strict');

const runtimeOptions = require('../shared/studio-editor-persistence-runtime-options.js');

test('persistence runtime options preserves injected dependencies and callbacks', () => {
  const dependencies = {
    controllerApi: {},
    persistenceApi: {},
    persistenceStateApi: {},
    deckPersistenceApi: {}
  };
  const callbacks = {
    resolveCanonicalDeck() {},
    normalizePlaybackState() {},
    setPersistedDeckHtml() {},
    setPersistedCanonicalDeck() {},
    setPersistedPlaybackState() {},
    currentPresentationUrl: '/presentations/example',
    getCurrentPresentationUrl() {},
    currentSessionToken: 4,
    getCurrentSessionToken() {},
    currentPresentationMetadata: {},
    getCurrentPresentationMetadata() {},
    resolveMergedPresentationPersistenceOptions() {},
    resolvePresentationPersistenceOptions() {},
    mergePresentationPersistenceOptions() {},
    createSessionReaderOptions() {},
    applyPersistedDeckState() {},
    createHandlerOptions() {},
    createVersionHandlerOptions() {},
    setCurrentPresentationCanonicalDeck() {},
    isCanonicalDeck() {},
    getPersistedDeckHtml() {},
    getPersistedCanonicalDeck() {},
    getPersistedPlaybackState() {},
    getSlides() {},
    slideIdAttr: 'data-slide-id',
    resolveFallbackActiveSlideId() {}
  };

  const result = runtimeOptions.createStudioEditorPersistenceRuntimeOptions({
    ...dependencies,
    ...callbacks
  });

  assert.deepEqual(result, {
    ...dependencies,
    ...callbacks
  });
});

test('persistence runtime options keeps explicit null dependencies as fail-closed overrides', () => {
  const result = runtimeOptions.createStudioEditorPersistenceRuntimeOptions({
    controllerApi: null,
    persistenceApi: null,
    persistenceStateApi: null,
    deckPersistenceApi: null
  });

  assert.equal(result.controllerApi, null);
  assert.equal(result.persistenceApi, null);
  assert.equal(result.persistenceStateApi, null);
  assert.equal(result.deckPersistenceApi, null);
});

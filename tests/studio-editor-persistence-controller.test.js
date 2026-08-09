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

test('persistence controller reads persisted baselines and resolves their content lazily', () => {
  let persistedDeckHtml = '<html><body></body></html>';
  const canonicalDeck = canonicalDeckModel.createCanonicalDeck({ slides: [] });
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: persistenceState,
    getPersistedDeckHtml: () => persistedDeckHtml,
    getPersistedCanonicalDeck: () => canonicalDeck,
    getPersistedPlaybackState: () => ({ activeSlideId: 'slide-1' })
  });

  assert.deepEqual(controller.read(), {
    cleanHtml: persistedDeckHtml,
    canonicalDeck,
    playbackState: { activeSlideId: 'slide-1' }
  });
  assert.equal(controller.resolveWithContent().cleanHtml, persistedDeckHtml);
  assert.equal(controller.resolvePersistedDeckStateWithContent().cleanHtml, persistedDeckHtml);

  persistedDeckHtml = '<html><body><main></main></body></html>';
  assert.equal(controller.read().cleanHtml, persistedDeckHtml);
});

test('persistence controller reads the persisted active slide id through the shared adapter', () => {
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: persistenceState,
    getPersistedPlaybackState: () => ({ activeSlideIds: ['slide-2', 'slide-1'] })
  });

  assert.equal(controller.getPersistedActiveSlideId(), 'slide-2');
  assert.equal(controller.getPersistedActiveSlideId({ activeSlideId: 'slide-3' }), 'slide-3');
});

test('persistence controller captures playback state through the shared adapter', () => {
  const iframeDoc = { id: 'iframe-doc' };
  const canonicalDeck = canonicalDeckModel.createCanonicalDeck({ slides: [] });
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: persistenceState,
    deckPersistenceApi: {
      capturePersistedDeckPlaybackStateWithFallback() {
        return { activeSlideIds: ['slide-2'] };
      }
    },
    getSlides: () => [],
    slideIdAttr: 'data-slide-id',
    resolveFallbackActiveSlideId: () => 'slide-1'
  });

  assert.deepEqual(controller.capturePersistedDeckPlaybackState(iframeDoc, {
    canonicalDeck
  }), {
    activeSlideIds: ['slide-2']
  });
});

test('persistence controller captures persistable deck state through supplied callbacks', () => {
  const canonicalDeck = canonicalDeckModel.createCanonicalDeck({ slides: [] });
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: persistenceState
  });

  assert.deepEqual(controller.capturePersistableDeckState({ id: 'iframe-doc' }, {
    canonicalDeck,
    captureBuildState: () => ({ cleanHtml: '<html></html>' }),
    buildCanonicalDeck: () => canonicalDeck,
    resolvePlaybackState: () => ({ activeSlideIds: ['slide-1'] })
  }), {
    cleanHtml: '<html></html>',
    canonicalDeck,
    playbackState: { activeSlideIds: ['slide-1'] }
  });
});

test('persistence controller resolves persistence state from document capture', () => {
  const calls = [];
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: persistenceState,
    getCurrentPresentationUrl: () => '/presentations/demo/index.html',
    capturePersistableDeckState: () => ({ cleanHtml: '<html></html>' })
  });

  const resolvedState = controller.resolvePersistenceStateFromCapture({ id: 'iframe-doc' }, {
    resolvePersistenceStateFromCapture(...args) {
      calls.push(args);
      return { cleanHtml: '<html></html>', canonicalDeck: null, playbackState: null };
    }
  });

  assert.deepEqual(resolvedState, {
    cleanHtml: '<html></html>',
    canonicalDeck: null,
    playbackState: null
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][2], '/presentations/demo/index.html');
});

test('persistence controller handles success through the shared handler adapter', () => {
  const calls = [];
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: persistenceState,
    getCurrentPresentationUrl: () => '/presentations/demo/index.html',
    createHandlerOptions: (options) => ({
      ...options,
      getCurrentPresentationUrl: () => '/presentations/demo/index.html',
      onSuccess: () => calls.push('success')
    })
  });

  const result = controller.handlePersistenceSuccess({
    presentationUrl: '/presentations/demo/index.html',
    data: { success: true },
    cleanHtml: '<html></html>'
  });

  assert.ok(result);
  assert.deepEqual(calls, ['success']);
});

test('persistence controller handles failure through the shared handler adapter', () => {
  const calls = [];
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: persistenceState,
    createHandlerOptions: (options) => ({
      ...options,
      getCurrentPresentationUrl: () => '/presentations/demo/index.html',
      onFailure: () => calls.push('failure')
    })
  });

  const result = controller.handlePersistenceFailure({
    presentationUrl: '/presentations/demo/index.html',
    error: 'save failed'
  });

  assert.equal(result, true);
  assert.deepEqual(calls, ['failure']);
});

test('persistence controller handles version success through the shared handler adapter', () => {
  const calls = [];
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: persistenceState,
    createVersionHandlerOptions: (options) => ({
      ...options,
      getCurrentPresentationUrl: () => '/presentations/demo/index.html',
      getCurrentSessionToken: () => 4,
      refreshVersionEntries: (presentationUrl, sessionToken) => {
        calls.push(['refresh', presentationUrl, sessionToken]);
      },
      onSuccess: () => calls.push(['success'])
    })
  });

  const result = controller.handleVersionPersistenceSuccess({
    presentationUrl: '/presentations/demo/index.html',
    sessionToken: 4,
    cleanHtml: '<html></html>'
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [
    ['success'],
    ['refresh', '/presentations/demo/index.html', 4]
  ]);
});

test('persistence controller resolves stale task state through the shared adapter', () => {
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: persistenceState,
    getCurrentPresentationUrl: () => '/presentations/demo/index.html',
    getCurrentSessionToken: () => 4
  });

  assert.equal(
    controller.isPersistenceTaskStale('/presentations/demo/index.html', 4),
    false
  );
  assert.equal(
    controller.isPersistenceTaskStale('/presentations/other/index.html', 4),
    true
  );
  assert.equal(
    controller.isPersistenceTaskStale('/presentations/demo/index.html', 5),
    true
  );
});

test('persistence controller runs current actions through the shared adapter', () => {
  const calls = [];
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: persistenceState,
    getCurrentPresentationUrl: () => '/presentations/demo/index.html',
    getCurrentSessionToken: () => 4
  });

  assert.equal(
    controller.runPersistenceActionIfCurrent(
      {
        presentationUrl: '/presentations/demo/index.html',
        sessionToken: 4
      },
      () => calls.push('current')
    ),
    true
  );
  assert.equal(
    controller.runPersistenceActionIfCurrent(
      {
        presentationUrl: '/presentations/demo/index.html',
        sessionToken: 5
      },
      () => calls.push('stale')
    ),
    false
  );
  assert.deepEqual(calls, ['current']);
});

test('persistence controller builds session-aware handler options through the shared adapter', () => {
  const persisted = [];
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: persistenceState,
    getCurrentPresentationUrl: () => '/presentations/demo/index.html',
    getCurrentSessionToken: () => 4,
    createSessionReaderOptions: (options) => ({
      getCurrentPresentationUrl: () => '/presentations/demo/index.html',
      getCurrentSessionToken: () => 4,
      ...options
    }),
    applyPersistedDeckState: (nextState) => persisted.push(nextState)
  });

  const handlerOptions = controller.createPersistenceHandlerOptions({
    onSuccess: 'success-sentinel'
  });

  assert.equal(handlerOptions.onSuccess, 'success-sentinel');
  handlerOptions.setPersistedHtml('<html></html>');
  assert.deepEqual(persisted, [{ cleanHtml: '<html></html>' }]);
});

test('persistence controller checks persisted HTML through the shared adapter', () => {
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: persistenceState,
    getPersistedDeckHtml: () => '<html></html>'
  });

  assert.equal(controller.isPersistedDeckHtml('<html></html>'), true);
  assert.equal(controller.isPersistedDeckHtml('<html><body></body></html>'), false);
});

test('persistence controller checks persisted save requests through the shared adapter', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: persistenceState,
    getPersistedDeckHtml: () => '<html></html>',
    getPersistedCanonicalDeck: () => canonicalDeck
  });
  const saveRequest = {
    htmlContent: '<html></html>',
    canonicalDeck
  };

  assert.equal(controller.isPersistedSaveRequest(saveRequest), true);
  assert.equal(controller.isPersistedSaveRequest({
    htmlContent: '<html><body></body></html>',
    canonicalDeck
  }), false);
});

test('persistence controller resolves reusable persisted HTML through the shared adapter', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: persistenceState
  });

  assert.equal(
    controller.resolveReusablePersistedHtml({
      cleanHtml: '<html></html>',
      canonicalDeck
    }, {
      canonicalDeck
    }),
    '<html></html>'
  );
});

test('persistence controller builds save requests through the shared adapter', () => {
  const doc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let adapterCreateCalls = 0;
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: {
      createStudioEditorSaveRequestBodyAdapter(options) {
        adapterCreateCalls += 1;
        assert.equal(typeof options.getPresentationUrl, 'function');
        return (nextDoc, cleanHtml, nextOptions) => ({
          doc: nextDoc,
          cleanHtml,
          canonicalDeck: nextOptions.resolveCanonicalDeck(canonicalDeck, nextDoc),
          presentationUrl: nextOptions.presentationUrl || options.getPresentationUrl()
        });
      }
    },
    getCurrentPresentationUrl: () => '/presentations/demo/index.html'
  });

  const resolveCanonicalDeck = (nextCanonicalDeck, nextDoc) => ({
    source: nextDoc,
    deck: nextCanonicalDeck
  });

  assert.deepEqual(controller.buildSaveRequestBody(doc, '<html></html>', {
    presentationUrl: '/presentations/custom/index.html',
    resolveCanonicalDeck
  }), {
    doc,
    cleanHtml: '<html></html>',
    canonicalDeck: {
      source: doc,
      deck: canonicalDeck
    },
    presentationUrl: '/presentations/custom/index.html'
  });
  controller.buildSaveRequestBody(doc, '<html>next</html>', { resolveCanonicalDeck });
  assert.equal(adapterCreateCalls, 1);
});

test('persistence controller sanitizes reusable persisted HTML through the shared adapter', () => {
  let adapterCreateCalls = 0;
  const controller = persistenceController.createStudioEditorPersistenceController({
    persistenceApi: persistence,
    persistenceStateApi: {
      createStudioEditorReusablePersistedHtmlSanitizerAdapter(options) {
        adapterCreateCalls += 1;
        assert.equal(options.persistenceApi, persistence);
        return (persistedHtml, nextOptions) => `${persistedHtml}:${nextOptions.id}`;
      }
    }
  });

  assert.equal(
    controller.sanitizeReusablePersistedHtml('<html>one</html>', { id: 1 }),
    '<html>one</html>:1'
  );
  assert.equal(
    controller.sanitizeReusablePersistedHtml('<html>two</html>', { id: 2 }),
    '<html>two</html>:2'
  );
  assert.equal(adapterCreateCalls, 1);
});

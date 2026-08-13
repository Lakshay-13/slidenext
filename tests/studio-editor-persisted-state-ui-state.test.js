const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const deckPersistence = require('../shared/deck-persistence.js');
const editorPersistence = require('../shared/studio-editor-persistence.js');
const editorPersistenceState = require('../shared/studio-editor-persistence-state.js');
const persistedStateFixture = require('./helpers/studio-persisted-state-fixture.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const source = persistedStateFixture.extractPersistedStateAwareFunctionSource(
    fileContent,
    startMarker,
    endMarker
  );
  assert.notEqual(source, null, `Missing function markers: ${startMarker}`);
  return source;
}

function loadResolveEditorStoredCanonicalDeck(fileContent, context) {
  context.SlideNextStudioEditorPersistenceState ??= editorPersistenceState;
  const resolveEditorStoredCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function resolveEditorStoredCanonicalDeck(metadata) {',
    '\n\n    function applyCurrentStudioPersistedDeckState('
  );
  vm.runInContext(resolveEditorStoredCanonicalDeckSource, context);
}

function loadGetCurrentEditorPersistedDeckState(fileContent, context) {
  context.SlideNextStudioEditorPersistence ??= editorPersistence;
  const helperSource = extractFunctionSource(
    fileContent,
    'function getCurrentEditorPersistedDeckState() {',
    '\n\n    function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadApplyCurrentStudioPersistedDeckState(fileContent, context) {
  context.SlideNextStudioEditorPersistence ??= editorPersistence;
  context.SlideNextStudioEditorPersistenceState ??= editorPersistenceState;
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistedDeckState(nextState = {}, options = {}) {',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );
  vm.runInContext(helperSource, context);
}

function loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context) {
  loadApplyCurrentStudioPersistedDeckState(fileContent, context);
}

test('getCurrentEditorPersistedDeckState returns the current persisted html, canonical deck, and playback baselines', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  const context = {
    lastPersistedDeckHtml: '<html>persisted</html>',
    lastPersistedCanonicalDeck: { id: 'persisted-deck' },
    persistedDeckPlaybackState: { activeSlideIds: ['slide-2'], slideCounterText: '2 / 4' }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.getCurrentEditorPersistedDeckState())),
    {
      cleanHtml: '<html>persisted</html>',
      canonicalDeck: { id: 'persisted-deck' },
      playbackState: { activeSlideIds: ['slide-2'], slideCounterText: '2 / 4' }
    }
  );
});

test('getCurrentEditorPersistedDeckState returns an empty state when shared persistence is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    lastPersistedDeckHtml: '<html>persisted</html>',
    lastPersistedCanonicalDeck: { id: 'persisted-deck' },
    persistedDeckPlaybackState: { activeSlideIds: ['slide-2'] },
    SlideNextStudioEditorPersistence: {}
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.getCurrentEditorPersistedDeckState())),
    {
      cleanHtml: '',
      canonicalDeck: null,
      playbackState: null
    }
  );
});

test('getCurrentEditorPersistedDeckState.resolveWithContent returns null without a shared content resolver', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    lastPersistedDeckHtml: '<html>persisted</html>',
    lastPersistedCanonicalDeck: null,
    persistedDeckPlaybackState: null,
    SlideNextStudioEditorPersistence: {}
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);

  assert.equal(
    context.getCurrentEditorPersistedDeckState.resolveWithContent({
      cleanHtml: '<html>input</html>',
      canonicalDeck: null,
      playbackState: null
    }),
    null
  );
});

test('getCurrentEditorPersistedDeckState does not use the snapshot helper when the shared reader is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  const persistedDeckState = {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: { id: 'persisted-deck' },
    playbackState: { activeSlideIds: ['slide-2'], slideCounterText: '2 / 4' }
  };
  const calls = [];
  const context = {
    lastPersistedDeckHtml: persistedDeckState.cleanHtml,
    lastPersistedCanonicalDeck: persistedDeckState.canonicalDeck,
    persistedDeckPlaybackState: persistedDeckState.playbackState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistedDeckStateSnapshot(options = {}) {
        throw new Error('createStudioPersistedDeckStateSnapshot should remain owned by the shared reader');
      }
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.getCurrentEditorPersistedDeckState())),
    {
      cleanHtml: '',
      canonicalDeck: null,
      playbackState: null
    }
  );
  assert.deepEqual(calls, []);
});

test('getCurrentEditorPersistedDeckState reuses the shared persisted state reader when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  const persistedDeckState = {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: { id: 'persisted-deck' },
    playbackState: { activeSlideIds: ['slide-2'], slideCounterText: '2 / 4' }
  };
  let delegatedArgs = null;
  let readerCreateCalls = 0;
  const context = {
    lastPersistedDeckHtml: persistedDeckState.cleanHtml,
    lastPersistedCanonicalDeck: persistedDeckState.canonicalDeck,
    persistedDeckPlaybackState: persistedDeckState.playbackState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistedDeckStateReader(options = {}) {
        readerCreateCalls += 1;
        delegatedArgs = options;
        return () => persistedDeckState;
      }
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.getCurrentEditorPersistedDeckState())),
    persistedDeckState
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.getCurrentEditorPersistedDeckState())),
    persistedDeckState
  );
  assert.equal(readerCreateCalls, 1);
  assert.equal(typeof delegatedArgs.getPersistedDeckHtml, 'function');
  assert.equal(typeof delegatedArgs.getPersistedCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.getPersistedPlaybackState, 'function');
});

test('getCurrentEditorPersistedDeckState.resolveWithContent fails closed without the shared reader', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  const calls = [];
  const persistedDeckState = {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: { id: 'persisted-deck' },
    playbackState: { activeSlideIds: ['slide-2'], slideCounterText: '2 / 4' }
  };
  const context = {
    lastPersistedDeckHtml: persistedDeckState.cleanHtml,
    lastPersistedCanonicalDeck: persistedDeckState.canonicalDeck,
    persistedDeckPlaybackState: persistedDeckState.playbackState,
    SlideNextStudioEditorPersistence: {
      resolveStudioPersistableDeckStateWithContent(nextPersistedDeckState) {
        throw new Error('resolveStudioPersistableDeckStateWithContent should remain owned by the shared reader');
      }
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);

  assert.equal(context.getCurrentEditorPersistedDeckState.resolveWithContent(persistedDeckState), null);
  assert.deepEqual(calls, []);
});

test('getCurrentEditorPersistedDeckState.resolveWithContent reuses the shared persisted state reader when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  const persistedDeckState = {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: { id: 'persisted-deck' },
    playbackState: { activeSlideIds: ['slide-2'], slideCounterText: '2 / 4' }
  };
  let delegatedArgs = null;
  let readerCreateCalls = 0;
  const context = {
    lastPersistedDeckHtml: persistedDeckState.cleanHtml,
    lastPersistedCanonicalDeck: persistedDeckState.canonicalDeck,
    persistedDeckPlaybackState: persistedDeckState.playbackState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistedDeckStateReader(options = {}) {
        readerCreateCalls += 1;
        delegatedArgs = options;
        const reader = () => persistedDeckState;
        reader.resolveWithContent = (nextPersistedDeckState = persistedDeckState) => nextPersistedDeckState;
        return reader;
      }
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.getCurrentEditorPersistedDeckState.resolveWithContent(persistedDeckState))),
    persistedDeckState
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.getCurrentEditorPersistedDeckState.resolveWithContent({
      ...persistedDeckState,
      cleanHtml: '<html>second</html>'
    }))),
    {
      ...persistedDeckState,
      cleanHtml: '<html>second</html>'
    }
  );
  assert.equal(readerCreateCalls, 1);
  assert.equal(typeof delegatedArgs.getPersistedDeckHtml, 'function');
  assert.equal(typeof delegatedArgs.getPersistedCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.getPersistedPlaybackState, 'function');
  assert.equal(delegatedArgs.resolvePersistedDeckStateSnapshotWithContent, null);
  assert.equal(delegatedArgs.resolvePersistableDeckStateWithContent, null);
});

test('getCurrentEditorPersistedDeckState delegates through the editor persistence-state reader adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const persistedDeckState = {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: { id: 'persisted-deck' },
    playbackState: { activeSlideIds: ['slide-2'] }
  };
  const readerCreateCalls = [];
  let contentResolverCreateCalls = 0;
  const context = {
    lastPersistedDeckHtml: persistedDeckState.cleanHtml,
    lastPersistedCanonicalDeck: persistedDeckState.canonicalDeck,
    persistedDeckPlaybackState: persistedDeckState.playbackState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistedDeckStateReader(options = {}) {
        readerCreateCalls.push(options);
        const reader = () => persistedDeckState;
        reader.resolveWithContent = (nextState) => ({ ...nextState, resolved: true });
        return reader;
      },
      createStudioPersistedDeckStateContentResolver(options = {}) {
        contentResolverCreateCalls += 1;
        assert.equal(typeof options.readPersistedDeckState, 'function');
        assert.equal(typeof options.resolveWithContent, 'function');
        return (nextState) => ({ ...nextState, contentResolved: true });
      }
    },
    SlideNextStudioEditorPersistenceState: editorPersistenceState
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);

  assert.deepEqual(context.getCurrentEditorPersistedDeckState(), persistedDeckState);
  assert.deepEqual(
    context.getCurrentEditorPersistedDeckState.resolveWithContent({ cleanHtml: '<html>input</html>' }),
    { cleanHtml: '<html>input</html>', resolved: true }
  );
  assert.deepEqual(
    context.resolveEditorPersistedDeckStateWithContent({ cleanHtml: '<html>input</html>' }),
    { cleanHtml: '<html>input</html>', contentResolved: true }
  );
  assert.equal(readerCreateCalls.length, 2);
  assert.equal(contentResolverCreateCalls, 1);
});

test('getCurrentEditorPersistedDeckState.resolveWithContent does not use the snapshot-with-content helper without the shared reader', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  const calls = [];
  const persistedDeckState = {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: { id: 'persisted-deck' },
    playbackState: { activeSlideIds: ['slide-2'], slideCounterText: '2 / 4' }
  };
  const context = {
    lastPersistedDeckHtml: persistedDeckState.cleanHtml,
    lastPersistedCanonicalDeck: persistedDeckState.canonicalDeck,
    persistedDeckPlaybackState: persistedDeckState.playbackState,
    SlideNextStudioEditorPersistence: {
      resolveStudioPersistedDeckStateSnapshotWithContent(options = {}) {
        throw new Error('resolveStudioPersistedDeckStateSnapshotWithContent should remain owned by the shared reader');
      },
      resolveStudioPersistableDeckStateWithContent() {
        throw new Error('resolveStudioPersistableDeckStateWithContent should remain owned by the shared reader');
      }
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);

  assert.equal(context.getCurrentEditorPersistedDeckState.resolveWithContent(persistedDeckState), null);
  assert.deepEqual(calls, []);
});

test('updateEditorPersistedDeckState updates only the provided persisted baseline fields', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateEditorPersistedDeckStateSource = extractFunctionSource(
    fileContent,
    'function updateEditorPersistedDeckState(nextState = {}) {',
    '\n\n    function getEditorHistoryStepAdapter() {'
  );

  const context = {
    lastPersistedDeckHtml: '<html>old</html>',
    lastPersistedCanonicalDeck: { id: 'old-deck' },
    persistedDeckPlaybackState: { activeSlideIds: ['slide-1'], slideCounterText: '1 / 2' },
    SlideNextDeckPersistence: deckPersistence,
    SlideNextStudioEditorPersistence: editorPersistence,
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck(metadata) {
        return metadata && metadata.canonicalDeck ? metadata.canonicalDeck : null;
      }
    },
    Object
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);
  vm.runInContext(updateEditorPersistedDeckStateSource, context);

  context.updateEditorPersistedDeckState({
    cleanHtml: '<html>new</html>',
    playbackState: { activeSlideId: 'slide-2' }
  });

  assert.equal(context.lastPersistedDeckHtml, '<html>new</html>');
  assert.deepEqual(context.lastPersistedCanonicalDeck, { id: 'old-deck' });
  assert.deepEqual(context.persistedDeckPlaybackState, { activeSlideIds: ['slide-2'], slideCounterText: '' });
});

test('updateEditorPersistedDeckState reuses the shared persisted-state updater builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateEditorPersistedDeckStateSource = extractFunctionSource(
    fileContent,
    'function updateEditorPersistedDeckState(nextState = {}) {',
    '\n\n    function getEditorHistoryStepAdapter() {'
  );

  let delegatedArgs = null;
  let updaterCreateCalls = 0;
  const context = {
    lastPersistedDeckHtml: '<html>old</html>',
    lastPersistedCanonicalDeck: { id: 'old-deck' },
    persistedDeckPlaybackState: { activeSlideIds: ['slide-1'], slideCounterText: '1 / 2' },
    SlideNextDeckPersistence: deckPersistence,
    SlideNextStudioEditorPersistence: {
      createStudioPersistedDeckStateUpdater(options = {}) {
        updaterCreateCalls += 1;
        delegatedArgs = options;
        return (nextState) => nextState;
      }
    }
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);
  vm.runInContext(updateEditorPersistedDeckStateSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.updateEditorPersistedDeckState({
      cleanHtml: '<html>new</html>'
    }))),
    {
      cleanHtml: '<html>new</html>'
    }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.updateEditorPersistedDeckState({
      cleanHtml: '<html>newer</html>'
    }))),
    {
      cleanHtml: '<html>newer</html>'
    }
  );
  assert.equal(updaterCreateCalls, 1);
  assert.equal(typeof delegatedArgs.resolveCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.normalizePlaybackState, 'function');
  assert.equal(typeof delegatedArgs.setPersistedDeckHtml, 'function');
  assert.equal(typeof delegatedArgs.setPersistedCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.setPersistedPlaybackState, 'function');
});

test('updateEditorPersistedDeckState does not mutate state when the shared updater is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateEditorPersistedDeckStateSource = extractFunctionSource(
    fileContent,
    'function updateEditorPersistedDeckState(nextState = {}) {',
    '\n\n    function getEditorHistoryStepAdapter() {'
  );

  const context = {
    lastPersistedDeckHtml: '<html>old</html>',
    lastPersistedCanonicalDeck: { id: 'old-deck' },
    persistedDeckPlaybackState: { activeSlideIds: ['slide-1'], slideCounterText: '1 / 2' },
    SlideNextDeckPersistence: deckPersistence
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);
  vm.runInContext(updateEditorPersistedDeckStateSource, context);

  const result = context.updateEditorPersistedDeckState({
    cleanHtml: '<html>new</html>'
  });
  assert.deepEqual(Object.keys(result), []);
  assert.equal(context.lastPersistedDeckHtml, '<html>old</html>');
  assert.deepEqual(context.lastPersistedCanonicalDeck, { id: 'old-deck' });
  assert.deepEqual(context.persistedDeckPlaybackState, { activeSlideIds: ['slide-1'], slideCounterText: '1 / 2' });
});

test('updateEditorPersistedDeckState normalizes the persisted canonical baseline through the shared deck context', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateEditorPersistedDeckStateSource = extractFunctionSource(
    fileContent,
    'function updateEditorPersistedDeckState(nextState = {}) {',
    '\n\n    function getEditorHistoryStepAdapter() {'
  );

  const rawCanonicalDeck = {
    metadata: {
      id: 'onboarding-presentation'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };
  const normalizedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };
  const calls = [];
  const context = {
    lastPersistedDeckHtml: '<html>old</html>',
    lastPersistedCanonicalDeck: null,
    persistedDeckPlaybackState: null,
    SlideNextDeckPersistence: deckPersistence,
    SlideNextStudioEditorPersistence: editorPersistence,
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck(metadata) {
        calls.push(metadata);
        return normalizedCanonicalDeck;
      }
    },
    Object
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);
  vm.runInContext(updateEditorPersistedDeckStateSource, context);

  context.updateEditorPersistedDeckState({
    canonicalDeck: rawCanonicalDeck
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].canonicalDeck, rawCanonicalDeck);
  assert.equal(context.lastPersistedCanonicalDeck, normalizedCanonicalDeck);
});

test('applyCurrentStudioPersistedDeckState updates persisted baselines together and syncs canonical metadata only when allowed', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateEditorPersistedDeckStateSource = extractFunctionSource(
    fileContent,
    'function updateEditorPersistedDeckState(nextState = {}) {',
    '\n\n    function getEditorHistoryStepAdapter() {'
  );

  const rawCanonicalDeck = {
    metadata: {
      id: 'onboarding-presentation'
    },
    slides: []
  };
  const normalizedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const metadataSyncCalls = [];
  const context = {
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    lastPersistedDeckHtml: '<html>old</html>',
    lastPersistedCanonicalDeck: null,
    persistedDeckPlaybackState: null,
    SlideNextDeckPersistence: deckPersistence,
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck(metadata) {
        return metadata && metadata.canonicalDeck ? normalizedCanonicalDeck : null;
      }
    },
    setCurrentPresentationCanonicalDeck(nextCanonicalDeck, presentationUrl) {
      metadataSyncCalls.push([nextCanonicalDeck, presentationUrl]);
    },
    Object
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);
  vm.runInContext(updateEditorPersistedDeckStateSource, context);
  loadApplyCurrentStudioPersistedDeckState(fileContent, context);

  const result = context.applyCurrentStudioPersistedDeckState({
    cleanHtml: '<html>new</html>',
    canonicalDeck: rawCanonicalDeck,
    playbackState: { activeSlideId: 'slide-3' }
  });

  context.applyCurrentStudioPersistedDeckState(
    { canonicalDeck: rawCanonicalDeck },
    {
      presentationUrl: '/presentations/custom/index.html',
      syncPresentationMetadata: false
    }
  );

  assert.deepEqual(result, {
    cleanHtml: '<html>new</html>',
    canonicalDeck: rawCanonicalDeck,
    playbackState: { activeSlideId: 'slide-3' }
  });
  assert.equal(context.lastPersistedDeckHtml, '<html>new</html>');
  assert.deepEqual(context.lastPersistedCanonicalDeck, normalizedCanonicalDeck);
  assert.deepEqual(context.persistedDeckPlaybackState, {
    activeSlideIds: ['slide-3'],
    slideCounterText: ''
  });
  assert.deepEqual(metadataSyncCalls, [[rawCanonicalDeck, '/presentations/onboarding-presentation/index.html']]);
});

test('applyCurrentStudioPersistedDeckState reuses the shared persisted-state applier builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  let applierCreateCalls = 0;
  const context = {
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    SlideNextStudioEditorPersistence: {
      createStudioPersistedDeckStateApplier(options = {}) {
        applierCreateCalls += 1;
        calls.push({
          currentPresentationUrl: options.currentPresentationUrl,
          hasUpdatePersistedDeckState: typeof options.updatePersistedDeckState === 'function',
          hasSetCurrentPresentationCanonicalDeck: typeof options.setCurrentPresentationCanonicalDeck === 'function'
        });
        return (nextState, nextOptions = {}) => ({
          nextState,
          nextOptions
        });
      }
    },
    updateEditorPersistedDeckState() {
      throw new Error('updateEditorPersistedDeckState should be delegated through the shared builder');
    },
    setCurrentPresentationCanonicalDeck() {
      throw new Error('setCurrentPresentationCanonicalDeck should be delegated through the shared builder');
    }
  };

  vm.createContext(context);
  loadApplyCurrentStudioPersistedDeckState(fileContent, context);

  const nextState = {
    canonicalDeck: { kind: 'slidenext.deck', schemaVersion: 1, slides: [] }
  };
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.applyCurrentStudioPersistedDeckState(nextState, {
      presentationUrl: '/presentations/custom/index.html'
    }))),
    {
      nextState,
      nextOptions: {
        presentationUrl: '/presentations/custom/index.html'
      }
    }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.applyCurrentStudioPersistedDeckState(nextState, {
      presentationUrl: '/presentations/second/index.html'
    }))),
    {
      nextState,
      nextOptions: {
        presentationUrl: '/presentations/second/index.html'
      }
    }
  );
  assert.equal(applierCreateCalls, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    hasUpdatePersistedDeckState: true,
    hasSetCurrentPresentationCanonicalDeck: true
  }]);
});

test('applyCurrentStudioPersistedDeckState returns the state without partial writes when the shared applier is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const nextState = {
    canonicalDeck: { kind: 'slidenext.deck', schemaVersion: 1, slides: [] }
  };
  const context = {
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    SlideNextStudioEditorPersistence: {},
    updateEditorPersistedDeckState() {
      throw new Error('updateEditorPersistedDeckState should not run without the shared applier');
    },
    setCurrentPresentationCanonicalDeck() {
      throw new Error('setCurrentPresentationCanonicalDeck should not run without the shared applier');
    }
  };

  vm.createContext(context);
  loadApplyCurrentStudioPersistedDeckState(fileContent, context);

  assert.equal(context.applyCurrentStudioPersistedDeckState(nextState), nextState);
});

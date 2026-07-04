const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const deckPersistence = require('../shared/deck-persistence.js');
const editorPersistence = require('../shared/studio-editor-persistence.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadResolveEditorStoredCanonicalDeck(fileContent, context) {
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

test('getCurrentEditorPersistedDeckState reuses the shared persisted snapshot helper when available', () => {
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
        calls.push(options);
        return persistedDeckState;
      }
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.getCurrentEditorPersistedDeckState())),
    persistedDeckState
  );
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    persistedDeckHtml: '<html>persisted</html>',
    persistedCanonicalDeck: { id: 'persisted-deck' },
    persistedPlaybackState: { activeSlideIds: ['slide-2'], slideCounterText: '2 / 4' }
  }]);
});

test('getCurrentEditorPersistedDeckState reuses the shared persisted state reader when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  const persistedDeckState = {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: { id: 'persisted-deck' },
    playbackState: { activeSlideIds: ['slide-2'], slideCounterText: '2 / 4' }
  };
  let delegatedArgs = null;
  const context = {
    lastPersistedDeckHtml: persistedDeckState.cleanHtml,
    lastPersistedCanonicalDeck: persistedDeckState.canonicalDeck,
    persistedDeckPlaybackState: persistedDeckState.playbackState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistedDeckStateReader(options = {}) {
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
  assert.equal(typeof delegatedArgs.getPersistedDeckHtml, 'function');
  assert.equal(typeof delegatedArgs.getPersistedCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.getPersistedPlaybackState, 'function');
});

test('getCurrentEditorPersistedDeckState.resolveWithContent prefers the shared persisted-content resolver when available', () => {
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
        calls.push(nextPersistedDeckState);
        return nextPersistedDeckState;
      }
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.getCurrentEditorPersistedDeckState.resolveWithContent())),
    persistedDeckState
  );
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [persistedDeckState]);
});

test('getCurrentEditorPersistedDeckState.resolveWithContent reuses the shared persisted state reader when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  const persistedDeckState = {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: { id: 'persisted-deck' },
    playbackState: { activeSlideIds: ['slide-2'], slideCounterText: '2 / 4' }
  };
  let delegatedArgs = null;
  const context = {
    lastPersistedDeckHtml: persistedDeckState.cleanHtml,
    lastPersistedCanonicalDeck: persistedDeckState.canonicalDeck,
    persistedDeckPlaybackState: persistedDeckState.playbackState,
    SlideNextStudioEditorPersistence: {
      createStudioPersistedDeckStateReader(options = {}) {
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
    JSON.parse(JSON.stringify(context.getCurrentEditorPersistedDeckState.resolveWithContent())),
    persistedDeckState
  );
  assert.equal(typeof delegatedArgs.getPersistedDeckHtml, 'function');
  assert.equal(typeof delegatedArgs.getPersistedCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.getPersistedPlaybackState, 'function');
  assert.equal(delegatedArgs.resolvePersistedDeckStateSnapshotWithContent, null);
  assert.equal(delegatedArgs.resolvePersistableDeckStateWithContent, null);
});

test('getCurrentEditorPersistedDeckState.resolveWithContent reuses the shared persisted snapshot-with-content helper when available', () => {
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
        calls.push(options);
        return options.persistedDeckState;
      },
      resolveStudioPersistableDeckStateWithContent() {
        throw new Error('resolveStudioPersistableDeckStateWithContent should not run when the snapshot helper is available');
      }
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.getCurrentEditorPersistedDeckState.resolveWithContent())),
    persistedDeckState
  );
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    persistedDeckState
  }]);
});

test('updateEditorPersistedDeckState updates only the provided persisted baseline fields', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateEditorPersistedDeckStateSource = extractFunctionSource(
    fileContent,
    'function updateEditorPersistedDeckState(nextState = {}) {',
    '\n\n    function captureState() {'
  );

  const context = {
    lastPersistedDeckHtml: '<html>old</html>',
    lastPersistedCanonicalDeck: { id: 'old-deck' },
    persistedDeckPlaybackState: { activeSlideIds: ['slide-1'], slideCounterText: '1 / 2' },
    SlideNextDeckPersistence: deckPersistence,
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
    '\n\n    function captureState() {'
  );

  let delegatedArgs = null;
  const context = {
    lastPersistedDeckHtml: '<html>old</html>',
    lastPersistedCanonicalDeck: { id: 'old-deck' },
    persistedDeckPlaybackState: { activeSlideIds: ['slide-1'], slideCounterText: '1 / 2' },
    SlideNextDeckPersistence: deckPersistence,
    SlideNextStudioEditorPersistence: {
      createStudioPersistedDeckStateUpdater(options = {}) {
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
  assert.equal(typeof delegatedArgs.resolveCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.normalizePlaybackState, 'function');
  assert.equal(typeof delegatedArgs.setPersistedDeckHtml, 'function');
  assert.equal(typeof delegatedArgs.setPersistedCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.setPersistedPlaybackState, 'function');
});

test('updateEditorPersistedDeckState reuses the shared persisted-baseline updater when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateEditorPersistedDeckStateSource = extractFunctionSource(
    fileContent,
    'function updateEditorPersistedDeckState(nextState = {}) {',
    '\n\n    function captureState() {'
  );

  const calls = [];
  const context = {
    lastPersistedDeckHtml: '<html>old</html>',
    lastPersistedCanonicalDeck: { id: 'old-deck' },
    persistedDeckPlaybackState: { activeSlideIds: ['slide-1'], slideCounterText: '1 / 2' },
    SlideNextDeckPersistence: deckPersistence,
    SlideNextStudioEditorPersistence: {
      updateStudioPersistedDeckState(nextState, options = {}) {
        calls.push({
          nextState,
          hasResolveCanonicalDeck: typeof options.resolveCanonicalDeck === 'function',
          hasNormalizePlaybackState: typeof options.normalizePlaybackState === 'function',
          hasSetPersistedDeckHtml: typeof options.setPersistedDeckHtml === 'function',
          hasSetPersistedCanonicalDeck: typeof options.setPersistedCanonicalDeck === 'function',
          hasSetPersistedPlaybackState: typeof options.setPersistedPlaybackState === 'function'
        });
      }
    }
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);
  vm.runInContext(updateEditorPersistedDeckStateSource, context);

  context.updateEditorPersistedDeckState({
    cleanHtml: '<html>new</html>'
  });

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    nextState: {
      cleanHtml: '<html>new</html>'
    },
    hasResolveCanonicalDeck: true,
    hasNormalizePlaybackState: true,
    hasSetPersistedDeckHtml: true,
    hasSetPersistedCanonicalDeck: true,
    hasSetPersistedPlaybackState: true
  }]);
});

test('updateEditorPersistedDeckState normalizes the persisted canonical baseline through the shared deck context', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateEditorPersistedDeckStateSource = extractFunctionSource(
    fileContent,
    'function updateEditorPersistedDeckState(nextState = {}) {',
    '\n\n    function captureState() {'
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
    '\n\n    function captureState() {'
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

test('applyCurrentStudioPersistedDeckState reuses the shared persisted-state helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    SlideNextStudioEditorPersistence: {
      applyStudioPersistedDeckState(nextState, options = {}) {
        calls.push({
          nextState,
          currentPresentationUrl: options.currentPresentationUrl,
          hasUpdatePersistedDeckState: typeof options.updatePersistedDeckState === 'function',
          hasSetCurrentPresentationCanonicalDeck: typeof options.setCurrentPresentationCanonicalDeck === 'function'
        });
        return nextState;
      }
    },
    updateEditorPersistedDeckState() {
      throw new Error('updateEditorPersistedDeckState should be delegated through the shared helper');
    },
    setCurrentPresentationCanonicalDeck() {
      throw new Error('setCurrentPresentationCanonicalDeck should be delegated through the shared helper');
    }
  };

  vm.createContext(context);
  loadApplyCurrentStudioPersistedDeckState(fileContent, context);

  const nextState = {
    canonicalDeck: { kind: 'slidenext.deck', schemaVersion: 1, slides: [] }
  };
  assert.equal(context.applyCurrentStudioPersistedDeckState(nextState), nextState);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    nextState,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    hasUpdatePersistedDeckState: true,
    hasSetCurrentPresentationCanonicalDeck: true
  }]);
});

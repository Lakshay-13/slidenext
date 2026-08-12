const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const editorEvents = require('../shared/studio-editor-events.js');
const frameInteractions = require('../shared/studio-editor-frame-interactions.js');
const editorPersistence = require('../shared/studio-editor-persistence.js');
const themeController = require('../shared/studio-editor-theme-controller.js');
const themeView = require('../shared/studio-theme-view.js');
const toolbarAccessorsApi = require('../shared/studio-editor-toolbar-accessors.js');
const sessionTokenFixture = require('./helpers/studio-session-token-fixture.js');
const presentationUrlFixture = require('./helpers/studio-presentation-url-fixture.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  const frameInitializationErrorStart = fileContent.indexOf(
    'function reportStudioFrameInitializationError() {'
  );
  const frameInitializationErrorEnd = fileContent.indexOf(
    '\n\n    async function retryStudioEditorFrame()',
    frameInitializationErrorStart
  );
  assert.notEqual(frameInitializationErrorStart, -1, 'Missing frame initialization error helper');
  assert.notEqual(frameInitializationErrorEnd, -1, 'Missing frame initialization error helper end');
  return `${sessionTokenFixture.getStudioSessionTokenFixtureSource()}\n${presentationUrlFixture.getStudioPresentationUrlFixtureSource()}\n${fileContent.slice(frameInitializationErrorStart, frameInitializationErrorEnd)}\n${fileContent.slice(start, end)}`;
}

function loadCaptureEditorPersistableDeckState(fileContent, context) {
  context.SlideNextStudioEditorPersistence ??= editorPersistence;
  loadCaptureEditorPersistableDeckBuildState(fileContent, context);
  if (typeof context.resolveEditorCanonicalDeckOverride !== 'function') {
    const resolveEditorCanonicalDeckOverrideSource = extractFunctionSource(
      fileContent,
      'function resolveEditorCanonicalDeckOverride(canonicalDeck = null, options = {}) {',
      '\n\n    function getEditorCanonicalDeckValidator() {'
    );
    vm.runInContext(resolveEditorCanonicalDeckOverrideSource, context);
  }
  loadResolveEditorCapturedPersistableDeckState(fileContent, context);
  const captureEditorPersistableDeckStateSource = extractFunctionSource(
    fileContent,
    'function captureEditorPersistableDeckState(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );
  vm.runInContext(captureEditorPersistableDeckStateSource, context);
}

function loadCaptureEditorPersistableDeckBuildState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function captureEditorPersistableDeckBuildState(doc = getIframeDoc(), buildOptions = {}) {',
    '\n\n    function captureEditorPersistableDeckState(doc = getIframeDoc()) {'
  );
  vm.runInContext(helperSource, context);
}

function loadResolveEditorCapturedPersistableDeckState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveEditorCapturedPersistableDeckState(cleanHtml = \'\', options = {}) {',
    '\n\n    function captureEditorPersistableDeckState(doc = getIframeDoc()) {'
  );
  vm.runInContext(helperSource, context);
}

function attachFrameInteractions(context) {
  context.studioEditorFrameInteractions = frameInteractions.createStudioEditorFrameInteractions({
    eventsApi: context.SlideNextStudioEditorEvents || null,
    inlineTextEditApi: context.SlideNextStudioEditorInlineEdit || null,
    getIsDragging: () => context.isDraggingElement,
    getSelectedElements: () => context.selectedElements || [],
    canMutateDeck: () => true
  });
  return context;
}

test('captureEditorPersistableDeckState returns persisted html, canonical deck, and playback state from one capture', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-1'],
    slideCounterText: '1 / 2'
  };
  let buildEditorCanonicalDeckCalls = 0;
  let capturePersistedDeckPlaybackStateCalls = 0;

  const context = {
    buildPersistableDeckHtml(doc, options = {}) {
      assert.equal(doc, iframeDoc);
      assert.equal(typeof options.onCanonicalDeckResolved, 'function');
      assert.equal(typeof options.onPlaybackStateResolved, 'function');
      options.onCanonicalDeckResolved(canonicalDeck);
      options.onPlaybackStateResolved(playbackState);
      return '<html>persisted</html>';
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return canonicalDeck;
    },
    capturePersistedDeckPlaybackState(doc) {
      capturePersistedDeckPlaybackStateCalls += 1;
      assert.equal(doc, iframeDoc);
      return playbackState;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);

  const persistedDeckState = JSON.parse(JSON.stringify(context.captureEditorPersistableDeckState()));
  assert.deepEqual(persistedDeckState, {
    cleanHtml: '<html>persisted</html>',
    playbackState,
    canonicalDeck
  });
  assert.equal(buildEditorCanonicalDeckCalls, 0);
  assert.equal(capturePersistedDeckPlaybackStateCalls, 0);
});

test('captureEditorPersistableDeckBuildState captures and forwards canonical deck and playback callbacks', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-1'],
    slideCounterText: '1 / 2'
  };
  let reportedCanonicalDeck = null;
  let reportedPlaybackState = null;

  const context = {
    buildPersistableDeckHtml(doc, options = {}) {
      assert.equal(doc, iframeDoc);
      options.onCanonicalDeckResolved(canonicalDeck);
      options.onPlaybackStateResolved(playbackState);
      return '<html>persisted</html>';
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckBuildState(fileContent, context);

  const capturedBuildState = JSON.parse(JSON.stringify(context.captureEditorPersistableDeckBuildState(iframeDoc, {
    onCanonicalDeckResolved(deck) {
      reportedCanonicalDeck = deck;
    },
    onPlaybackStateResolved(nextPlaybackState) {
      reportedPlaybackState = nextPlaybackState;
    }
  })));

  assert.deepEqual(capturedBuildState, {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck,
    playbackState
  });
  assert.equal(reportedCanonicalDeck, canonicalDeck);
  assert.equal(reportedPlaybackState, playbackState);
});

test('captureEditorPersistableDeckBuildState delegates through the shared persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-1'],
    slideCounterText: '1 / 2'
  };
  let delegatedArgs = null;

  const context = {
    SlideNextStudioEditorPersistence: {
      captureStudioPersistableDeckBuildState(doc, options = {}) {
        delegatedArgs = {
          doc,
          canonicalDeck: options.canonicalDeck,
          buildPersistableDeckHtml: options.buildPersistableDeckHtml,
          onCanonicalDeckResolved: options.onCanonicalDeckResolved,
          onPlaybackStateResolved: options.onPlaybackStateResolved
        };
        return {
          cleanHtml: '<html>persisted</html>',
          canonicalDeck,
          playbackState
        };
      }
    },
    buildPersistableDeckHtml() {
      throw new Error('buildPersistableDeckHtml should be delegated through the shared persistence helper');
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckBuildState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.captureEditorPersistableDeckBuildState(iframeDoc, { canonicalDeck }))),
    {
      cleanHtml: '<html>persisted</html>',
      canonicalDeck,
      playbackState
    }
  );
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.canonicalDeck, canonicalDeck);
  assert.equal(delegatedArgs.buildPersistableDeckHtml, context.buildPersistableDeckHtml);
  assert.equal(typeof delegatedArgs.onCanonicalDeckResolved, 'undefined');
  assert.equal(typeof delegatedArgs.onPlaybackStateResolved, 'undefined');
});

test('resolveEditorCapturedPersistableDeckState delegates capture-state fallback resolution through the shared persistence helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let buildCanonicalDeckCalls = 0;
  let resolvePlaybackStateCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence
  };

  vm.createContext(context);
  loadResolveEditorCapturedPersistableDeckState(fileContent, context);

  const capturedDeckState = JSON.parse(JSON.stringify(context.resolveEditorCapturedPersistableDeckState('<html>persisted</html>', {
    buildCanonicalDeck() {
      buildCanonicalDeckCalls += 1;
      return canonicalDeck;
    },
    resolvePlaybackState(nextCanonicalDeck) {
      resolvePlaybackStateCalls += 1;
      assert.equal(nextCanonicalDeck, canonicalDeck);
      return {
        activeSlideIds: ['slide-1'],
        slideCounterText: '1 / 1'
      };
    }
  })));

  assert.deepEqual(capturedDeckState, {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck,
    playbackState: {
      activeSlideIds: ['slide-1'],
      slideCounterText: '1 / 1'
    }
  });
  assert.equal(buildCanonicalDeckCalls, 1);
  assert.equal(resolvePlaybackStateCalls, 1);
});

test('captureEditorPersistableDeckState reuses a resolved canonical deck when playback fallback runs after html capture', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] }
    ]
  };
  let buildEditorCanonicalDeckCalls = 0;
  let capturePersistedDeckPlaybackStateCalls = 0;

  const context = {
    buildPersistableDeckHtml(doc, options = {}) {
      assert.equal(doc, iframeDoc);
      assert.equal(typeof options.onCanonicalDeckResolved, 'function');
      assert.equal(typeof options.onPlaybackStateResolved, 'function');
      options.onCanonicalDeckResolved(canonicalDeck);
      return '<html>persisted</html>';
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return canonicalDeck;
    },
    capturePersistedDeckPlaybackState(doc, nextCanonicalDeck) {
      capturePersistedDeckPlaybackStateCalls += 1;
      assert.equal(doc, iframeDoc);
      assert.equal(nextCanonicalDeck, canonicalDeck);
      return {
        activeSlideIds: ['slide-1'],
        slideCounterText: '1 / 1'
      };
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);

  const persistedDeckState = JSON.parse(JSON.stringify(context.captureEditorPersistableDeckState()));
  assert.deepEqual(persistedDeckState, {
    cleanHtml: '<html>persisted</html>',
    playbackState: {
      activeSlideIds: ['slide-1'],
      slideCounterText: '1 / 1'
    },
    canonicalDeck
  });
  assert.equal(buildEditorCanonicalDeckCalls, 0);
  assert.equal(capturePersistedDeckPlaybackStateCalls, 1);
});

test('captureEditorPersistableDeckState delegates final capture-state resolution to the shared editor persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] }
    ]
  };
  const playbackState = {
    activeSlideIds: ['slide-1'],
    slideCounterText: '1 / 1'
  };
  let delegatedArgs = null;

  const context = {
    resolveEditorCanonicalDeckOverride(nextCanonicalDeck, options = {}) {
      return nextCanonicalDeck || options.buildCanonicalDeck();
    },
    SlideNextStudioEditorPersistence: {
      resolveStudioCapturedPersistableDeckState(cleanHtml, options = {}) {
        delegatedArgs = {
          cleanHtml,
          options,
          canonicalDeck: options.buildCanonicalDeck(),
          playbackState: options.resolvePlaybackState(canonicalDeck)
        };
        return {
          cleanHtml,
          canonicalDeck: delegatedArgs.canonicalDeck,
          playbackState: delegatedArgs.playbackState
        };
      }
    },
    buildPersistableDeckHtml(doc, options = {}) {
      assert.equal(doc, iframeDoc);
      assert.equal(typeof options.onCanonicalDeckResolved, 'function');
      assert.equal(typeof options.onPlaybackStateResolved, 'function');
      return '<html>persisted</html>';
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    capturePersistedDeckPlaybackState(doc, nextCanonicalDeck) {
      assert.equal(doc, iframeDoc);
      assert.equal(nextCanonicalDeck, canonicalDeck);
      return playbackState;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);

  const persistedDeckState = JSON.parse(JSON.stringify(context.captureEditorPersistableDeckState()));
  assert.deepEqual(persistedDeckState, {
    cleanHtml: '<html>persisted</html>',
    playbackState,
    canonicalDeck
  });
  assert.equal(delegatedArgs.cleanHtml, '<html>persisted</html>');
  assert.equal(typeof delegatedArgs.options.buildCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.options.resolvePlaybackState, 'function');
});

test('captureEditorPersistableDeckState delegates capture orchestration through the shared editor persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] }
    ]
  };
  const playbackState = {
    activeSlideIds: ['slide-1'],
    slideCounterText: '1 / 1'
  };
  let delegatedArgs = null;
  let canonicalBuildOptions = null;

  const context = {
    resolveEditorCanonicalDeckOverride(nextCanonicalDeck, options = {}) {
      return nextCanonicalDeck || options.buildCanonicalDeck();
    },
    SlideNextStudioEditorPersistence: {
      captureStudioPersistableDeckState(doc, options = {}) {
        delegatedArgs = {
          doc,
          canonicalDeck: options.canonicalDeck,
          captureBuildState: options.captureBuildState,
          buildCanonicalDeck: options.buildCanonicalDeck,
          resolvePlaybackState: options.resolvePlaybackState
        };
        return {
          cleanHtml: '<html>persisted</html>',
          canonicalDeck: options.buildCanonicalDeck(),
          playbackState: options.resolvePlaybackState(canonicalDeck)
        };
      }
    },
    captureEditorPersistableDeckBuildState() {
      throw new Error('captureEditorPersistableDeckBuildState should be delegated through the shared persistence helper');
    },
    buildEditorCanonicalDeck(nextDoc, options) {
      assert.equal(nextDoc, iframeDoc);
      canonicalBuildOptions = options;
      return canonicalDeck;
    },
    capturePersistedDeckPlaybackState(doc, nextCanonicalDeck) {
      assert.equal(doc, iframeDoc);
      assert.equal(nextCanonicalDeck, canonicalDeck);
      return playbackState;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);

  const persistedDeckState = JSON.parse(JSON.stringify(context.captureEditorPersistableDeckState()));
  assert.deepEqual(persistedDeckState, {
    cleanHtml: '<html>persisted</html>',
    playbackState,
    canonicalDeck
  });
  assert.deepEqual(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.canonicalDeck, null);
  assert.equal(typeof delegatedArgs.captureBuildState, 'function');
  assert.equal(typeof delegatedArgs.buildCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.resolvePlaybackState, 'function');
  assert.equal(canonicalBuildOptions, undefined);
});

test('captureEditorPersistableDeckState creates the shared capture adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let adapterCreateCalls = 0;
  const capturedDocs = [];
  const context = {
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorPersistableDeckStateCapturerAdapter(options) {
        adapterCreateCalls += 1;
        return (doc, captureOptions) => {
          capturedDocs.push([doc, captureOptions]);
          return {
            cleanHtml: '<html>persisted</html>',
            canonicalDeck: captureOptions.buildCanonicalDeck(),
            playbackState: captureOptions.resolvePlaybackState(canonicalDeck)
          };
        };
      }
    },
    resolveEditorCanonicalDeckOverride(nextCanonicalDeck, options = {}) {
      return nextCanonicalDeck || options.buildCanonicalDeck();
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    capturePersistedDeckPlaybackState(doc, nextCanonicalDeck) {
      assert.equal(doc, iframeDoc);
      assert.equal(nextCanonicalDeck, canonicalDeck);
      return { activeSlideIds: ['slide-1'] };
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);

  context.captureEditorPersistableDeckState();
  context.captureEditorPersistableDeckState();

  assert.equal(adapterCreateCalls, 1);
  assert.equal(capturedDocs.length, 2);
  assert.equal(capturedDocs[0][0], iframeDoc);
  assert.equal(capturedDocs[1][0], iframeDoc);
});

test('captureEditorPersistableDeckState reuses the local captured persistable deck-state resolver when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-1'],
    slideCounterText: '1 / 2'
  };
  const calls = [];
  const context = {
    SlideNextStudioEditorPersistence: {},
    __resolveEditorCapturedPersistableDeckState(cleanHtml, options = {}) {
      calls.push(['resolveEditorCapturedPersistableDeckState', cleanHtml, options]);
      return {
        cleanHtml,
        canonicalDeck,
        playbackState
      };
    },
    __captureEditorPersistableDeckBuildState(doc, buildOptions = {}) {
      calls.push(['captureEditorPersistableDeckBuildState', doc, buildOptions]);
      return {
        cleanHtml: '<html>persisted</html>',
        canonicalDeck: null,
        playbackState: undefined
      };
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run directly when helper delegation succeeds');
    },
    capturePersistedDeckPlaybackState() {
      throw new Error('capturePersistedDeckPlaybackState should not run directly when helper delegation succeeds');
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  vm.runInContext('captureEditorPersistableDeckBuildState = __captureEditorPersistableDeckBuildState;', context);
  vm.runInContext('resolveEditorCapturedPersistableDeckState = __resolveEditorCapturedPersistableDeckState;', context);

  const persistedDeckState = JSON.parse(JSON.stringify(context.captureEditorPersistableDeckState()));
  assert.deepEqual(persistedDeckState, {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck,
    playbackState
  });
  assert.deepEqual(calls.map(([name]) => name), [
    'captureEditorPersistableDeckBuildState',
    'resolveEditorCapturedPersistableDeckState'
  ]);
  assert.equal(calls[0][1], iframeDoc);
  assert.equal(calls[1][1], '<html>persisted</html>');
  assert.equal(typeof calls[1][2].buildCanonicalDeck, 'function');
  assert.equal(typeof calls[1][2].resolvePlaybackState, 'function');
});

test('captureEditorPersistableDeckState reuses the local persistable build-state capture helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-1'],
    slideCounterText: '1 / 2'
  };
  const calls = [];
  const context = {
    __captureEditorPersistableDeckBuildState(doc, buildOptions = {}) {
      calls.push(['captureEditorPersistableDeckBuildState', doc, buildOptions]);
      return {
        cleanHtml: '<html>persisted</html>',
        canonicalDeck,
        playbackState
      };
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run when helper provides canonical deck');
    },
    capturePersistedDeckPlaybackState() {
      throw new Error('capturePersistedDeckPlaybackState should not run when helper provides playback state');
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  vm.runInContext('captureEditorPersistableDeckBuildState = __captureEditorPersistableDeckBuildState;', context);

  const persistedDeckState = JSON.parse(JSON.stringify(context.captureEditorPersistableDeckState()));
  assert.deepEqual(persistedDeckState, {
    cleanHtml: '<html>persisted</html>',
    playbackState,
    canonicalDeck
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], iframeDoc);
  assert.equal(calls[0][2].canonicalDeck, null);
});

test('captureEditorPersistableDeckState honors a provided canonical deck override when html capture does not report one', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] }
    ]
  };
  const playbackState = {
    activeSlideIds: ['slide-1'],
    slideCounterText: '1 / 1'
  };
  let delegatedArgs = null;
  let buildEditorCanonicalDeckCalls = 0;

  const context = {
    resolveEditorCanonicalDeckOverride(nextCanonicalDeck, options = {}) {
      delegatedArgs = {
        canonicalDeck: nextCanonicalDeck,
        buildCanonicalDeck: options.buildCanonicalDeck
      };
      return canonicalDeck;
    },
    buildPersistableDeckHtml(doc, options = {}) {
      assert.equal(doc, iframeDoc);
      assert.equal(options.canonicalDeck, canonicalDeck);
      return '<html>persisted</html>';
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: [{ id: 'slide-fallback', nodes: [] }]
      };
    },
    capturePersistedDeckPlaybackState(doc, nextCanonicalDeck) {
      assert.equal(doc, iframeDoc);
      assert.equal(nextCanonicalDeck, canonicalDeck);
      return playbackState;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);

  const persistedDeckState = JSON.parse(JSON.stringify(
    context.captureEditorPersistableDeckState(iframeDoc, {
      canonicalDeck
    })
  ));
  assert.deepEqual(persistedDeckState, {
    cleanHtml: '<html>persisted</html>',
    playbackState,
    canonicalDeck
  });
  assert.equal(delegatedArgs.canonicalDeck, canonicalDeck);
  assert.equal(typeof delegatedArgs.buildCanonicalDeck, 'function');
  assert.equal(buildEditorCanonicalDeckCalls, 0);
});

test('captureEditorPersistableDeckState reuses the local canonical override helper when html capture does not report one', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] }
    ]
  };
  const playbackState = {
    activeSlideIds: ['slide-1'],
    slideCounterText: '1 / 1'
  };
  const calls = [];

  const context = {
    __resolveEditorCanonicalDeckOverride(nextCanonicalDeck, options = {}) {
      calls.push(['resolveEditorCanonicalDeckOverride', nextCanonicalDeck, options.buildCanonicalDeck]);
      assert.equal(nextCanonicalDeck, null);
      assert.equal(typeof options.buildCanonicalDeck, 'function');
      return canonicalDeck;
    },
    buildPersistableDeckHtml(doc, options = {}) {
      assert.equal(doc, iframeDoc);
      assert.equal(options.canonicalDeck, null);
      return '<html>persisted</html>';
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run when resolveEditorCanonicalDeckOverride is available');
    },
    capturePersistedDeckPlaybackState(doc, nextCanonicalDeck) {
      calls.push(['capturePersistedDeckPlaybackState', doc, nextCanonicalDeck]);
      assert.equal(doc, iframeDoc);
      assert.equal(nextCanonicalDeck, canonicalDeck);
      return playbackState;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  vm.runInContext(
    'resolveEditorCanonicalDeckOverride = __resolveEditorCanonicalDeckOverride;',
    context
  );

  const persistedDeckState = JSON.parse(JSON.stringify(context.captureEditorPersistableDeckState()));
  assert.deepEqual(persistedDeckState, {
    cleanHtml: '<html>persisted</html>',
    playbackState,
    canonicalDeck
  });
  assert.deepEqual(calls.map(([name]) => name), [
    'resolveEditorCanonicalDeckOverride',
    'capturePersistedDeckPlaybackState'
  ]);
});

test('initStudioFrame refreshes inspector state after bootstrapping the iframe', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const initStudioFrameSource = extractFunctionSource(
    fileContent,
    'function initStudioFrame() {',
    '\n\n    // Apply hoverable tags to editable nodes'
  );

  const iframeDoc = {
    listeners: [],
    addEventListener(type, handler, capture) {
      this.listeners.push({ type, handler, capture });
    }
  };

  const calls = {
    getIframeDoc: 0,
    syncIframeTheme: 0,
    ensureStudioEditorStyle: 0,
    makeElementsHoverable: 0,
    clickHandlerFactory: 0,
    keydownHandlerFactory: 0,
    frameBootstrap: 0,
    frameLoadingStates: [],
    updateDeckReadyToolbarActionState: 0,
    setStudioAutoSaveStatus: [],
    syncInspectorForSelection: 0
  };

  const context = {
    getIframeDoc() {
      calls.getIframeDoc += 1;
      return iframeDoc;
    },
    syncIframeTheme() {
      calls.syncIframeTheme += 1;
    },
    SlideNextStudioEditorStyle: {
      ensureStudioEditorStyle(doc) {
        assert.equal(doc, iframeDoc);
        calls.ensureStudioEditorStyle += 1;
      }
    },
    makeElementsHoverable(doc) {
      assert.equal(doc, iframeDoc);
      calls.makeElementsHoverable += 1;
    },
    SlideNextStudioEditorEvents: {
      attachStudioFrameInteractionHandlers: editorEvents.attachStudioFrameInteractionHandlers,
      createStudioFrameClickHandler() {
        calls.clickHandlerFactory += 1;
        return function clickHandler() {};
      },
      createStudioFrameKeydownHandler() {
        calls.keydownHandlerFactory += 1;
        return function keydownHandler() {};
      }
    },
    isDraggingElement: false,
    resolveEditableTarget() {},
    selectElement() {},
    deselectElement() {},
    editorUndo() {},
    editorRedo() {},
    selectedElements: [],
    arrangeElementLayer() {},
    removeSelectedElement() {},
    copySelectedElements() {},
    pasteClipboardElements() {},
    duplicateSelectedElements() {},
    nudgeSelectedElements() {},
    selectAllElementsOnActiveSlide() {},
    SlideNextStudioFrameBootstrap: {
      runStudioFrameBootstrap(doc, options) {
        assert.equal(doc, iframeDoc);
        assert.equal(typeof options.captureInitialHistoryState, 'function');
        calls.frameBootstrap += 1;
        return {
          didSyncActiveSlide: true
        };
      }
    },
    setupIframeDragging() {},
    generateThumbnails() {},
    syncStudioChromeToActiveSlide() {},
    setActiveSlide() {},
    bindDeckNavigationSync() {},
    observeDeckActiveSlideState() {},
    saveHistoryState() {},
    capturePersistedDeckPlaybackState() {
      return {};
    },
    buildPersistableDeckHtml() {
      return '<html></html>';
    },
    persistedDeckPlaybackState: null,
    lastPersistedDeckHtml: '',
    updateDeckReadyToolbarActionState() {
      calls.updateDeckReadyToolbarActionState += 1;
    },
    setStudioAutoSaveStatus(state) {
      calls.setStudioAutoSaveStatus.push(state);
    },
    setStudioFrameLoadingState(state) {
      calls.frameLoadingStates.push(state);
    },
    syncInspectorForSelection() {
      calls.syncInspectorForSelection += 1;
    }
  };

  attachFrameInteractions(context);

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  vm.runInContext(initStudioFrameSource, context);

  context.initStudioFrame();

  assert.deepEqual(calls, {
    getIframeDoc: 1,
    syncIframeTheme: 1,
    ensureStudioEditorStyle: 1,
    makeElementsHoverable: 1,
    clickHandlerFactory: 1,
    keydownHandlerFactory: 1,
    frameBootstrap: 1,
    frameLoadingStates: ['ready'],
    updateDeckReadyToolbarActionState: 1,
    setStudioAutoSaveStatus: ['saved'],
    syncInspectorForSelection: 1
  });
  assert.equal(iframeDoc.listeners.length, 2);
  assert.deepEqual(iframeDoc.listeners.map((listener) => listener.type), ['click', 'keydown']);
});

test('initStudioFrame fails closed when legacy bootstrap runtimes are unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const initStudioFrameSource = extractFunctionSource(
    fileContent,
    'function initStudioFrame() {',
    '\n\n    // Apply hoverable tags to editable nodes'
  );
  const iframeDoc = {};
  const frameLoadingStates = [];
  const context = {
    getIframeDoc() {
      return iframeDoc;
    },
    SlideNextStudioEditorStyle: null,
    SlideNextStudioFrameBootstrap: null,
    setStudioFrameLoadingState(state) {
      frameLoadingStates.push(state);
    }
  };

  vm.createContext(context);
  vm.runInContext(initStudioFrameSource, context);

  assert.equal(context.initStudioFrame(), false);
  assert.deepEqual(frameLoadingStates, ['error']);
});

test('initStudioFrame exposes an error state when the frame controller throws', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const initStudioFrameSource = extractFunctionSource(
    fileContent,
    'function initStudioFrame() {',
    '\n\n    // Apply hoverable tags to editable nodes'
  );
  const frameLoadingStates = [];
  const statusStates = [];
  const context = {
    studioEditorFrameController: {
      init() {
        throw new Error('frame bootstrap failed');
      }
    },
    setStudioFrameLoadingState(state) {
      frameLoadingStates.push(state);
    },
    setStudioAutoSaveStatus(state) {
      statusStates.push(state);
    }
  };

  vm.createContext(context);
  vm.runInContext(initStudioFrameSource, context);

  assert.equal(context.initStudioFrame(), false);
  assert.deepEqual(frameLoadingStates, ['error']);
  assert.deepEqual(statusStates, ['editor-load-failed']);
});

test('initStudioFrame exposes an error state when legacy bootstrap throws', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const initStudioFrameSource = extractFunctionSource(
    fileContent,
    'function initStudioFrame() {',
    '\n\n    // Apply hoverable tags to editable nodes'
  );
  const iframeDoc = { addEventListener() {} };
  const frameLoadingStates = [];
  const context = {
    getIframeDoc() {
      return iframeDoc;
    },
    SlideNextStudioEditorStyle: {
      ensureStudioEditorStyle() {}
    },
    SlideNextStudioFrameBootstrap: {
      runStudioFrameBootstrap() {
        throw new Error('legacy bootstrap failed');
      }
    },
    studioEditorFrameInteractions: null,
    setStudioFrameLoadingState(state) {
      frameLoadingStates.push(state);
    },
    syncIframeTheme() {},
    makeElementsHoverable() {}
  };

  vm.createContext(context);
  vm.runInContext(initStudioFrameSource, context);

  assert.equal(context.initStudioFrame(), false);
  assert.deepEqual(frameLoadingStates, ['error']);
});

test('initStudioFrame reuses the resolved canonical deck when capturing the initial persisted state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const initStudioFrameSource = extractFunctionSource(
    fileContent,
    'function initStudioFrame() {',
    '\n\n    // Apply hoverable tags to editable nodes'
  );

  const iframeDoc = {
    addEventListener() {}
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-1']
  };
  let capturedActionContextArgs = null;
  let delegatedArgs = null;
  let capturedHandlerOptionsArgs = null;
  const calls = [];
  let buildEditorCanonicalDeckCalls = 0;

  const context = {
    applyCurrentStudioPersistenceSuccess(persistenceContext, options = {}) {
      return context.SlideNextStudioEditorPersistence.handleStudioPersistenceSuccess(
        persistenceContext,
        context.createCurrentStudioPersistenceHandlerOptions(options)
      );
    },
    createCurrentStudioPersistenceHandlerOptions(options = {}) {
      capturedHandlerOptionsArgs = options;
      return {
        marker: 'persistence-handler-options',
        ...options
      };
    },
    getIframeDoc() {
      return iframeDoc;
    },
    syncIframeTheme() {},
    SlideNextStudioEditorStyle: {
      ensureStudioEditorStyle() {}
    },
    makeElementsHoverable() {},
    SlideNextStudioEditorEvents: {
      attachStudioFrameInteractionHandlers: editorEvents.attachStudioFrameInteractionHandlers,
      createStudioFrameClickHandler() {
        return function clickHandler() {};
      },
      createStudioFrameKeydownHandler() {
        return function keydownHandler() {};
      }
    },
    isDraggingElement: false,
    resolveEditableTarget() {},
    selectElement() {},
    deselectElement() {},
    editorUndo() {},
    editorRedo() {},
    selectedElements: [],
    arrangeElementLayer() {},
    removeSelectedElement() {},
    copySelectedElements() {},
    pasteClipboardElements() {},
    duplicateSelectedElements() {},
    nudgeSelectedElements() {},
    selectAllElementsOnActiveSlide() {},
    SlideNextStudioFrameBootstrap: {
      runStudioFrameBootstrap(doc, options) {
        assert.equal(doc, iframeDoc);
        options.captureInitialHistoryState();
      }
    },
    setupIframeDragging() {},
    generateThumbnails() {},
    syncStudioChromeToActiveSlide() {},
    setActiveSlide() {},
    bindDeckNavigationSync() {},
    observeDeckActiveSlideState() {},
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
    },
    capturePersistedDeckPlaybackState(doc) {
      assert.equal(doc, iframeDoc);
      calls.push(['capturePersistedDeckPlaybackState', doc]);
      return playbackState;
    },
    buildPersistableDeckHtml(doc, options = {}) {
      assert.equal(doc, iframeDoc);
      assert.equal(typeof options.onCanonicalDeckResolved, 'function');
      assert.equal(typeof options.onPlaybackStateResolved, 'function');
      calls.push(['buildPersistableDeckHtml', doc, options]);
      options.onCanonicalDeckResolved(canonicalDeck);
      options.onPlaybackStateResolved(playbackState);
      return '<html>persisted-live</html>';
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return canonicalDeck;
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      handleStudioPersistenceSuccess(persistenceContext, options = {}) {
        delegatedArgs = {
          persistenceContext,
          options
        };
        return 'applied';
      },
      createStudioPersistedDeckStateActionContext(nextPersistedDeckState, presentationUrl, options = {}) {
        capturedActionContextArgs = {
          nextPersistedDeckState,
          presentationUrl,
          options
        };
        return {
          presentationUrl,
          cleanHtml: nextPersistedDeckState.cleanHtml,
          canonicalDeck: nextPersistedDeckState.canonicalDeck,
          playbackState: nextPersistedDeckState.playbackState,
          sessionToken: options.sessionToken
        };
      }
    },
    studioEditorSessionToken: 7,
    persistedDeckPlaybackState: null,
    lastPersistedDeckHtml: '',
    updateInsertionActionState() {},
    updateZoomActionState() {},
    updateWallpaperActionState() {},
    updateDeckReadyToolbarActionState() {},
    setStudioAutoSaveStatus() {},
    syncInspectorForSelection() {}
  };

  attachFrameInteractions(context);

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  vm.runInContext(initStudioFrameSource, context);

  context.initStudioFrame();

  assert.deepEqual(calls.map(([name]) => name), [
    'buildPersistableDeckHtml',
    'saveHistoryState'
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1])), [
    'saveHistoryState',
    false,
    null,
    canonicalDeck
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(capturedActionContextArgs)), {
    nextPersistedDeckState: {
      playbackState,
      cleanHtml: '<html>persisted-live</html>',
      canonicalDeck
    },
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    options: {
      sessionToken: 7
    }
  });
  assert.deepEqual(JSON.parse(JSON.stringify(capturedHandlerOptionsArgs)), {
    presentationUrl: '/presentations/onboarding-presentation/index.html'
  });
  assert.deepEqual(JSON.parse(JSON.stringify(delegatedArgs)), {
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html>persisted-live</html>',
      canonicalDeck,
      playbackState,
      sessionToken: 7
    },
    options: {
      marker: 'persistence-handler-options',
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  });
  assert.equal(buildEditorCanonicalDeckCalls, 0);
});

test('initStudioFrame keeps the legacy bootstrap alive when initial persistence capture fails', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const initStudioFrameSource = extractFunctionSource(
    fileContent,
    'function initStudioFrame() {',
    '\n\n    // Apply hoverable tags to editable nodes'
  );
  const iframeDoc = { addEventListener() {} };
  const calls = [];
  const context = {
    getIframeDoc() {
      return iframeDoc;
    },
    syncIframeTheme() {},
    SlideNextStudioEditorStyle: {
      ensureStudioEditorStyle() {}
    },
    makeElementsHoverable() {},
    studioEditorFrameInteractions: {
      attach(doc) {
        assert.equal(doc, iframeDoc);
      }
    },
    SlideNextStudioFrameBootstrap: {
      runStudioFrameBootstrap(doc, options) {
        assert.equal(doc, iframeDoc);
        options.captureInitialHistoryState();
      }
    },
    setupIframeDragging() {},
    generateThumbnails() {},
    syncStudioChromeToActiveSlide() {},
    setActiveSlide() {},
    bindDeckNavigationSync() {},
    observeDeckActiveSlideState() {},
    captureEditorPersistableDeckState() {
      throw new Error('persistence capture failed');
    },
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
      return false;
    },
    SlideNextStudioEditorPersistence: {
      createStudioPersistedDeckStateActionContext(state, presentationUrl, options) {
        calls.push(['createContext', state, presentationUrl, options]);
        return { state, presentationUrl };
      }
    },
    applyCurrentStudioPersistenceSuccess(state, options) {
      calls.push(['applySuccess', state, options]);
    },
    currentPresentationUrl: '/presentations/legacy/index.html',
    studioEditorSessionToken: 4,
    updateDeckReadyToolbarActionState() {
      calls.push('ready');
    },
    setStudioAutoSaveStatus(status) {
      calls.push(['status', status]);
    },
    syncInspectorForSelection() {
      calls.push('inspector');
    }
  };

  vm.createContext(context);
  vm.runInContext(initStudioFrameSource, context);

  assert.doesNotThrow(() => context.initStudioFrame());
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['saveHistoryState', false],
    ['createContext', null, '/presentations/legacy/index.html', { sessionToken: 4 }],
    ['applySuccess', { state: null, presentationUrl: '/presentations/legacy/index.html' }, {
      presentationUrl: '/presentations/legacy/index.html'
    }],
    'ready',
    ['status', 'history-failed'],
    'inspector'
  ]);
});

test('initStudioFrame keeps the legacy bootstrap alive when persistence runtime is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const initStudioFrameSource = extractFunctionSource(
    fileContent,
    'function initStudioFrame() {',
    '\n\n    // Apply hoverable tags to editable nodes'
  );
  const iframeDoc = { addEventListener() {} };
  const calls = [];
  const context = {
    getIframeDoc() {
      return iframeDoc;
    },
    syncIframeTheme() {},
    SlideNextStudioEditorStyle: {
      ensureStudioEditorStyle() {}
    },
    makeElementsHoverable() {},
    studioEditorFrameInteractions: {
      attach(doc) {
        assert.equal(doc, iframeDoc);
      }
    },
    SlideNextStudioFrameBootstrap: {
      runStudioFrameBootstrap(doc, options) {
        assert.equal(doc, iframeDoc);
        options.captureInitialHistoryState();
      }
    },
    setupIframeDragging() {},
    generateThumbnails() {},
    syncStudioChromeToActiveSlide() {},
    setActiveSlide() {},
    bindDeckNavigationSync() {},
    observeDeckActiveSlideState() {},
    captureEditorPersistableDeckState() {
      throw new Error('persistence capture failed');
    },
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
    },
    currentPresentationUrl: '/presentations/legacy/index.html',
    studioEditorSessionToken: 4,
    updateDeckReadyToolbarActionState() {
      calls.push('ready');
    },
    setStudioAutoSaveStatus(status) {
      calls.push(['status', status]);
    },
    syncInspectorForSelection() {
      calls.push('inspector');
    }
  };

  vm.createContext(context);
  vm.runInContext(initStudioFrameSource, context);

  assert.doesNotThrow(() => context.initStudioFrame());
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['saveHistoryState', false],
    'ready',
    ['status', 'saved'],
    'inspector'
  ]);
});

test('initStudioFrame keeps the legacy bootstrap alive when initial history save throws', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const initStudioFrameSource = extractFunctionSource(
    fileContent,
    'function initStudioFrame() {',
    '\n\n    // Apply hoverable tags to editable nodes'
  );
  const iframeDoc = { addEventListener() {} };
  const calls = [];
  const context = {
    getIframeDoc() {
      return iframeDoc;
    },
    syncIframeTheme() {},
    SlideNextStudioEditorStyle: {
      ensureStudioEditorStyle() {}
    },
    makeElementsHoverable() {},
    studioEditorFrameInteractions: {
      attach() {}
    },
    SlideNextStudioFrameBootstrap: {
      runStudioFrameBootstrap(doc, options) {
        assert.equal(doc, iframeDoc);
        assert.doesNotThrow(() => options.captureInitialHistoryState());
      }
    },
    setupIframeDragging() {},
    generateThumbnails() {},
    syncStudioChromeToActiveSlide() {},
    setActiveSlide() {},
    bindDeckNavigationSync() {},
    observeDeckActiveSlideState() {},
    captureEditorPersistableDeckState() {
      return { cleanHtml: '<html></html>' };
    },
    saveHistoryState() {
      throw new Error('history save failed');
    },
    updateDeckReadyToolbarActionState() {},
    setStudioAutoSaveStatus(status) {
      calls.push(status);
    },
    syncInspectorForSelection() {}
  };

  vm.createContext(context);
  vm.runInContext(initStudioFrameSource, context);

  assert.doesNotThrow(() => context.initStudioFrame());
  assert.deepEqual(calls, ['history-failed']);
});

test('syncIframeTheme uses the shared iframe accessor and injects the light theme override style', () => {
  const appendedStyles = [];
  const iframeDoc = {
    createElement(tagName) {
      return {
        tagName,
        id: '',
        textContent: ''
      };
    },
    documentElement: {
      classList: {
        add(value) {
          appendedStyles.push(['addClass', value]);
        },
        remove(value) {
          appendedStyles.push(['removeClass', value]);
        }
      }
    },
    getElementById(id) {
      if (id === 'editor-theme-override-tag') {
        return null;
      }
      throw new Error(`Unexpected iframe lookup: ${id}`);
    },
    head: {
      appendChild(node) {
        appendedStyles.push(['appendChild', node]);
      }
    }
  };

  const context = {
    SlideNextStudioThemeView: themeView,
    document: {
      documentElement: {
        classList: {
          contains(value) {
            assert.equal(value, 'dark');
            return false;
          }
        }
      }
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  context.studioEditorThemeController = themeController.createStudioEditorThemeController({
    themeViewApi: context.SlideNextStudioThemeView,
    documentRef: context.document,
    getIframeDocument: context.getIframeDoc
  });

  const globalApi = toolbarAccessorsApi.createStudioEditorToolbarGlobalApi({
    accessors: toolbarAccessorsApi.createStudioEditorToolbarAccessors({
      themeController: context.studioEditorThemeController
    })
  });
  globalApi.syncIframeTheme();

  assert.deepEqual(appendedStyles[0], ['removeClass', 'dark']);
  assert.equal(appendedStyles[1][0], 'appendChild');
  assert.equal(appendedStyles[1][1].id, 'editor-theme-override-tag');
  assert.match(appendedStyles[1][1].textContent, /--color-bg-base/);
});

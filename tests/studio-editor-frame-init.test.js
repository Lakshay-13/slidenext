const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadCaptureEditorPersistableDeckState(fileContent, context) {
  const captureEditorPersistableDeckStateSource = extractFunctionSource(
    fileContent,
    'function captureEditorPersistableDeckState(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );
  vm.runInContext(captureEditorPersistableDeckStateSource, context);
}

function loadApplyCurrentStudioCapturedDeckState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioCapturedDeckState(',
    '\n\n    function resolveCurrentStudioVersionCheckpointPersistenceState('
  );
  vm.runInContext(helperSource, context);
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
    updateInsertionActionState: 0,
    updateWallpaperActionState: 0,
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
    updateInsertionActionState() {
      calls.updateInsertionActionState += 1;
    },
    updateWallpaperActionState() {
      calls.updateWallpaperActionState += 1;
    },
    updateDeckReadyToolbarActionState() {
      calls.updateDeckReadyToolbarActionState += 1;
    },
    setStudioAutoSaveStatus(state) {
      calls.setStudioAutoSaveStatus.push(state);
    },
    syncInspectorForSelection() {
      calls.syncInspectorForSelection += 1;
    }
  };

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
    updateInsertionActionState: 1,
    updateWallpaperActionState: 1,
    updateDeckReadyToolbarActionState: 1,
    setStudioAutoSaveStatus: ['saved'],
    syncInspectorForSelection: 1
  });
  assert.equal(iframeDoc.listeners.length, 2);
  assert.deepEqual(iframeDoc.listeners.map((listener) => listener.type), ['click', 'keydown']);
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
  let capturedPersistedDeckState = null;
  const calls = [];
  let buildEditorCanonicalDeckCalls = 0;

  const context = {
    applyCurrentStudioCapturedDeckState(nextPersistedDeckState, presentationUrl, sessionToken) {
      capturedPersistedDeckState = {
        nextPersistedDeckState,
        presentationUrl,
        sessionToken
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
    saveHistoryState(shouldDebounce) {
      calls.push(['saveHistoryState', shouldDebounce]);
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
    studioEditorSessionToken: 7,
    persistedDeckPlaybackState: null,
    lastPersistedDeckHtml: '',
    updateInsertionActionState() {},
    updateWallpaperActionState() {},
    updateDeckReadyToolbarActionState() {},
    setStudioAutoSaveStatus() {},
    syncInspectorForSelection() {}
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  vm.runInContext(initStudioFrameSource, context);

  context.initStudioFrame();

  assert.deepEqual(calls.map(([name]) => name), [
    'saveHistoryState',
    'buildPersistableDeckHtml'
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(capturedPersistedDeckState)), {
    nextPersistedDeckState: {
      playbackState,
      cleanHtml: '<html>persisted-live</html>',
      canonicalDeck
    },
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    sessionToken: 7
  });
  assert.equal(buildEditorCanonicalDeckCalls, 0);
});

test('applyCurrentStudioCapturedDeckState delegates captured bootstrap state through shared persistence helpers', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const persistedDeckState = {
    cleanHtml: '<html>persisted-live</html>',
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: []
    },
    playbackState: {
      activeSlideIds: ['slide-1']
    }
  };
  let capturedActionContextArgs = null;
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      createStudioPersistedDeckStateActionContext(nextPersistedDeckState, presentationUrl, options = {}) {
        capturedActionContextArgs = {
          nextPersistedDeckState,
          presentationUrl,
          options
        };
        return {
          presentationUrl,
          cleanHtml: nextPersistedDeckState.cleanHtml,
          sessionToken: options.sessionToken
        };
      }
    },
    applyCurrentStudioPersistenceSuccess(persistenceContext, options = {}) {
      delegatedArgs = {
        persistenceContext,
        options
      };
      return 'applied';
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 11
  };

  vm.createContext(context);
  loadApplyCurrentStudioCapturedDeckState(fileContent, context);

  const result = context.applyCurrentStudioCapturedDeckState(persistedDeckState);

  assert.equal(result, 'applied');
  assert.equal(capturedActionContextArgs.nextPersistedDeckState, persistedDeckState);
  assert.equal(capturedActionContextArgs.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(capturedActionContextArgs.options.sessionToken, 11);
  assert.deepEqual(JSON.parse(JSON.stringify(delegatedArgs)), {
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html>persisted-live</html>',
      sessionToken: 11
    },
    options: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  });
});

test('syncIframeTheme uses the shared iframe accessor and injects the light theme override style', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncIframeThemeSource = extractFunctionSource(
    fileContent,
    'function syncIframeTheme() {',
    '\n\n    // 1. Fetch Presentations from Backend'
  );

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

  vm.createContext(context);
  vm.runInContext(syncIframeThemeSource, context);

  context.syncIframeTheme();

  assert.deepEqual(appendedStyles[0], ['removeClass', 'dark']);
  assert.equal(appendedStyles[1][0], 'appendChild');
  assert.equal(appendedStyles[1][1].id, 'editor-theme-override-tag');
  assert.match(appendedStyles[1][1].textContent, /--color-bg-base/);
});

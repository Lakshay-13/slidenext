const test = require('node:test');
const assert = require('node:assert/strict');
const frameController = require('../shared/studio-editor-frame-controller.js');

test('frame controller runs the editor bootstrap sequence in order', () => {
  const calls = [];
  const iframeDoc = { id: 'iframe-doc' };
  let bootstrapOptions = null;
  const controller = frameController.createStudioEditorFrameController({
    getIframeDocument() {
      calls.push('getIframeDocument');
      return iframeDoc;
    },
    resetLiveCanonicalDeck() {
      calls.push('resetLiveCanonicalDeck');
    },
    syncIframeTheme() {
      calls.push('syncIframeTheme');
    },
    editorStyleApi: {
      ensureStudioEditorStyle(doc) {
        calls.push(['ensureStudioEditorStyle', doc]);
      }
    },
    makeElementsHoverable(doc) {
      calls.push(['makeElementsHoverable', doc]);
    },
    frameInteractions: {
      attach(doc) {
        calls.push(['attach', doc]);
      }
    },
    frameBootstrapApi: {
      runStudioFrameBootstrap(doc, options) {
        calls.push(['runStudioFrameBootstrap', doc]);
        bootstrapOptions = options;
      }
    },
    setupIframeDragging() {},
    generateThumbnails() {},
    syncStudioChromeToActiveSlide() {},
    setActiveSlide() {},
    bindDeckNavigationSync() {},
    observeDeckActiveSlideState() {},
    captureInitialHistoryState() {},
    updateDeckReadyToolbarActionState() {
      calls.push('updateDeckReadyToolbarActionState');
    },
    setStudioAutoSaveStatus(value) {
      calls.push(['setStudioAutoSaveStatus', value]);
    },
    syncInspectorForSelection() {
      calls.push('syncInspectorForSelection');
    }
  });

  assert.equal(controller.init(), true);
  assert.deepEqual(calls, [
    'resetLiveCanonicalDeck',
    'getIframeDocument',
    'syncIframeTheme',
    ['ensureStudioEditorStyle', iframeDoc],
    ['makeElementsHoverable', iframeDoc],
    ['attach', iframeDoc],
    ['runStudioFrameBootstrap', iframeDoc],
    'updateDeckReadyToolbarActionState',
    ['setStudioAutoSaveStatus', 'saved'],
    'syncInspectorForSelection'
  ]);
  assert.equal(typeof bootstrapOptions.captureInitialHistoryState, 'function');
});

test('frame controller stops before touching iframe state when no document is available', () => {
  const calls = [];
  const controller = frameController.createStudioEditorFrameController({
    resetLiveCanonicalDeck() {
      calls.push('reset');
    },
    getIframeDocument() {
      calls.push('get');
      return null;
    },
    syncIframeTheme() {
      calls.push('theme');
    }
  });

  assert.equal(controller.init(), false);
  assert.deepEqual(calls, ['reset', 'get']);
});

test('frame controller captures the canonical initial history baseline through injected persistence APIs', () => {
  const iframeDoc = { id: 'iframe-doc' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const persistedDeckState = {
    cleanHtml: '<html></html>',
    canonicalDeck,
    playbackState: { activeSlideIds: ['slide-1'] }
  };
  const calls = [];
  let bootstrapOptions = null;
  const persistenceApi = {
    createStudioPersistedDeckStateActionContext(state, presentationUrl, options) {
      calls.push(['createContext', state, presentationUrl, options]);
      return { state, presentationUrl, sessionToken: options.sessionToken };
    }
  };
  const controller = frameController.createStudioEditorFrameController({
    getIframeDocument: () => iframeDoc,
    capturePersistableDeckState(doc) {
      calls.push(['capture', doc]);
      return persistedDeckState;
    },
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
    },
    persistenceApi,
    applyPersistenceSuccess(context, options) {
      calls.push(['applySuccess', context, options]);
    },
    getPresentationUrl: () => '/presentations/demo/index.html',
    getSessionToken: () => 9,
    setLiveCanonicalDeck(...args) {
      calls.push(['setLiveCanonicalDeck', ...args]);
    },
    frameBootstrapApi: {
      runStudioFrameBootstrap(doc, options) {
        bootstrapOptions = options;
        options.captureInitialHistoryState(doc);
      }
    }
  });

  assert.equal(controller.init(), true);
  assert.equal(typeof bootstrapOptions.captureInitialHistoryState, 'function');
  assert.deepEqual(calls, [
    ['capture', iframeDoc],
    ['saveHistoryState', false, null, canonicalDeck],
    ['createContext', persistedDeckState, '/presentations/demo/index.html', { sessionToken: 9 }],
    ['applySuccess', {
      state: persistedDeckState,
      presentationUrl: '/presentations/demo/index.html',
      sessionToken: 9
    }, {
      presentationUrl: '/presentations/demo/index.html'
    }],
    ['setLiveCanonicalDeck', canonicalDeck, iframeDoc, 9]
  ]);
});

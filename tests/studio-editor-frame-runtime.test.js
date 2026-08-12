const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frameRuntime = require('../shared/studio-editor-frame-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('frame runtime composes transient state, interactions, and frame controller', () => {
  const calls = [];
  const state = {
    getIsDraggingElement: () => true,
    consumeClickSuppression: () => true
  };
  const frameInteractions = { name: 'interactions' };
  const frameController = { name: 'frame' };
  const callbacks = {
    eventsApi: {},
    inlineTextEditApi: {},
    shouldIgnoreTarget() {},
    resolveEditableTarget() {},
    selectElement() {},
    deselectElement() {},
    getActiveSlide() {},
    resolveTextElement() {},
    resolveAdjacentTextElement() {},
    getCanonicalVisibilityReader() {},
    isElementLocked() {},
    isElementHidden() {},
    onInlineEditStart() {},
    onInlineEditCommit() {},
    onInlineEditEnd() {},
    getSelectedElements() {},
    canMutateDeck() {},
    editorUndo() {},
    editorRedo() {},
    selectAllElementsOnActiveSlide() {},
    arrangeElementLayer() {},
    removeSelectedElement() {},
    copySelectedElements() {},
    pasteClipboardElements() {},
    duplicateSelectedElements() {},
    nudgeSelectedElements() {},
    navigateSlide() {},
    getIframeDocument() {},
    resetLiveCanonicalDeck() {},
    syncIframeTheme() {},
    editorStyleApi: {},
    makeElementsHoverable() {},
    frameBootstrapApi: {},
    setupIframeDragging() {},
    generateThumbnails() {},
    syncStudioChromeToActiveSlide() {},
    setActiveSlide() {},
    bindDeckNavigationSync() {},
    observeDeckActiveSlideState() {},
    capturePersistableDeckState() {},
    saveHistoryState() {},
    persistenceApi: {},
    applyPersistenceSuccess() {},
    getPresentationUrl() {},
    getSessionToken() {},
    setLiveCanonicalDeck() {},
    getInitialCanonicalDeck() {},
    updateDeckReadyToolbarActionState() {},
    setStudioAutoSaveStatus() {},
    syncInspectorForSelection() {}
  };
  const interactionStateApi = {
    createStudioEditorFrameInteractionStateController(options) {
      calls.push(['state', options]);
      return state;
    }
  };
  const frameInteractionsApi = {
    createStudioEditorFrameInteractions(options) {
      calls.push(['interactions', options]);
      return frameInteractions;
    }
  };
  const frameControllerApi = {
    createStudioEditorFrameController(options) {
      calls.push(['frame', options]);
      return frameController;
    }
  };

  const result = frameRuntime.createStudioEditorFrameRuntime({
    interactionStateApi,
    frameInteractionsApi,
    frameControllerApi,
    ...callbacks
  });

  assert.deepEqual(result, {
    frameInteractionStateController: state,
    frameInteractions,
    frameController
  });
  assert.equal(calls[1][1].eventsApi, callbacks.eventsApi);
  assert.equal(calls[1][1].resolveEditableTarget, callbacks.resolveEditableTarget);
  assert.equal(calls[1][1].getIsDragging(), true);
  assert.equal(calls[1][1].consumeClickSuppression(), true);
  assert.equal(calls[2][1].frameInteractions, frameInteractions);
  assert.equal(calls[2][1].getIframeDocument, callbacks.getIframeDocument);
  assert.equal(calls[2][1].persistenceApi, callbacks.persistenceApi);
  assert.equal(calls[2][1].getInitialCanonicalDeck, callbacks.getInitialCanonicalDeck);
});

test('index wires frame editing composition through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-frame-runtime-options\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorFrameRuntimeOptionsApi\.createStudioEditorFrameRuntimeOptions\(/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-frame-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-frame-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorFrameShellRuntime\.createStudioEditorFrameShellRuntime\(/
  );
  assert.match(
    fileContent,
    /const studioEditorAdjacentTextElementResolver =/
  );
  assert.match(
    fileContent,
    /resolveAdjacentTextElement: studioEditorAdjacentTextElementResolver/
  );
  assert.match(
    fileContent,
    /getSelectedElements: \(doc\) => getLiveSelectedElements\(getStudioSelectedElements\(doc\), doc\),/
  );
  assert.match(
    fileContent,
    /commitSelectionState: commitEditorSelectionState,/
  );
  assert.match(
    fileContent,
    /getOverlayOptions: getEditorOverlayOptions,/
  );
  assert.doesNotMatch(
    fileContent,
    /onInlineEditStart: \(\{ element \}, iframeDoc\)/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorFrameInteractions\.createStudioEditorFrameInteractions\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorFrameController\.createStudioEditorFrameController\(/
  );
});

test('index propagates inline text mutation failures to the edit controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const callbackStart = fileContent.indexOf('onInlineEditCommit: ({ text }) => {');
  assert.notEqual(callbackStart, -1);
  const callbackEnd = fileContent.indexOf('\n          },', callbackStart);
  assert.notEqual(callbackEnd, -1);
  const callbackSource = fileContent.slice(callbackStart, callbackEnd);

  assert.match(callbackSource, /return applySelectedElementStyle\('text', text\);/);
});

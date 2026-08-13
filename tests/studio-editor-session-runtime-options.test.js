const test = require('node:test');
const assert = require('node:assert/strict');

const runtimeOptions = require('../shared/studio-editor-session-runtime-options.js');

test('session runtime options preserves injected dependencies and callbacks', () => {
  const dependencies = {
    sessionApi: {},
    sessionResetApi: {},
    sessionUiApi: {},
    shellApi: {},
    presentationMetadataApi: {},
    persistenceApi: {},
    deckContextApi: {}
  };
  const callbacks = {
    documentRef: {},
    getPresentationUrl() {},
    getPresentationTitle() {},
    getPresentationCategory() {},
    getSessionToken() {},
    setPresentationUrl() {},
    setPresentationTitle() {},
    setPresentationCategory() {},
    setSlideIndex() {},
    setPresentationMetadata() {},
    getAutoSaveDebounceTimer() {},
    setAutoSaveDebounceTimer() {},
    getAutoVersionTimers() {},
    setAutoVersionTimers() {},
    clearTimer() {},
    applyPersistedDeckState() {},
    clearHistoryStacks() {},
    updateHistoryButtons() {},
    resetPresentationUiState() {},
    resetSourceViewUiState() {},
    resetDeckUiState() {},
    resetVersionUiState() {},
    resetSaveButtonState() {},
    updateDeckReadyToolbarActionState() {},
    setAutoSaveStatus() {},
    setFrameLoadingState() {},
    setCurrentPresentationMetadata() {},
    getCurrentPresentationMetadata() {},
    buildPresentationMetadataSeed() {},
    applyPresentationMetadata() {},
    loadPresentationMetadata() {},
    resolveLoadOptions() {},
    resolveStoredCanonicalDeck() {},
    getIframeDoc() {},
    generateThumbnails() {},
    syncStudioChromeToActiveSlide() {}
  };

  const result = runtimeOptions.createStudioEditorSessionRuntimeOptions({
    ...dependencies,
    ...callbacks
  });

  assert.deepEqual(result, {
    ...dependencies,
    ...callbacks
  });
});

test('session runtime options keeps explicit null dependencies as fail-closed overrides', () => {
  const result = runtimeOptions.createStudioEditorSessionRuntimeOptions({
    sessionApi: null,
    sessionResetApi: null,
    sessionUiApi: null,
    shellApi: null,
    presentationMetadataApi: null,
    persistenceApi: null,
    deckContextApi: null
  });

  assert.equal(result.sessionApi, null);
  assert.equal(result.sessionResetApi, null);
  assert.equal(result.sessionUiApi, null);
  assert.equal(result.shellApi, null);
  assert.equal(result.presentationMetadataApi, null);
  assert.equal(result.persistenceApi, null);
  assert.equal(result.deckContextApi, null);
});

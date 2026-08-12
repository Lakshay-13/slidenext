const test = require('node:test');
const assert = require('node:assert/strict');

const runtimeOptions = require('../shared/studio-editor-frame-runtime-options.js');

test('frame runtime options preserves injected dependencies and inline edit callbacks', () => {
  const calls = [];
  const documentRef = { id: 'iframe-document' };
  const element = { id: 'text-element' };
  const activeSlide = { id: 'slide-1' };
  const overlayApi = {
    hideStudioSelectionOverlay(doc, slide, options) {
      calls.push(['hideOverlay', doc, slide, options]);
    }
  };
  const commitSelectionState = (selection, options) => {
    calls.push(['commitSelection', selection, options]);
  };
  const getOverlayOptions = () => ({ selectionOverlayId: 'overlay' });
  const callbacks = {
    interactionStateApi: {},
    frameInteractionsApi: {},
    frameControllerApi: {},
    eventsApi: {},
    inlineTextEditApi: {},
    getActiveSlide: () => activeSlide,
    commitSelectionState,
    getOverlayOptions,
    getIframeDocument: () => documentRef,
    saveHistoryState() {}
  };

  const result = runtimeOptions.createStudioEditorFrameRuntimeOptions({
    ...callbacks,
    overlayApi
  });

  assert.equal(result.interactionStateApi, callbacks.interactionStateApi);
  assert.equal(result.frameInteractionsApi, callbacks.frameInteractionsApi);
  assert.equal(result.frameControllerApi, callbacks.frameControllerApi);
  assert.equal(result.getIframeDocument, callbacks.getIframeDocument);
  assert.equal(result.saveHistoryState, callbacks.saveHistoryState);

  assert.equal(result.onInlineEditStart({ element }, documentRef), true);
  assert.deepEqual(calls, [
    ['commitSelection', { selectedElements: [element] }, { doc: documentRef }],
    ['hideOverlay', documentRef, activeSlide, { selectionOverlayId: 'overlay' }]
  ]);
});

test('frame runtime options keeps an explicit inline edit start override', () => {
  const customHandler = () => 'custom';
  const result = runtimeOptions.createStudioEditorFrameRuntimeOptions({
    onInlineEditStart: customHandler
  });

  assert.equal(result.onInlineEditStart, customHandler);
});

(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorStyleRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorStyleRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorStyleController)
      || null;
    const styleController = controllerApi
      && typeof controllerApi.createStudioEditorStyleController === 'function'
      ? controllerApi.createStudioEditorStyleController({
          styleApi: options.styleApi
            || (root && root.SlideNextStudioEditorStyle)
            || null,
          chartApi: options.chartApi
            || (root && root.SlideNextStudioEditorChartMutation)
            || null,
          canonicalStyleApi: options.canonicalStyleApi
            || (root && root.SlideNextStudioEditorCanonicalStyle)
            || null,
          canonicalDeckApi: options.canonicalDeckApi
            || (root && root.SlideNextCanonicalDeck)
            || null,
          transactionApi: options.transactionApi
            || (root && root.SlideNextStudioEditorTransaction)
            || null,
          domApi: options.domApi
            || (root && root.SlideNextStudioEditorDom)
            || null,
          getSelectedElements: options.getSelectedElements,
          getIframeDoc: options.getIframeDoc,
          getActiveSlide: options.getActiveSlide,
          isElementLocked: options.isElementLocked,
          syncInspectorForSelection: options.syncInspectorForSelection,
          documentRef: options.documentRef || (root && root.document) || null,
          highlightAlignButton: options.highlightAlignButton,
          assignElementId: options.assignElementId,
          buildCanonicalDeck: options.buildCanonicalDeck,
          buildCanonicalDeckBaseline: options.buildCanonicalDeckBaseline,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          applyStyleMutation: options.applyStyleMutation,
          finalizeDeckMutation: options.finalizeDeckMutation
        })
      : null;

    return {
      styleController
    };
  }

  return {
    createStudioEditorStyleRuntime
  };
});

(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanvasShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options) {
    if (Object.prototype.hasOwnProperty.call(options, 'canvasApi')) {
      return options.canvasApi;
    }
    return root && root.SlideNextStudioEditorCanvas
      ? root.SlideNextStudioEditorCanvas
      : null;
  }

  function createStudioEditorCanvasShellRuntime(options = {}) {
    const canvasApi = resolveApi(options);
    const getDocumentRef = typeof options.getDocumentRef === 'function'
      ? options.getDocumentRef
      : () => options.documentRef || null;
    const getCanonicalDeck = typeof options.getCanonicalDeck === 'function'
      ? options.getCanonicalDeck
      : () => null;
    const getZoomFactor = typeof options.getZoomFactor === 'function'
      ? options.getZoomFactor
      : () => 1;
    const synchronizer = canvasApi
      && typeof canvasApi.createStudioCanvasDimensionsSynchronizer === 'function'
      ? canvasApi.createStudioCanvasDimensionsSynchronizer({
          getDocumentRef,
          getCanonicalDeck,
          getZoomFactor
        })
      : null;

    function sync() {
      if (typeof synchronizer === 'function') {
        return synchronizer();
      }
      if (!canvasApi || typeof canvasApi.applyStudioCanvasDimensions !== 'function') {
        return { didApply: false };
      }

      let canonicalDeck = null;
      try {
        canonicalDeck = getCanonicalDeck();
      } catch (error) {
        canonicalDeck = null;
      }
      const zoomFactor = getZoomFactor();
      try {
        return canvasApi.applyStudioCanvasDimensions({
          documentRef: getDocumentRef(),
          canonicalDeck,
          zoomFactor
        });
      } catch (error) {
        return { didApply: false };
      }
    }

    return {
      sync
    };
  }

  return {
    createStudioEditorCanvasShellRuntime
  };
});

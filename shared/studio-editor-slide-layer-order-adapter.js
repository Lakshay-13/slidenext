(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideLayerOrderAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function resolveDomApi(options = {}) {
    return options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
  }

  function getStudioEditorNormalizedSlideLayerOrder(slide, options = {}) {
    const domApi = resolveDomApi(options);
    const readLayerOrder = typeof options.layerOrderReader === 'function'
      ? options.layerOrderReader
      : domApi
        && typeof domApi.getNormalizedStudioSlideLayerOrder === 'function'
        ? domApi.getNormalizedStudioSlideLayerOrder
        : null;
    if (!readLayerOrder) {
      return [];
    }
    return readLayerOrder(slide, options.domOptions || {});
  }

  function applyStudioEditorSlideLayerOrder(slide, orderedElements, options = {}) {
    const domApi = resolveDomApi(options);
    const writeLayerOrder = typeof options.layerOrderWriter === 'function'
      ? options.layerOrderWriter
      : domApi
        && typeof domApi.applyStudioSlideLayerOrder === 'function'
        ? domApi.applyStudioSlideLayerOrder
        : null;
    if (!writeLayerOrder) {
      return [];
    }
    return writeLayerOrder(slide, orderedElements);
  }

  return {
    getStudioEditorNormalizedSlideLayerOrder,
    applyStudioEditorSlideLayerOrder
  };
});

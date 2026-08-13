(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLiveSelectionAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioEditorLiveSelection(elements, options = {}) {
    const selectionApi = options.selectionApi && typeof options.selectionApi === 'object'
      ? options.selectionApi
      : null;
    const getLiveSelection = selectionApi
      && typeof selectionApi.getStudioLiveSelection === 'function'
      ? selectionApi.getStudioLiveSelection
      : null;
    if (!getLiveSelection) {
      return null;
    }

    const selectionOptions = typeof options.getSelectionOptions === 'function'
      ? options.getSelectionOptions()
      : options.selectionOptions;
    return getLiveSelection(elements, selectionOptions);
  }

  return {
    getStudioEditorLiveSelection
  };
});

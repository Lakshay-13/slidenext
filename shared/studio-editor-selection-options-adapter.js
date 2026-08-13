(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionOptionsAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildStudioEditorSelectionOptions(options = {}) {
    const selectionApi = options.selectionApi && typeof options.selectionApi === 'object'
      ? options.selectionApi
      : null;
    const buildSelectionOptions = selectionApi
      && typeof selectionApi.buildStudioEditorSelectionOptions === 'function'
      ? selectionApi.buildStudioEditorSelectionOptions
      : null;
    if (!buildSelectionOptions) {
      return null;
    }
    return buildSelectionOptions(options.selectionOptions || {});
  }

  return {
    buildStudioEditorSelectionOptions
  };
});

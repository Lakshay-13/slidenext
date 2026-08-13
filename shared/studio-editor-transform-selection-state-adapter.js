(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTransformSelectionStateAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildStudioEditorTransformSelectionState(elements, options = {}) {
    const transformApi = options.transformApi && typeof options.transformApi === 'object'
      ? options.transformApi
      : null;
    const buildSelectionState = typeof options.selectionStateBuilder === 'function'
      ? options.selectionStateBuilder
      : transformApi
        && typeof transformApi.buildStudioTransformSelectionState === 'function'
        ? transformApi.buildStudioTransformSelectionState
        : null;
    if (!buildSelectionState) {
      return null;
    }
    return buildSelectionState(elements, options.selectionOptions || {});
  }

  return {
    buildStudioEditorTransformSelectionState
  };
});

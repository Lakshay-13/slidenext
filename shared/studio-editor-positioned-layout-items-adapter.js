(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPositionedLayoutItemsAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildStudioEditorPositionedLayoutItems(elements, options = {}) {
    const transformApi = options.transformApi && typeof options.transformApi === 'object'
      ? options.transformApi
      : null;
    const buildLayoutItems = typeof options.layoutItemsBuilder === 'function'
      ? options.layoutItemsBuilder
      : transformApi
        && typeof transformApi.buildStudioPositionedLayoutItems === 'function'
        ? transformApi.buildStudioPositionedLayoutItems
        : null;
    if (!buildLayoutItems) {
      return null;
    }
    return buildLayoutItems(elements, options.layoutOptions || {});
  }

  return {
    buildStudioEditorPositionedLayoutItems
  };
});

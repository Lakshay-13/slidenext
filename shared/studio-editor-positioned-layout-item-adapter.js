(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPositionedLayoutItemAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildStudioEditorPositionedLayoutItem(element, options = {}) {
    const transformApi = options.transformApi && typeof options.transformApi === 'object'
      ? options.transformApi
      : null;
    const buildLayoutItem = typeof options.layoutItemBuilder === 'function'
      ? options.layoutItemBuilder
      : transformApi
        && typeof transformApi.buildStudioPositionedLayoutItem === 'function'
        ? transformApi.buildStudioPositionedLayoutItem
        : null;
    if (!buildLayoutItem) {
      return null;
    }
    return buildLayoutItem(element, options.layoutOptions || {});
  }

  return {
    buildStudioEditorPositionedLayoutItem
  };
});

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorFreeformPositionAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isStudioEditorFreeformPositioned(element, options = {}) {
    const transformApi = options.transformApi && typeof options.transformApi === 'object'
      ? options.transformApi
      : null;
    const readFreeformPosition = typeof options.freeformPositionReader === 'function'
      ? options.freeformPositionReader
      : transformApi
        && typeof transformApi.isStudioFreeformPositioned === 'function'
        ? transformApi.isStudioFreeformPositioned
        : null;
    if (!readFreeformPosition) {
      return false;
    }
    return readFreeformPosition(element, options.positionOptions);
  }

  return {
    isStudioEditorFreeformPositioned
  };
});

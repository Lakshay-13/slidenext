(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayoutModeController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLayoutModeController(options = {}) {
    const layoutModeApi = options.layoutModeApi
      || (root && root.SlideNextStudioEditorLayoutMode)
      || null;
    const layoutModeViewApi = options.layoutModeViewApi
      || (root && root.SlideNextStudioEditorLayoutModeView)
      || null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
      ? options.resolveCanonicalDeck
      : null;
    const resolveActiveSlideId = typeof options.resolveActiveSlideId === 'function'
      ? options.resolveActiveSlideId
      : () => '';

    function sync(sourceDoc = null) {
      if (!layoutModeViewApi
        || typeof layoutModeViewApi.syncStudioEditorLayoutModeLabel !== 'function'
        || !layoutModeApi
        || typeof layoutModeApi.resolveStudioCanonicalLayoutMode !== 'function'
        || !resolveCanonicalDeck) {
        return false;
      }

      let canonicalDeck = null;
      try {
        canonicalDeck = resolveCanonicalDeck(sourceDoc);
      } catch (error) {
        canonicalDeck = null;
      }

      let activeSlideId = '';
      try {
        activeSlideId = resolveActiveSlideId(sourceDoc) || '';
      } catch (error) {
        activeSlideId = '';
      }

      const resolveLayoutMode = typeof layoutModeApi.resolveStudioCanonicalLayoutDisplayMode === 'function'
        ? layoutModeApi.resolveStudioCanonicalLayoutDisplayMode
        : layoutModeApi.resolveStudioCanonicalLayoutMode;
      const mode = resolveLayoutMode(
        canonicalDeck,
        activeSlideId,
        { fallbackMode: '' }
      );
      return layoutModeViewApi.syncStudioEditorLayoutModeLabel({
        documentRef,
        layoutModeApi,
        mode
      });
    }

    return {
      sync
    };
  }

  return {
    createStudioEditorLayoutModeController
  };
});

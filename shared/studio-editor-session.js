(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSession = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  function shouldHandleStudioFrameLoad(expectedPresentationUrl = '', options = {}) {
    const presentationUrl = normalizeString(expectedPresentationUrl);
    if (!presentationUrl) {
      return false;
    }

    const getCurrentPresentationUrl = typeof options.getCurrentPresentationUrl === 'function'
      ? options.getCurrentPresentationUrl
      : () => options.currentPresentationUrl;
    const isEditorActive = typeof options.isEditorActive === 'function'
      ? options.isEditorActive
      : () => !!options.editorActive;

    return !!isEditorActive()
      && normalizeString(getCurrentPresentationUrl()) === presentationUrl;
  }

  function createStudioFrameLoadHandler(options = {}) {
    return () => {
      const shouldHandleLoad = typeof options.shouldHandleLoad === 'function'
        ? options.shouldHandleLoad(options.presentationUrl)
        : shouldHandleStudioFrameLoad(options.presentationUrl, options);
      if (!shouldHandleLoad) {
        return false;
      }

      if (typeof options.handleLoad === 'function') {
        options.handleLoad();
      }
      if (typeof options.afterLoad === 'function') {
        options.afterLoad();
      }

      return true;
    };
  }

  return {
    shouldHandleStudioFrameLoad,
    createStudioFrameLoadHandler
  };
});

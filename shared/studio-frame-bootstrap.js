(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioFrameBootstrap = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function runStudioFrameBootstrap(doc, options = {}) {
    const setupIframeDragging = typeof options.setupIframeDragging === 'function'
      ? options.setupIframeDragging
      : () => {};
    const generateThumbnails = typeof options.generateThumbnails === 'function'
      ? options.generateThumbnails
      : () => {};
    const syncStudioChromeToActiveSlide = typeof options.syncStudioChromeToActiveSlide === 'function'
      ? options.syncStudioChromeToActiveSlide
      : () => false;
    const setActiveSlide = typeof options.setActiveSlide === 'function'
      ? options.setActiveSlide
      : () => {};
    const bindDeckNavigationSync = typeof options.bindDeckNavigationSync === 'function'
      ? options.bindDeckNavigationSync
      : () => false;
    const observeDeckActiveSlideState = typeof options.observeDeckActiveSlideState === 'function'
      ? options.observeDeckActiveSlideState
      : () => {};
    const captureInitialHistoryState = typeof options.captureInitialHistoryState === 'function'
      ? options.captureInitialHistoryState
      : () => {};

    setupIframeDragging(doc);
    generateThumbnails(doc);

    const didSyncActiveSlide = !!syncStudioChromeToActiveSlide(doc);
    if (!didSyncActiveSlide) {
      setActiveSlide(0);
    }

    const didBindDeckNavigationSync = !!bindDeckNavigationSync(doc);
    observeDeckActiveSlideState(doc);
    captureInitialHistoryState(doc);

    return {
      didSyncActiveSlide,
      didSetFallbackSlide: !didSyncActiveSlide,
      didBindDeckNavigationSync
    };
  }

  return {
    runStudioFrameBootstrap
  };
});

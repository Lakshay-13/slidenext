(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorNavigationUiBridge = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorNavigationUiBridge(options = {}) {
    const navigationSync = options.navigationSync || null;
    const thumbnailController = options.thumbnailController || null;

    function invoke(target, method, args = []) {
      if (!target || typeof target[method] !== 'function') return false;
      try {
        return target[method](...args);
      } catch (error) {
        return false;
      }
    }

    return {
      syncStudioChromeToActiveSlide: (doc, syncOptions = {}) =>
        invoke(navigationSync, 'sync', [doc, syncOptions]),
      bindDeckNavigationSync: (doc) => invoke(navigationSync, 'bind', [doc]),
      teardownDeckActiveSlideSync: () => invoke(navigationSync, 'teardown'),
      scheduleStudioChromeSync: (doc) => invoke(navigationSync, 'schedule', [doc]),
      observeDeckActiveSlideState: (doc) => invoke(navigationSync, 'observe', [doc]),
      setActiveSlide: (index, slideOptions = {}) =>
        invoke(navigationSync, 'setActiveSlide', [index, slideOptions]),
      navigateEditorSlide: (direction = 0) => invoke(navigationSync, 'navigate', [direction]),
      updateIframeNavigationUI: (doc, slides) =>
        invoke(navigationSync, 'updateIframeNavigationUi', [doc, slides]),
      updateActiveThumbnailCardState: (activeSlideId) =>
        invoke(thumbnailController, 'syncActiveSlideCard', [activeSlideId])
    };
  }

  return {
    createStudioEditorNavigationUiBridge
  };
});

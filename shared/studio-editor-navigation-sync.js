(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorNavigationSync = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorNavigationSync(options = {}) {
    const activeSlideController = options.activeSlideController || null;
    const navigationController = options.navigationController || null;
    const deckViewApi = options.deckViewApi || null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const updateTemplateActionState = typeof options.updateTemplateActionState === 'function'
      ? options.updateTemplateActionState
      : null;
    const updateMasterSlideActionState = typeof options.updateMasterSlideActionState === 'function'
      ? options.updateMasterSlideActionState
      : null;
    const updateAssetLibraryState = typeof options.updateAssetLibraryState === 'function'
      ? options.updateAssetLibraryState
      : null;
    const syncLayoutModeControl = typeof options.syncLayoutModeControl === 'function'
      ? options.syncLayoutModeControl
      : null;

    let observer = null;
    let syncTimer = null;

    function invokeAuxiliarySync(callback, doc) {
      if (typeof callback !== 'function') return;
      try {
        callback(doc);
      } catch (error) {
        // One auxiliary panel must not block the remaining navigation sync.
      }
    }

    function sync(doc = getDocument(), syncOptions = {}) {
      const didSync = activeSlideController
        && typeof activeSlideController.sync === 'function'
        ? activeSlideController.sync(doc, syncOptions)
        : false;
      invokeAuxiliarySync(syncLayoutModeControl, doc);
      invokeAuxiliarySync(updateTemplateActionState, doc);
      invokeAuxiliarySync(updateMasterSlideActionState, doc);
      invokeAuxiliarySync(updateAssetLibraryState, doc);
      return didSync;
    }

    function bind(doc = getDocument()) {
      return navigationController && typeof navigationController.bind === 'function'
        ? navigationController.bind(doc)
        : false;
    }

    function teardown() {
      if (!deckViewApi || typeof deckViewApi.teardownStudioDeckActiveSlideSync !== 'function') {
        observer = null;
        syncTimer = null;
        return false;
      }
      const nextSyncState = deckViewApi.teardownStudioDeckActiveSlideSync({
        observer,
        timer: syncTimer
      });
      observer = nextSyncState.observer;
      syncTimer = nextSyncState.timer;
      return true;
    }

    function schedule(doc = getDocument()) {
      if (!doc
        || !deckViewApi
        || typeof deckViewApi.scheduleStudioDeckActiveSlideSync !== 'function') {
        return false;
      }
      syncTimer = deckViewApi.scheduleStudioDeckActiveSlideSync(syncTimer, () => {
        syncTimer = null;
        sync(doc);
      });
      return true;
    }

    function observe(doc = getDocument()) {
      teardown();
      if (!deckViewApi || typeof deckViewApi.observeStudioDeckActiveSlideState !== 'function') {
        return false;
      }
      const nextObserverState = deckViewApi.observeStudioDeckActiveSlideState(doc, {
        scheduleSync: (nextDoc) => schedule(nextDoc)
      });
      observer = nextObserverState.observer;
      return nextObserverState.didObserve;
    }

    function setActiveSlide(index, nextOptions = {}) {
      return navigationController && typeof navigationController.setActiveSlide === 'function'
        ? navigationController.setActiveSlide(index, nextOptions)
        : false;
    }

    function navigate(direction = 0) {
      return navigationController && typeof navigationController.navigate === 'function'
        ? navigationController.navigate(direction)
        : false;
    }

    function updateIframeNavigationUi(doc, slides) {
      return navigationController && typeof navigationController.updateIframeNavigationUi === 'function'
        ? navigationController.updateIframeNavigationUi(doc, slides)
        : false;
    }

    return {
      sync,
      bind,
      teardown,
      schedule,
      observe,
      setActiveSlide,
      navigate,
      updateIframeNavigationUi,
      getSyncState: () => ({ observer, syncTimer })
    };
  }

  return {
    createStudioEditorNavigationSync
  };
});

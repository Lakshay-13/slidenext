(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorNavigationAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const RUNTIME_OPTION_NAMES = [
    'navigationRuntimeApi',
    'navigationApi',
    'activeSlideApi',
    'navigationSyncApi',
    'thumbnailApi',
    'deckViewApi',
    'activeSlideView',
    'wallpaperView',
    'thumbnailView',
    'notesView',
    'deckSnapshotApi',
    'canonicalSlideApi',
    'isCanonicalDeck',
    'transactionApi',
    'documentRef',
    'getDocument',
    'getWindow',
    'getSlides',
    'getCurrentSlideIndex',
    'syncStudioChromeToActiveSlide',
    'syncLayoutModeControl',
    'getPreserveSelection',
    'setPreserveSelection',
    'updateCurrentPresentationSessionState',
    'setCurrentSlideId',
    'updateActiveThumbnailCardState',
    'updateInsertionActionState',
    'updateZoomActionState',
    'updateWallpaperActionState',
    'deselectElement',
    'updateLayersList',
    'buildEditorDeckSnapshot',
    'buildEditorCanonicalDeck',
    'resolveCanonicalDeck',
    'saveHistoryState',
    'getActiveSlide',
    'getSlideId',
    'updateIframeNavigationUI',
    'pruneEditorChromeNodes',
    'resolveReadyState',
    'rgbToHex',
    'getWallpaperTab',
    'setWallpaperTab',
    'setCustomGradientType',
    'updateTemplateActionState',
    'updateMasterSlideActionState',
    'updateAssetLibraryState',
    'buildDeckSnapshot',
    'getActiveSlideIndex',
    'onSelectSlide',
    'onDeleteSlide',
    'reorderSlidesById'
  ];

  function createStudioEditorNavigationAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorNavigationShellRuntime;
    const runtimeOptions = {};
    RUNTIME_OPTION_NAMES.forEach((name) => {
      if (Object.prototype.hasOwnProperty.call(options, name)) {
        runtimeOptions[name] = options[name];
      }
    });
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorNavigationShellRuntime === 'function'
      ? runtimeApi.createStudioEditorNavigationShellRuntime(runtimeOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorNavigationAccessors };
});

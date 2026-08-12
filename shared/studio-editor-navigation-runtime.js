(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorNavigationRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorNavigationRuntime(options = {}) {
    const navigationApi = options.navigationApi
      && typeof options.navigationApi.createStudioEditorNavigationController === 'function'
      ? options.navigationApi
      : null;
    const activeSlideApi = options.activeSlideApi
      && typeof options.activeSlideApi.createStudioEditorActiveSlideController === 'function'
      ? options.activeSlideApi
      : null;
    const navigationSyncApi = options.navigationSyncApi
      && typeof options.navigationSyncApi.createStudioEditorNavigationSync === 'function'
      ? options.navigationSyncApi
      : null;
    const thumbnailApi = options.thumbnailApi
      && typeof options.thumbnailApi.createStudioEditorThumbnailController === 'function'
      ? options.thumbnailApi
      : null;

    const navigationController = navigationApi
      ? navigationApi.createStudioEditorNavigationController({
          deckViewApi: options.deckViewApi,
          getDocument: options.getDocument,
          getWindow: options.getWindow,
          getSlides: options.getSlides,
          getCurrentSlideIndex: options.getCurrentSlideIndex,
          syncStudioChromeToActiveSlide: options.syncStudioChromeToActiveSlide
        })
      : null;
    const activeSlideController = activeSlideApi
      ? activeSlideApi.createStudioEditorActiveSlideController({
          activeSlideView: options.activeSlideView,
          wallpaperView: options.wallpaperView,
          thumbnailView: options.thumbnailView,
          notesView: options.notesView,
          deckViewApi: options.deckViewApi,
          deckSnapshotApi: options.deckSnapshotApi,
          documentRef: options.documentRef,
          getCurrentSlideIndex: options.getCurrentSlideIndex,
          getPreserveSelection: options.getPreserveSelection,
          setPreserveSelection: options.setPreserveSelection,
          updateCurrentPresentationSessionState: options.updateCurrentPresentationSessionState,
          setCurrentSlideId: options.setCurrentSlideId,
          updateActiveThumbnailCardState: options.updateActiveThumbnailCardState,
          updateInsertionActionState: options.updateInsertionActionState,
          updateZoomActionState: options.updateZoomActionState,
          updateWallpaperActionState: options.updateWallpaperActionState,
          deselectElement: options.deselectElement,
          updateLayersList: options.updateLayersList,
          buildEditorDeckSnapshot: options.buildEditorDeckSnapshot,
          buildEditorCanonicalDeck: options.buildEditorCanonicalDeck,
          saveHistoryState: options.saveHistoryState,
          getSlides: options.getSlides,
          getActiveSlide: options.getActiveSlide,
          getSlideId: options.getSlideId,
          updateIframeNavigationUI: options.updateIframeNavigationUI,
          pruneEditorChromeNodes: options.pruneEditorChromeNodes,
          resolveReadyState: options.resolveReadyState,
          rgbToHex: options.rgbToHex,
          getWallpaperTab: options.getWallpaperTab,
          setWallpaperTab: options.setWallpaperTab,
          setCustomGradientType: options.setCustomGradientType
        })
      : null;
    const navigationSync = navigationSyncApi
      ? navigationSyncApi.createStudioEditorNavigationSync({
          activeSlideController,
          navigationController,
          deckViewApi: options.deckViewApi,
          getDocument: options.getDocument,
          updateTemplateActionState: options.updateTemplateActionState,
          updateMasterSlideActionState: options.updateMasterSlideActionState,
          updateAssetLibraryState: options.updateAssetLibraryState,
          syncLayoutModeControl: options.syncLayoutModeControl
        })
      : null;
    const thumbnailController = thumbnailApi
      ? thumbnailApi.createStudioEditorThumbnailController({
          thumbnailView: options.thumbnailView,
          documentRef: options.documentRef,
          getDocument: options.getDocument,
          buildDeckSnapshot: options.buildDeckSnapshot,
          getActiveSlideIndex: options.getActiveSlideIndex,
          onSelectSlide: options.onSelectSlide,
          reorderSlidesById: options.reorderSlidesById
        })
      : null;

    return {
      navigationController,
      activeSlideController,
      navigationSync,
      thumbnailController
    };
  }

  return {
    createStudioEditorNavigationRuntime
  };
});

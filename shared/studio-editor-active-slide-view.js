(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorActiveSlideView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function syncStudioActiveSlideChrome(doc, options = {}) {
    const getCurrentSlideIndex = typeof options.getCurrentSlideIndex === 'function'
      ? options.getCurrentSlideIndex
      : () => 0;
    const previousIndex = getCurrentSlideIndex();
    const preserveSelection = !!options.preserveSelection
      || (typeof options.getPreserveSelectionOnNextActiveSlideSync === 'function'
        && !!options.getPreserveSelectionOnNextActiveSlideSync());
    const updateCurrentPresentationSessionState = typeof options.updateCurrentPresentationSessionState === 'function'
      ? options.updateCurrentPresentationSessionState
      : () => {};
    const updateActiveThumbnailCardState = typeof options.updateActiveThumbnailCardState === 'function'
      ? options.updateActiveThumbnailCardState
      : () => {};
    const setSlideCountLabel = typeof options.setSlideCountLabel === 'function'
      ? options.setSlideCountLabel
      : () => {};
    const refreshActionStateChrome = typeof options.refreshActionStateChrome === 'function'
      ? options.refreshActionStateChrome
      : () => {};
    const syncSelectionChrome = typeof options.syncSelectionChrome === 'function'
      ? options.syncSelectionChrome
      : () => {};
    const clearPreserveSelectionRequest = () => {
      if (typeof options.setPreserveSelectionOnNextActiveSlideSync === 'function') {
        options.setPreserveSelectionOnNextActiveSlideSync(false);
      }
    };
    const buildEditorDeckSnapshot = typeof options.buildEditorDeckSnapshot === 'function'
      ? options.buildEditorDeckSnapshot
      : () => ({ slides: [] });
    const resolveActiveSlideIndex = typeof options.resolveStudioActiveSlideIndex === 'function'
      ? options.resolveStudioActiveSlideIndex
      : (deckSnapshot, fallbackIndex) => fallbackIndex;
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : () => {};
    const syncStudioActiveSlideView = typeof options.syncStudioActiveSlideView === 'function'
      ? options.syncStudioActiveSlideView
      : () => ({ didSync: false });

    const syncToDeckSnapshotFallback = (deckSnapshot) => {
      const slideCount = Array.isArray(deckSnapshot && deckSnapshot.slides)
        ? deckSnapshot.slides.length
        : 0;
      if (slideCount === 0) {
        updateCurrentPresentationSessionState({ slideIndex: 0 });
        updateActiveThumbnailCardState('');
        setSlideCountLabel('0 / 0');
        refreshActionStateChrome(doc);
        syncSelectionChrome(preserveSelection);
        clearPreserveSelectionRequest();
        return false;
      }

      const activeIndex = resolveActiveSlideIndex(deckSnapshot, getCurrentSlideIndex());
      const activeSlideSnapshot = deckSnapshot.slides[activeIndex] || null;
      const activeSlideId = activeSlideSnapshot ? activeSlideSnapshot.id : '';
      updateCurrentPresentationSessionState({ slideIndex: activeIndex });
      updateActiveThumbnailCardState(activeSlideId);
      setSlideCountLabel(`${activeIndex + 1} / ${slideCount}`);
      refreshActionStateChrome(doc);
      syncSelectionChrome(preserveSelection);
      clearPreserveSelectionRequest();
      if (options.captureHistory && activeSlideSnapshot && previousIndex !== getCurrentSlideIndex()) {
        saveHistoryState(false);
      }
      return !!activeSlideSnapshot;
    };

    if (!doc) {
      return syncToDeckSnapshotFallback(buildEditorDeckSnapshot(doc));
    }

    const nextViewState = syncStudioActiveSlideView(doc, {
      normalizeViewport: options.normalizeViewport,
      preserveSelection,
      getSlides: options.getSlides,
      setCurrentSlideIndex: (nextIndex) => {
        updateCurrentPresentationSessionState({ slideIndex: nextIndex });
      },
      updateActiveThumbnailCardState,
      setSlideCountLabel,
      deselectElement: options.deselectElement,
      applyViewportTransform: options.applyViewportTransform,
      pruneEditorChromeNodes: options.pruneEditorChromeNodes,
      getSlideId: options.getSlideId,
      updateIframeNavigationUI: options.updateIframeNavigationUI
    });
    if (!nextViewState || !nextViewState.didSync) {
      return syncToDeckSnapshotFallback(buildEditorDeckSnapshot(doc));
    }

    const activeSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide(doc)
      : null;
    const syncCustomGradientControls = typeof options.syncCustomGradientControls === 'function'
      ? options.syncCustomGradientControls
      : () => false;
    const syncWallpaperTabChrome = typeof options.syncWallpaperTabChrome === 'function'
      ? options.syncWallpaperTabChrome
      : () => false;
    const syncSolidWallpaperControl = typeof options.syncSolidWallpaperControl === 'function'
      ? options.syncSolidWallpaperControl
      : () => false;
    const didSyncCustomGradientControls = syncCustomGradientControls(activeSlide);
    syncWallpaperTabChrome(activeSlide, { didSyncCustomGradientControls });
    syncSolidWallpaperControl(activeSlide);
    refreshActionStateChrome(doc);
    syncSelectionChrome(preserveSelection);
    clearPreserveSelectionRequest();
    if (options.captureHistory && previousIndex !== getCurrentSlideIndex()) {
      saveHistoryState(false);
    }
    return true;
  }

  return { syncStudioActiveSlideChrome };
});

(function (root, factory) {
  const historyResultApi = typeof module === 'object' && module.exports
    ? require('./studio-editor-history-result.js')
    : root && root.SlideNextStudioEditorHistoryResult;
  const api = factory(historyResultApi);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorActiveSlideView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (historyResultApi) {
  const isStudioHistoryCaptureFailure = historyResultApi
    && typeof historyResultApi.isStudioHistoryCaptureFailure === 'function'
    ? historyResultApi.isStudioHistoryCaptureFailure
    : (value) => value === false
      || (!!value && typeof value === 'object' && value.didCapture === false);

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
    const setCurrentSlideId = typeof options.setCurrentSlideId === 'function'
      ? options.setCurrentSlideId
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
    const buildEditorCanonicalDeck = typeof options.buildEditorCanonicalDeck === 'function'
      ? options.buildEditorCanonicalDeck
      : null;
    const resolveActiveSlideIndex = typeof options.resolveStudioActiveSlideIndex === 'function'
      ? options.resolveStudioActiveSlideIndex
      : (deckSnapshot, fallbackIndex) => fallbackIndex;
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : () => {};
    const syncStudioActiveSlideView = typeof options.syncStudioActiveSlideView === 'function'
      ? options.syncStudioActiveSlideView
      : () => ({ didSync: false });
    const syncSpeakerNotesControl = typeof options.syncSpeakerNotesControl === 'function'
      ? options.syncSpeakerNotesControl
      : () => {};
    const syncSlideSectionControl = typeof options.syncSlideSectionControl === 'function'
      ? options.syncSlideSectionControl
      : () => {};

    const captureSlideNavigationHistory = (sourceDoc) => {
      let historyResult;
      if (buildEditorCanonicalDeck) {
        let canonicalDeck = null;
        try {
          canonicalDeck = buildEditorCanonicalDeck(sourceDoc);
        } catch (err) {
          canonicalDeck = null;
        }
        if (canonicalDeck) {
          historyResult = saveHistoryState(false, null, canonicalDeck);
        } else {
          historyResult = saveHistoryState(false);
        }
      } else {
        historyResult = saveHistoryState(false);
      }
      return !isStudioHistoryCaptureFailure(historyResult);
    };

    const syncToDeckSnapshotFallback = (deckSnapshot) => {
      const slideCount = Array.isArray(deckSnapshot && deckSnapshot.slides)
        ? deckSnapshot.slides.length
        : 0;
      if (slideCount === 0) {
      syncSpeakerNotesControl(null);
        syncSlideSectionControl(null);
        setCurrentSlideId('');
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
      syncSpeakerNotesControl(activeSlideSnapshot);
      syncSlideSectionControl(activeSlideSnapshot);
      updateCurrentPresentationSessionState({ slideIndex: activeIndex });
      setCurrentSlideId(activeSlideId);
      updateActiveThumbnailCardState(activeSlideId);
      setSlideCountLabel(`${activeIndex + 1} / ${slideCount}`);
      refreshActionStateChrome(doc);
      syncSelectionChrome(preserveSelection);
      clearPreserveSelectionRequest();
      if (options.captureHistory && activeSlideSnapshot && previousIndex !== getCurrentSlideIndex()) {
        if (!captureSlideNavigationHistory(doc)) return false;
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
      setCurrentSlideId,
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
    const canonicalDeckSnapshot = buildEditorDeckSnapshot(doc);
    const canonicalSlides = canonicalDeckSnapshot && Array.isArray(canonicalDeckSnapshot.slides)
      ? canonicalDeckSnapshot.slides
      : [];
    const canonicalActiveSlide = canonicalSlides.length > 0
      ? canonicalSlides[resolveActiveSlideIndex(canonicalDeckSnapshot, getCurrentSlideIndex())] || null
      : null;
    const activeSlideMetadata = canonicalActiveSlide || activeSlide;
    let activeSlideId = canonicalActiveSlide && canonicalActiveSlide.id
      ? canonicalActiveSlide.id
      : '';
    if (activeSlide) {
      if (typeof options.getSlideId === 'function') {
        try {
          activeSlideId = options.getSlideId(activeSlide) || activeSlideId;
        } catch (error) {
          // Preserve the canonical snapshot ID when the DOM reader fails.
        }
      } else {
        activeSlideId = activeSlide.id
          || (activeSlide.dataset && activeSlide.dataset.slideId)
          || activeSlideId;
      }
    }
    setCurrentSlideId(activeSlideId);
    syncSpeakerNotesControl(activeSlideMetadata);
    syncSlideSectionControl(activeSlideMetadata);
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
      if (!captureSlideNavigationHistory(doc)) return false;
    }
    return true;
  }

  return { syncStudioActiveSlideChrome };
});

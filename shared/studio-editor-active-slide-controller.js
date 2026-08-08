(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorActiveSlideController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorActiveSlideController(options = {}) {
    const activeSlideView = options.activeSlideView
      || (root && root.SlideNextStudioEditorActiveSlideView)
      || null;
    const wallpaperView = options.wallpaperView
      || (root && root.SlideNextStudioEditorWallpaperView)
      || null;
    const thumbnailView = options.thumbnailView
      || (root && root.SlideNextStudioEditorThumbnailView)
      || null;
    const notesView = options.notesView
      || (root && root.SlideNextStudioEditorNotes)
      || null;
    const deckViewApi = options.deckViewApi
      || (root && root.SlideNextStudioDeckView)
      || null;
    const deckSnapshotApi = options.deckSnapshotApi
      || (root && root.SlideNextStudioDeckSnapshot)
      || null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    const getCurrentSlideIndex = typeof options.getCurrentSlideIndex === 'function'
      ? options.getCurrentSlideIndex
      : () => 0;
    const getPreserveSelection = typeof options.getPreserveSelection === 'function'
      ? options.getPreserveSelection
      : () => false;
    const setPreserveSelection = typeof options.setPreserveSelection === 'function'
      ? options.setPreserveSelection
      : () => {};
    const updateCurrentPresentationSessionState = typeof options.updateCurrentPresentationSessionState === 'function'
      ? options.updateCurrentPresentationSessionState
      : () => {};
    const updateActiveThumbnailCardState = typeof options.updateActiveThumbnailCardState === 'function'
      ? options.updateActiveThumbnailCardState
      : () => {};
    const updateInsertionActionState = typeof options.updateInsertionActionState === 'function'
      ? options.updateInsertionActionState
      : () => {};
    const updateZoomActionState = typeof options.updateZoomActionState === 'function'
      ? options.updateZoomActionState
      : () => {};
    const updateWallpaperActionState = typeof options.updateWallpaperActionState === 'function'
      ? options.updateWallpaperActionState
      : () => {};
    const deselectElement = typeof options.deselectElement === 'function'
      ? options.deselectElement
      : () => {};
    const updateLayersList = typeof options.updateLayersList === 'function'
      ? options.updateLayersList
      : () => {};
    const buildEditorDeckSnapshot = typeof options.buildEditorDeckSnapshot === 'function'
      ? options.buildEditorDeckSnapshot
      : () => ({ slides: [] });
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : () => {};
    const getSlides = typeof options.getSlides === 'function'
      ? options.getSlides
      : () => [];
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : () => '';
    const updateIframeNavigationUI = typeof options.updateIframeNavigationUI === 'function'
      ? options.updateIframeNavigationUI
      : () => {};
    const pruneEditorChromeNodes = typeof options.pruneEditorChromeNodes === 'function'
      ? options.pruneEditorChromeNodes
      : () => {};
    const resolveReadyState = typeof options.resolveReadyState === 'function'
      ? options.resolveReadyState
      : () => ({ canUseDeckActions: false });
    const rgbToHex = typeof options.rgbToHex === 'function' ? options.rgbToHex : null;
    const getWallpaperTab = typeof options.getWallpaperTab === 'function'
      ? options.getWallpaperTab
      : () => '';
    const setWallpaperTab = typeof options.setWallpaperTab === 'function'
      ? options.setWallpaperTab
      : () => {};
    const setCustomGradientType = typeof options.setCustomGradientType === 'function'
      ? options.setCustomGradientType
      : () => {};

    const resolveStudioActiveSlideIndex = typeof options.resolveStudioActiveSlideIndex === 'function'
      ? options.resolveStudioActiveSlideIndex
      : (deckSnapshot, fallbackIndex) => {
          if (deckSnapshotApi && typeof deckSnapshotApi.resolveStudioActiveSlideIndex === 'function') {
            return deckSnapshotApi.resolveStudioActiveSlideIndex(deckSnapshot, fallbackIndex);
          }
          return fallbackIndex;
        };
    const syncStudioActiveSlideView = typeof options.syncStudioActiveSlideView === 'function'
      ? options.syncStudioActiveSlideView
      : (doc, viewOptions) => (
          deckViewApi && typeof deckViewApi.syncStudioActiveSlideView === 'function'
            ? deckViewApi.syncStudioActiveSlideView(doc, viewOptions)
            : { didSync: false }
        );

    function canEdit(activeSlide) {
      const actionState = resolveReadyState();
      return !!activeSlide && !!(actionState && actionState.canUseDeckActions);
    }

    function setSlideCountLabel(label) {
      if (thumbnailView && typeof thumbnailView.setStudioThumbnailSlideCount === 'function') {
        return thumbnailView.setStudioThumbnailSlideCount({
          documentRef,
          label
        });
      }
      const slideCountLabel = documentRef
        && typeof documentRef.getElementById === 'function'
        ? documentRef.getElementById('slideCountLabel')
        : null;
      if (slideCountLabel) slideCountLabel.textContent = label;
      return !!slideCountLabel;
    }

    function sync(doc, syncOptions = {}) {
      if (!activeSlideView || typeof activeSlideView.syncStudioActiveSlideChrome !== 'function') {
        return false;
      }

      return activeSlideView.syncStudioActiveSlideChrome(doc, {
        ...syncOptions,
        getCurrentSlideIndex,
        getPreserveSelectionOnNextActiveSlideSync: getPreserveSelection,
        setPreserveSelectionOnNextActiveSlideSync: setPreserveSelection,
        updateCurrentPresentationSessionState,
        updateActiveThumbnailCardState,
        setSlideCountLabel,
        refreshActionStateChrome: (nextDoc) => {
          updateInsertionActionState(nextDoc);
          updateZoomActionState(nextDoc);
          updateWallpaperActionState(nextDoc);
        },
        syncSelectionChrome: (preserveSelection) => {
          if (!preserveSelection) {
            deselectElement();
          } else {
            updateLayersList();
          }
        },
        buildEditorDeckSnapshot,
        resolveStudioActiveSlideIndex,
        saveHistoryState,
        syncStudioActiveSlideView,
        getSlides,
        deselectElement,
        applyViewportTransform: (nextDoc, activeIndex) => {
          const container = nextDoc && typeof nextDoc.getElementById === 'function'
            ? nextDoc.getElementById('slidesContainer')
            : null;
          if (container && container.style) {
            container.style.transform = 'translateX(-' + (activeIndex * 100) + 'vw)';
          }
        },
        pruneEditorChromeNodes,
        getSlideId,
        updateIframeNavigationUI,
        getActiveSlide,
        syncSpeakerNotesControl: (activeSlide) => {
          if (!notesView || typeof notesView.syncStudioSpeakerNotesControl !== 'function') return false;
          return notesView.syncStudioSpeakerNotesControl({
            documentRef,
            activeSlide,
            canEdit: canEdit(activeSlide)
          });
        },
        syncSlideSectionControl: (activeSlide) => {
          if (!notesView || typeof notesView.syncStudioSlideSectionControl !== 'function') return false;
          return notesView.syncStudioSlideSectionControl({
            documentRef,
            activeSlide,
            canEdit: canEdit(activeSlide)
          });
        },
        syncCustomGradientControls: (activeSlide) => {
          if (!wallpaperView || typeof wallpaperView.syncStudioCustomGradientControls !== 'function') return false;
          const result = wallpaperView.syncStudioCustomGradientControls({
            documentRef,
            activeSlide,
            rgbToHex
          });
          if (!result || !result.didApply) return false;
          setCustomGradientType(result.gradientType);
          return true;
        },
        syncWallpaperTabChrome: (activeSlide, wallpaperOptions = {}) => {
          if (!wallpaperView || typeof wallpaperView.syncStudioWallpaperTabChrome !== 'function') return false;
          const result = wallpaperView.syncStudioWallpaperTabChrome({
            documentRef,
            activeSlide,
            wallpaperTab: typeof getWallpaperTab() === 'string' ? getWallpaperTab() : '',
            didSyncCustomGradientControls: wallpaperOptions.didSyncCustomGradientControls
          });
          if (!result || !result.didApply) return false;
          setWallpaperTab(result.wallpaperTab);
          return true;
        },
        syncSolidWallpaperControl: (activeSlide) => {
          if (!wallpaperView || typeof wallpaperView.syncStudioSolidWallpaperControl !== 'function') return false;
          return wallpaperView.syncStudioSolidWallpaperControl({
            documentRef,
            activeSlide,
            rgbToHex
          });
        }
      });
    }

    return {
      sync
    };
  }

  return {
    createStudioEditorActiveSlideController
  };
});

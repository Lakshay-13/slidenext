(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorNavigationController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorNavigationController(options = {}) {
    const deckViewApi = options.deckViewApi
      || (root && root.SlideNextStudioDeckView)
      || null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getWindow = typeof options.getWindow === 'function'
      ? options.getWindow
      : () => null;
    const getSlides = typeof options.getSlides === 'function'
      ? options.getSlides
      : () => [];
    const getCurrentSlideIndex = typeof options.getCurrentSlideIndex === 'function'
      ? options.getCurrentSlideIndex
      : () => 0;
    const syncStudioChromeToActiveSlide = typeof options.syncStudioChromeToActiveSlide === 'function'
      ? options.syncStudioChromeToActiveSlide
      : () => false;

    function setActiveSlide(index, nextOptions = {}) {
      if (!deckViewApi || typeof deckViewApi.setStudioDeckActiveSlide !== 'function') {
        return false;
      }
      return deckViewApi.setStudioDeckActiveSlide(index, {
        doc: getDocument(),
        captureHistory: nextOptions.captureHistory,
        preserveSelection: !!nextOptions.preserveSelection,
        getCurrentSlideIndex,
        getSlides,
        syncStudioChromeToActiveSlide
      });
    }

    function navigate(direction = 0) {
      const doc = getDocument();
      const slides = getSlides(doc);
      if (!slides.length || !Number.isFinite(direction) || direction === 0) return false;
      const resolvedCurrentIndex = getCurrentSlideIndex();
      const currentIndex = Number.isInteger(resolvedCurrentIndex)
        ? resolvedCurrentIndex
        : 0;
      const nextIndex = Math.max(
        0,
        Math.min(slides.length - 1, currentIndex + Math.sign(direction))
      );
      if (nextIndex === currentIndex) return false;
      return setActiveSlide(nextIndex, { captureHistory: true }) !== false;
    }

    function bind(doc = getDocument()) {
      if (!deckViewApi || typeof deckViewApi.bindStudioDeckNavigationSync !== 'function') {
        return false;
      }
      return deckViewApi.bindStudioDeckNavigationSync(doc, getWindow(), {
        syncStudioChromeToActiveSlide,
        getSyncStudioChromeOptions: () => ({ captureHistory: true })
      });
    }

    function updateIframeNavigationUi(doc, slides) {
      if (!deckViewApi || typeof deckViewApi.updateStudioDeckNavigationUi !== 'function') {
        return false;
      }
      return deckViewApi.updateStudioDeckNavigationUi(doc, slides, getCurrentSlideIndex(), {
        setActiveSlide: (index) => setActiveSlide(index, { captureHistory: true })
      });
    }

    return {
      setActiveSlide,
      navigate,
      bind,
      updateIframeNavigationUi
    };
  }

  return {
    createStudioEditorNavigationController
  };
});

(function (root, factory) {
  const deckHtml = typeof module === 'object' && module.exports
    ? require('./deck-html')
    : root && root.SlideNextDeckHtml;
  const api = factory(deckHtml);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioDeckView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (deckHtml) {
  function teardownStudioDeckActiveSlideSync(state = {}, options = {}) {
    const disconnectObserver = typeof options.disconnectObserver === 'function'
      ? options.disconnectObserver
      : (observer) => observer && typeof observer.disconnect === 'function' && observer.disconnect();
    const clearTimer = typeof options.clearTimer === 'function'
      ? options.clearTimer
      : (timerId) => clearTimeout(timerId);
    const observer = state.observer || null;
    const timer = state.timer || null;

    if (observer) {
      disconnectObserver(observer);
    }
    if (timer) {
      clearTimer(timer);
    }

    return {
      observer: null,
      timer: null
    };
  }

  function scheduleStudioDeckActiveSlideSync(currentTimer, callback, options = {}) {
    const clearTimer = typeof options.clearTimer === 'function'
      ? options.clearTimer
      : (timerId) => clearTimeout(timerId);
    const scheduleTimer = typeof options.scheduleTimer === 'function'
      ? options.scheduleTimer
      : (nextCallback, delayMs) => setTimeout(nextCallback, delayMs);
    const delayMs = Number.isInteger(options.delayMs) && options.delayMs >= 0
      ? options.delayMs
      : 0;

    if (currentTimer) {
      clearTimer(currentTimer);
    }

    return scheduleTimer(callback, delayMs);
  }

  function observeStudioDeckActiveSlideState(doc, options = {}) {
    const MutationObserverCtor = typeof options.MutationObserverCtor === 'function'
      ? options.MutationObserverCtor
      : (typeof MutationObserver === 'function' ? MutationObserver : null);
    const getSlidesContainer = typeof options.getSlidesContainer === 'function'
      ? options.getSlidesContainer
      : (nextDoc) => nextDoc && typeof nextDoc.getElementById === 'function'
          ? nextDoc.getElementById('slidesContainer')
          : null;
    const shouldSyncMutation = typeof options.shouldSyncMutation === 'function'
      ? options.shouldSyncMutation
      : (mutation, slidesContainer) => {
          if (!mutation || mutation.type !== 'attributes') return false;
          if (mutation.target === slidesContainer && mutation.attributeName === 'style') return true;
          return mutation.attributeName === 'class' && !!mutation.target.classList?.contains('slide');
        };
    const scheduleSync = typeof options.scheduleSync === 'function'
      ? options.scheduleSync
      : () => {};

    if (!doc || !MutationObserverCtor) {
      return {
        didObserve: false,
        observer: null
      };
    }

    const slidesContainer = getSlidesContainer(doc);
    if (!slidesContainer) {
      return {
        didObserve: false,
        observer: null
      };
    }

    const observer = new MutationObserverCtor((mutations) => {
      const shouldSync = Array.isArray(mutations) && mutations.some((mutation) => {
        return shouldSyncMutation(mutation, slidesContainer);
      });
      if (shouldSync) {
        scheduleSync(doc);
      }
    });

    observer.observe(slidesContainer, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return {
      didObserve: true,
      observer
    };
  }

  function bindStudioDeckNavigationSync(doc, frameWin, options = {}) {
    const getGoToSlide = typeof options.getGoToSlide === 'function'
      ? options.getGoToSlide
      : (win) => win && typeof win.goToSlide === 'function' ? win.goToSlide : null;
    const isAlreadyWrapped = typeof options.isAlreadyWrapped === 'function'
      ? options.isAlreadyWrapped
      : (win) => !!(win && win.__studioGoToSlideWrapped);
    const markWrapped = typeof options.markWrapped === 'function'
      ? options.markWrapped
      : (win) => {
          if (win) {
            win.__studioGoToSlideWrapped = true;
          }
        };
    const setGoToSlide = typeof options.setGoToSlide === 'function'
      ? options.setGoToSlide
      : (win, nextGoToSlide) => {
          if (win) {
            win.goToSlide = nextGoToSlide;
          }
        };
    const syncStudioChromeToActiveSlide = typeof options.syncStudioChromeToActiveSlide === 'function'
      ? options.syncStudioChromeToActiveSlide
      : () => {};

    const originalGoToSlide = getGoToSlide(frameWin);
    if (!doc || !frameWin || typeof originalGoToSlide !== 'function' || isAlreadyWrapped(frameWin)) {
      return false;
    }

    setGoToSlide(frameWin, (index) => {
      const result = originalGoToSlide.call(frameWin, index);
      syncStudioChromeToActiveSlide(doc);
      return result;
    });
    markWrapped(frameWin);
    return true;
  }

  function syncStudioActiveSlideView(doc, options = {}) {
    const getSlides = typeof options.getSlides === 'function'
      ? options.getSlides
      : () => [];
    const setCurrentSlideIndex = typeof options.setCurrentSlideIndex === 'function'
      ? options.setCurrentSlideIndex
      : () => {};
    const updateActiveThumbnailCardState = typeof options.updateActiveThumbnailCardState === 'function'
      ? options.updateActiveThumbnailCardState
      : () => {};
    const setSlideCountLabel = typeof options.setSlideCountLabel === 'function'
      ? options.setSlideCountLabel
      : () => {};
    const deselectElement = typeof options.deselectElement === 'function'
      ? options.deselectElement
      : () => {};
    const getIsSlideActive = typeof options.getIsSlideActive === 'function'
      ? options.getIsSlideActive
      : (slide) => !!(slide && slide.classList && slide.classList.contains('slide-active'));
    const applyViewportTransform = typeof options.applyViewportTransform === 'function'
      ? options.applyViewportTransform
      : () => {};
    const pruneEditorChromeNodes = typeof options.pruneEditorChromeNodes === 'function'
      ? options.pruneEditorChromeNodes
      : () => {};
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : (slide) => slide && typeof slide.getAttribute === 'function' ? (slide.getAttribute('data-slide-id') || '') : '';
    const updateIframeNavigationUI = typeof options.updateIframeNavigationUI === 'function'
      ? options.updateIframeNavigationUI
      : () => {};
    const normalizeViewport = options.normalizeViewport !== false;

    const slides = getSlides(doc);
    if (slides.length === 0) {
      setCurrentSlideIndex(0);
      updateActiveThumbnailCardState('');
      setSlideCountLabel('0 / 0');
      deselectElement();
      return {
        didSync: false,
        activeIndex: -1,
        activeSlideId: '',
        slideCount: 0
      };
    }

    const activeIndex = slides.findIndex((slide) => getIsSlideActive(slide));
    if (activeIndex === -1) {
      return {
        didSync: false,
        activeIndex: -1,
        activeSlideId: '',
        slideCount: slides.length
      };
    }

    setCurrentSlideIndex(activeIndex);
    if (normalizeViewport) {
      applyViewportTransform(doc, activeIndex);
    }

    const activeSlide = slides[activeIndex];
    pruneEditorChromeNodes(doc, activeSlide);
    const activeSlideId = getSlideId(activeSlide);
    updateActiveThumbnailCardState(activeSlideId);
    updateIframeNavigationUI(doc, slides);
    setSlideCountLabel(`${activeIndex + 1} / ${slides.length}`);
    deselectElement();

    return {
      didSync: true,
      activeIndex,
      activeSlideId,
      slideCount: slides.length
    };
  }

  function buildStudioPreviewHtml(doc, options = {}) {
    if (!doc || !deckHtml || typeof deckHtml.buildDeckPreviewHtml !== 'function') {
      return '';
    }

    const canonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck(doc)
      : null;
    if (!canonicalDeck) {
      return '';
    }

    return deckHtml.buildDeckPreviewHtml(canonicalDeck, options.presentationUrl || '', options.deckHtmlOptions || {});
  }

  function buildStudioSourceHtml(doc, options = {}) {
    if (doc && deckHtml && typeof deckHtml.buildDeckSourceHtml === 'function') {
      const canonicalDeck = typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck(doc)
        : null;
      if (canonicalDeck) {
        return deckHtml.buildDeckSourceHtml(canonicalDeck, options.deckHtmlOptions || {});
      }
    }

    return typeof options.buildFallbackHtml === 'function'
      ? options.buildFallbackHtml(doc)
      : '';
  }

  return {
    teardownStudioDeckActiveSlideSync,
    scheduleStudioDeckActiveSlideSync,
    observeStudioDeckActiveSlideState,
    bindStudioDeckNavigationSync,
    syncStudioActiveSlideView,
    buildStudioPreviewHtml,
    buildStudioSourceHtml
  };
});

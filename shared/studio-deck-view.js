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
  const ACTIVE_THUMBNAIL_CARD_CLASS_NAME = 'glass-card p-3 border cursor-pointer relative group flex items-start gap-3 select-none transition-all border-[#7028d0] bg-[#7028d0]/5 shadow-[0_0_15px_rgba(112,40,208,0.1)]';
  const INACTIVE_THUMBNAIL_CARD_CLASS_NAME = 'glass-card p-3 border cursor-pointer relative group flex items-start gap-3 select-none transition-all border-white/5 bg-[#0a0a0a]/40 hover:border-white/20';

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
    const getSyncStudioChromeOptions = typeof options.getSyncStudioChromeOptions === 'function'
      ? options.getSyncStudioChromeOptions
      : () => options.syncStudioChromeOptions || {};

    const originalGoToSlide = getGoToSlide(frameWin);
    if (!doc || !frameWin || typeof originalGoToSlide !== 'function' || isAlreadyWrapped(frameWin)) {
      return false;
    }

    setGoToSlide(frameWin, (index) => {
      const result = originalGoToSlide.call(frameWin, index);
      syncStudioChromeToActiveSlide(doc, getSyncStudioChromeOptions(index));
      return result;
    });
    markWrapped(frameWin);
    return true;
  }

  function updateStudioDeckActiveThumbnailCardState(cards, activeSlideId, options = {}) {
    const activeClassName = options.activeClassName || ACTIVE_THUMBNAIL_CARD_CLASS_NAME;
    const inactiveClassName = options.inactiveClassName || INACTIVE_THUMBNAIL_CARD_CLASS_NAME;
    Array.from(cards || []).forEach((card) => {
      if (!card) return;
      card.className = card.dataset && card.dataset.slideId === activeSlideId
        ? activeClassName
        : inactiveClassName;
    });
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
    const preserveSelection = !!options.preserveSelection;

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
    if (!preserveSelection) {
      deselectElement();
    }

    return {
      didSync: true,
      activeIndex,
      activeSlideId,
      slideCount: slides.length
    };
  }

  function setStudioDeckActiveSlide(index, options = {}) {
    const doc = options.doc || null;
    const getSlides = typeof options.getSlides === 'function'
      ? options.getSlides
      : () => [];
    const getSlidesContainer = typeof options.getSlidesContainer === 'function'
      ? options.getSlidesContainer
      : (nextDoc) => nextDoc && typeof nextDoc.getElementById === 'function'
          ? nextDoc.getElementById('slidesContainer')
          : null;
    const setSlideContainerOffset = typeof options.setSlideContainerOffset === 'function'
      ? options.setSlideContainerOffset
      : (container, activeIndex) => {
          if (container && container.style) {
            container.style.transform = `translateX(-${activeIndex * 100}vw)`;
          }
        };
    const setSlideActiveState = typeof options.setSlideActiveState === 'function'
      ? options.setSlideActiveState
      : (slide, isActive) => {
          if (!slide || !slide.classList) return;
          if (isActive) {
            slide.classList.add('slide-active');
          } else {
            slide.classList.remove('slide-active');
          }
        };
    const syncStudioChromeToActiveSlide = typeof options.syncStudioChromeToActiveSlide === 'function'
      ? options.syncStudioChromeToActiveSlide
      : () => false;
    const captureHistory = !!options.captureHistory;
    const preserveSelection = !!options.preserveSelection;

    const slides = getSlides(doc);
    if (index < 0 || index >= slides.length) {
      return false;
    }

    const container = getSlidesContainer(doc);
    setSlideContainerOffset(container, index);
    slides.forEach((slide, slideIndex) => {
      setSlideActiveState(slide, slideIndex === index);
    });

    syncStudioChromeToActiveSlide(doc, { captureHistory, preserveSelection });
    return true;
  }

  function setStudioDeckActiveSlideById(slideId, options = {}) {
    const doc = options.doc || null;
    const getSlideIndexById = typeof options.getSlideIndexById === 'function'
      ? options.getSlideIndexById
      : () => -1;
    const activateSlideByIndex = typeof options.activateSlideByIndex === 'function'
      ? options.activateSlideByIndex
      : () => false;

    const index = getSlideIndexById(slideId, doc);
    if (index === -1) {
      return false;
    }

    activateSlideByIndex(index);
    return true;
  }

  function restoreStudioDeckViewAfterSlideMutation(options = {}) {
    const preservedActiveSlideId = typeof options.preservedActiveSlideId === 'string'
      ? options.preservedActiveSlideId
      : '';
    const removedSlideId = typeof options.removedSlideId === 'string'
      ? options.removedSlideId
      : '';
    const restoreActiveSlideById = typeof options.restoreActiveSlideById === 'function'
      ? options.restoreActiveSlideById
      : () => false;
    const restoreSelectionState = typeof options.restoreSelectionState === 'function'
      ? options.restoreSelectionState
      : () => {};
    const setActiveSlideByIndex = typeof options.setActiveSlideByIndex === 'function'
      ? options.setActiveSlideByIndex
      : () => {};
    const fallbackIndex = Number.isInteger(options.fallbackIndex)
      ? options.fallbackIndex
      : 0;
    const canRestorePreservedActiveSlide = !!preservedActiveSlideId
      && (!removedSlideId || preservedActiveSlideId !== removedSlideId);

    if (canRestorePreservedActiveSlide && restoreActiveSlideById(preservedActiveSlideId)) {
      restoreSelectionState();
      return {
        didRestorePreservedActiveSlide: true,
        activeSlideId: preservedActiveSlideId,
        fallbackIndex: null
      };
    }

    setActiveSlideByIndex(fallbackIndex);
    return {
      didRestorePreservedActiveSlide: false,
      activeSlideId: '',
      fallbackIndex
    };
  }

  function updateStudioDeckNavigationUi(doc, slides = [], currentSlideIndex, options = {}) {
    const getIndicatorDotsContainer = typeof options.getIndicatorDotsContainer === 'function'
      ? options.getIndicatorDotsContainer
      : (nextDoc) => nextDoc && typeof nextDoc.getElementById === 'function'
          ? nextDoc.getElementById('indicatorDots')
          : null;
    const createIndicatorDot = typeof options.createIndicatorDot === 'function'
      ? options.createIndicatorDot
      : (nextDoc) => nextDoc && typeof nextDoc.createElement === 'function'
          ? nextDoc.createElement('div')
          : null;
    const appendIndicatorDot = typeof options.appendIndicatorDot === 'function'
      ? options.appendIndicatorDot
      : (container, dot) => {
          if (container && dot) {
            container.appendChild(dot);
          }
        };
    const bindIndicatorDotClick = typeof options.bindIndicatorDotClick === 'function'
      ? options.bindIndicatorDotClick
      : (dot, index, setActiveSlide) => {
          if (dot && typeof dot.addEventListener === 'function') {
            dot.addEventListener('click', () => {
              setActiveSlide(index);
            });
          }
        };
    const setIndicatorDotsHtml = typeof options.setIndicatorDotsHtml === 'function'
      ? options.setIndicatorDotsHtml
      : (container, html) => {
          if (container) {
            container.innerHTML = html;
          }
        };
    const setActiveSlide = typeof options.setActiveSlide === 'function'
      ? options.setActiveSlide
      : () => {};
    const getSlideNumNode = typeof options.getSlideNumNode === 'function'
      ? options.getSlideNumNode
      : (nextDoc) => nextDoc && typeof nextDoc.getElementById === 'function'
          ? nextDoc.getElementById('slideNum')
          : null;
    const setSlideNumText = typeof options.setSlideNumText === 'function'
      ? options.setSlideNumText
      : (node, text) => {
          if (node) {
            node.textContent = text;
          }
        };
    const getProgressLineNode = typeof options.getProgressLineNode === 'function'
      ? options.getProgressLineNode
      : (nextDoc) => nextDoc && typeof nextDoc.getElementById === 'function'
          ? nextDoc.getElementById('progressLine')
          : null;
    const setProgressPercent = typeof options.setProgressPercent === 'function'
      ? options.setProgressPercent
      : (node, percent) => {
          if (node && node.style) {
            node.style.width = `${percent}%`;
          }
        };
    const getPrevButton = typeof options.getPrevButton === 'function'
      ? options.getPrevButton
      : (nextDoc) => nextDoc && typeof nextDoc.getElementById === 'function'
          ? nextDoc.getElementById('prevBtn')
          : null;
    const getNextButton = typeof options.getNextButton === 'function'
      ? options.getNextButton
      : (nextDoc) => nextDoc && typeof nextDoc.getElementById === 'function'
          ? nextDoc.getElementById('nextBtn')
          : null;
    const setButtonEnabledState = typeof options.setButtonEnabledState === 'function'
      ? options.setButtonEnabledState
      : (node, isEnabled) => {
          if (!node || !node.style) return;
          node.style.opacity = isEnabled ? '1' : '0.3';
          node.style.pointerEvents = isEnabled ? 'auto' : 'none';
        };

    const totalSlides = Array.isArray(slides) ? slides.length : 0;
    const dotsContainer = getIndicatorDotsContainer(doc);
    if (dotsContainer) {
      setIndicatorDotsHtml(dotsContainer, '');
      for (let i = 0; i < totalSlides; i += 1) {
        const dot = createIndicatorDot(doc);
        if (!dot) continue;
        dot.className = `indicator-dot ${i === currentSlideIndex ? 'active' : ''}`;
        bindIndicatorDotClick(dot, i, setActiveSlide);
        appendIndicatorDot(dotsContainer, dot);
      }
    }

    const slideNumText = getSlideNumNode(doc);
    const formattedNum = String(currentSlideIndex + 1).padStart(2, '0');
    const formattedTotal = String(totalSlides).padStart(2, '0');
    setSlideNumText(slideNumText, `${formattedNum} / ${formattedTotal}`);

    const progressLine = getProgressLineNode(doc);
    const progressPercent = totalSlides === 0 ? 0 : ((currentSlideIndex + 1) / totalSlides) * 100;
    setProgressPercent(progressLine, progressPercent);

    const prevBtn = getPrevButton(doc);
    const nextBtn = getNextButton(doc);
    setButtonEnabledState(prevBtn, currentSlideIndex !== 0);
    setButtonEnabledState(nextBtn, currentSlideIndex !== totalSlides - 1);

    return {
      totalSlides,
      currentSlideIndex,
      formattedNum,
      formattedTotal,
      progressPercent
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
    updateStudioDeckActiveThumbnailCardState,
    syncStudioActiveSlideView,
    setStudioDeckActiveSlide,
    setStudioDeckActiveSlideById,
    restoreStudioDeckViewAfterSlideMutation,
    updateStudioDeckNavigationUi,
    buildStudioPreviewHtml,
    buildStudioSourceHtml
  };
});

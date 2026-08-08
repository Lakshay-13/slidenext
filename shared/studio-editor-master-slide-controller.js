(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorMasterSlideController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorMasterSlideController(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    const renderApi = options.renderApi
      || (root && root.SlideNextDeckRender)
      || null;
    const getCanonicalDeck = typeof options.getCanonicalDeck === 'function'
      ? options.getCanonicalDeck
      : () => null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getSlides = typeof options.getSlides === 'function'
      ? options.getSlides
      : () => [];
    const prepareSlide = typeof options.prepareSlide === 'function'
      ? options.prepareSlide
      : null;
    const setActiveSlide = typeof options.setActiveSlide === 'function'
      ? options.setActiveSlide
      : null;
    const generateThumbnails = typeof options.generateThumbnails === 'function'
      ? options.generateThumbnails
      : null;
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : null;
    const triggerAutoSave = typeof options.triggerAutoSave === 'function'
      ? options.triggerAutoSave
      : null;
    const triggerAutoVersion = typeof options.triggerAutoVersion === 'function'
      ? options.triggerAutoVersion
      : null;
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    const onMasterSlidesChanged = typeof options.onMasterSlidesChanged === 'function'
      ? options.onMasterSlidesChanged
      : null;

    const readCanonicalDeckBaseline = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader({
          getCanonicalDeckBaseline,
          isCanonicalDeck: canonicalDeckApi
            && typeof canonicalDeckApi.isCanonicalDeck === 'function'
            ? canonicalDeckApi.isCanonicalDeck
            : null
        })
      : () => {
          if (!getCanonicalDeckBaseline) return null;
          try {
            return getCanonicalDeckBaseline();
          } catch (err) {
            return null;
          }
        };

    function resolveCanonicalDeck() {
      const liveCanonicalDeck = readCanonicalDeckBaseline();
      if (liveCanonicalDeck) {
        try {
          if (!canonicalDeckApi
            || typeof canonicalDeckApi.isCanonicalDeck !== 'function'
            || canonicalDeckApi.isCanonicalDeck(liveCanonicalDeck)) {
            return liveCanonicalDeck;
          }
        } catch (error) {
          // Fall through to the supplied canonical deck fallback.
        }
      }
      return getCanonicalDeck();
    }

    function renderCanonicalSlideElement(documentRef, slide, index, masterSlides) {
      if (!documentRef
        || typeof documentRef.createElement !== 'function'
        || !renderApi
        || typeof renderApi.renderCanonicalSlide !== 'function') {
        return null;
      }
      const html = renderApi.renderCanonicalSlide(slide, index, {
        masterSlides,
        preferSlideSourceHtml: false
      });
      if (typeof html !== 'string' || !html.trim()) return null;
      const template = documentRef.createElement('template');
      if (!template) return null;
      template.innerHTML = html;
      return template.content && template.content.firstElementChild
        ? template.content.firstElementChild
        : null;
    }

    function replaceActiveSlide(nextCanonicalDeck) {
      const documentRef = getDocument();
      const activeSlideId = getActiveSlideId();
      const activeSlideIndex = nextCanonicalDeck && Array.isArray(nextCanonicalDeck.slides)
        ? nextCanonicalDeck.slides.findIndex((slide) => slide && slide.id === activeSlideId)
        : -1;
      const slides = getSlides(documentRef);
      const currentSlide = Array.isArray(slides) ? slides[activeSlideIndex] : null;
      const nextSlide = activeSlideIndex >= 0 ? nextCanonicalDeck.slides[activeSlideIndex] : null;
      if (!documentRef || !currentSlide || !nextSlide) return false;

      const nextSlideElement = renderCanonicalSlideElement(
        documentRef,
        nextSlide,
        activeSlideIndex,
        nextCanonicalDeck.masterSlides
      );
      if (!nextSlideElement) return false;
      if (prepareSlide) prepareSlide(nextSlideElement);
      if (typeof currentSlide.replaceWith === 'function') {
        currentSlide.replaceWith(nextSlideElement);
      } else if (currentSlide.parentNode && typeof currentSlide.parentNode.replaceChild === 'function') {
        currentSlide.parentNode.replaceChild(nextSlideElement, currentSlide);
      } else {
        return false;
      }
      if (setActiveSlide) setActiveSlide(activeSlideIndex);
      if (generateThumbnails) generateThumbnails();
      return true;
    }

    function commitDeck(nextCanonicalDeck, versionLabel = '') {
      if (finalizeMutation) {
        finalizeMutation(versionLabel, null, nextCanonicalDeck);
      } else {
        if (saveHistoryState) saveHistoryState(false, null, nextCanonicalDeck);
        if (triggerAutoSave) triggerAutoSave();
        if (triggerAutoVersion && versionLabel) triggerAutoVersion(versionLabel);
      }
      if (onMasterSlidesChanged) {
        onMasterSlidesChanged(nextCanonicalDeck.masterSlides || [], nextCanonicalDeck);
      }
      return nextCanonicalDeck;
    }

    function saveActiveSlide(masterLike = {}) {
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.saveCanonicalMasterSlideFromSlideId !== 'function') {
        return null;
      }
      const nextCanonicalDeck = canonicalDeckApi.saveCanonicalMasterSlideFromSlideId(
        resolveCanonicalDeck(),
        getActiveSlideId(),
        masterLike
      );
      if (!nextCanonicalDeck) return null;

      const master = nextCanonicalDeck.masterSlides[nextCanonicalDeck.masterSlides.length - 1] || null;
      return commitDeck(
        nextCanonicalDeck,
        `Auto: Saved Master Layout${master && master.name ? ` "${master.name}"` : ''}`
      );
    }

    function assignMasterSlide(masterSlideId = '') {
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.updateCanonicalSlideMasterSlide !== 'function') {
        return false;
      }
      const nextCanonicalDeck = canonicalDeckApi.updateCanonicalSlideMasterSlide(
        resolveCanonicalDeck(),
        getActiveSlideId(),
        masterSlideId
      );
      if (!nextCanonicalDeck || !replaceActiveSlide(nextCanonicalDeck)) return false;

      const normalizedMasterSlideId = typeof masterSlideId === 'string'
        ? masterSlideId.trim()
        : '';
      const master = nextCanonicalDeck.masterSlides.find(
        (candidate) => candidate && candidate.id === normalizedMasterSlideId
      );
      commitDeck(
        nextCanonicalDeck,
        normalizedMasterSlideId
          ? `Auto: Applied Master Layout${master && master.name ? ` "${master.name}"` : ''}`
          : 'Auto: Cleared Master Layout'
      );
      return true;
    }

    function removeMasterSlide(masterSlideId) {
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.removeCanonicalMasterSlide !== 'function') {
        return false;
      }
      const normalizedMasterSlideId = typeof masterSlideId === 'string'
        ? masterSlideId.trim()
        : '';
      const currentDeck = resolveCanonicalDeck();
      const master = currentDeck
        && Array.isArray(currentDeck.masterSlides)
        ? currentDeck.masterSlides.find((candidate) => candidate && candidate.id === normalizedMasterSlideId)
        : null;
      const nextCanonicalDeck = canonicalDeckApi.removeCanonicalMasterSlide(
        currentDeck,
        normalizedMasterSlideId
      );
      if (!nextCanonicalDeck) return false;

      const activeSlideId = getActiveSlideId();
      const activeSlideWasDetached = currentDeck
        && Array.isArray(currentDeck.slides)
        && currentDeck.slides.some((slide) => slide && slide.id === activeSlideId && slide.masterSlideId === normalizedMasterSlideId);
      if (activeSlideWasDetached && !replaceActiveSlide(nextCanonicalDeck)) return false;

      commitDeck(
        nextCanonicalDeck,
        `Auto: Removed Master Layout${master && master.name ? ` "${master.name}"` : normalizedMasterSlideId ? ` "${normalizedMasterSlideId}"` : ''}`
      );
      return true;
    }

    return {
      saveActiveSlide,
      assignMasterSlide,
      removeMasterSlide
    };
  }

  return {
    createStudioEditorMasterSlideController
  };
});

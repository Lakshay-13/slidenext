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
    const resolveActiveSlideId = () => getActiveSlideId(getDocument());
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

    function isValidCanonicalDeck(value) {
      if (!value) return false;
      const validate = canonicalDeckApi
        && typeof canonicalDeckApi.isCanonicalDeck === 'function'
        ? canonicalDeckApi.isCanonicalDeck
        : (candidate) => !!candidate
          && typeof candidate === 'object'
          && !Array.isArray(candidate)
          && Array.isArray(candidate.slides);
      try {
        return validate(value) === true;
      } catch (err) {
        return false;
      }
    }

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
            const liveCanonicalDeck = getCanonicalDeckBaseline();
            return isValidCanonicalDeck(liveCanonicalDeck)
              ? liveCanonicalDeck
              : null;
          } catch (err) {
            return null;
          }
        };

    const sharedCanonicalDeckResolver = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckResolver === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckResolver({
          getCanonicalDeck,
          getCanonicalDeckBaseline,
          isCanonicalDeck: canonicalDeckApi
            && typeof canonicalDeckApi.isCanonicalDeck === 'function'
            ? canonicalDeckApi.isCanonicalDeck
            : null
        })
      : null;

    function resolveCanonicalDeck(sourceDocument) {
      if (typeof sharedCanonicalDeckResolver === 'function') {
        return sharedCanonicalDeckResolver(sourceDocument);
      }
      const liveCanonicalDeck = readCanonicalDeckBaseline(sourceDocument);
      if (isValidCanonicalDeck(liveCanonicalDeck)) return liveCanonicalDeck;
      const fallbackCanonicalDeck = getCanonicalDeck(sourceDocument);
      return isValidCanonicalDeck(fallbackCanonicalDeck)
        ? fallbackCanonicalDeck
        : null;
    }

    function renderCanonicalSlideElement(documentRef, slide, index, masterSlides) {
      try {
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
      } catch (err) {
        return null;
      }
    }

    function replaceActiveSlide(nextCanonicalDeck) {
      const documentRef = getDocument();
      const activeSlideId = resolveActiveSlideId();
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
      if (prepareSlide) {
        try {
          prepareSlide(nextSlideElement);
        } catch (err) {
          return false;
        }
      }
      if (typeof currentSlide.replaceWith === 'function') {
        currentSlide.replaceWith(nextSlideElement);
      } else if (currentSlide.parentNode && typeof currentSlide.parentNode.replaceChild === 'function') {
        currentSlide.parentNode.replaceChild(nextSlideElement, currentSlide);
      } else {
        return false;
      }
      if (setActiveSlide) setActiveSlide(activeSlideIndex);
      if (generateThumbnails) generateThumbnails();

      return {
        didApply: true,
        rollback() {
          if (typeof nextSlideElement.replaceWith === 'function') {
            nextSlideElement.replaceWith(currentSlide);
          } else if (nextSlideElement.parentNode
            && typeof nextSlideElement.parentNode.replaceChild === 'function') {
            nextSlideElement.parentNode.replaceChild(currentSlide, nextSlideElement);
          } else {
            return false;
          }
          if (setActiveSlide) setActiveSlide(activeSlideIndex);
          if (generateThumbnails) generateThumbnails();
          return true;
        }
      };
    }

    function commitDeck(nextCanonicalDeck, versionLabel = '', onRejected = null) {
      if (finalizeMutation) {
        const finalizeResult = finalizeMutation(versionLabel, null, nextCanonicalDeck);
        if (finalizeResult === false) {
          if (typeof onRejected === 'function') onRejected();
          return null;
        }
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
      let nextCanonicalDeck = null;
      try {
        nextCanonicalDeck = canonicalDeckApi.saveCanonicalMasterSlideFromSlideId(
          resolveCanonicalDeck(),
          resolveActiveSlideId(),
          masterLike
        );
      } catch (err) {
        return null;
      }
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
      let nextCanonicalDeck = null;
      try {
        nextCanonicalDeck = canonicalDeckApi.updateCanonicalSlideMasterSlide(
          resolveCanonicalDeck(),
          resolveActiveSlideId(),
          masterSlideId
        );
      } catch (err) {
        return false;
      }
      if (!nextCanonicalDeck) return false;
      const mutation = replaceActiveSlide(nextCanonicalDeck);
      if (!mutation || !mutation.didApply) return false;

      const normalizedMasterSlideId = typeof masterSlideId === 'string'
        ? masterSlideId.trim()
        : '';
      const master = nextCanonicalDeck.masterSlides.find(
        (candidate) => candidate && candidate.id === normalizedMasterSlideId
      );
      const committedDeck = commitDeck(
        nextCanonicalDeck,
        normalizedMasterSlideId
          ? `Auto: Applied Master Layout${master && master.name ? ` "${master.name}"` : ''}`
          : 'Auto: Cleared Master Layout',
        () => mutation.rollback()
      );
      return !!committedDeck;
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
      let nextCanonicalDeck = null;
      try {
        nextCanonicalDeck = canonicalDeckApi.removeCanonicalMasterSlide(
          currentDeck,
          normalizedMasterSlideId
        );
      } catch (err) {
        return false;
      }
      if (!nextCanonicalDeck) return false;

      const activeSlideId = resolveActiveSlideId();
      const activeSlideWasDetached = currentDeck
        && Array.isArray(currentDeck.slides)
        && currentDeck.slides.some((slide) => slide && slide.id === activeSlideId && slide.masterSlideId === normalizedMasterSlideId);
      let mutation = null;
      if (activeSlideWasDetached) {
        mutation = replaceActiveSlide(nextCanonicalDeck);
        if (!mutation || !mutation.didApply) return false;
      }

      const committedDeck = commitDeck(
        nextCanonicalDeck,
        `Auto: Removed Master Layout${master && master.name ? ` "${master.name}"` : normalizedMasterSlideId ? ` "${normalizedMasterSlideId}"` : ''}`,
        () => {
          if (mutation) mutation.rollback();
        }
      );
      return !!committedDeck;
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

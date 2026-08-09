(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTemplateController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorTemplateController(options = {}) {
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
    const getSlideContainer = typeof options.getSlideContainer === 'function'
      ? options.getSlideContainer
      : (documentRef) => documentRef && typeof documentRef.getElementById === 'function'
        ? documentRef.getElementById('slidesContainer')
        : null;
    const getSlides = typeof options.getSlides === 'function'
      ? options.getSlides
      : () => [];
    const prepareSlide = typeof options.prepareSlide === 'function'
      ? options.prepareSlide
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : null;
    const applyInsertion = typeof options.applyInsertion === 'function'
      ? options.applyInsertion
      : null;
    const generateThumbnails = typeof options.generateThumbnails === 'function'
      ? options.generateThumbnails
      : null;
    const setActiveSlide = typeof options.setActiveSlide === 'function'
      ? options.setActiveSlide
      : null;
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
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
    const onTemplatesChanged = typeof options.onTemplatesChanged === 'function'
      ? options.onTemplatesChanged
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

    function resolveCanonicalDeck() {
      const liveCanonicalDeck = readCanonicalDeckBaseline();
      if (isValidCanonicalDeck(liveCanonicalDeck)) return liveCanonicalDeck;
      const fallbackCanonicalDeck = getCanonicalDeck();
      return isValidCanonicalDeck(fallbackCanonicalDeck)
        ? fallbackCanonicalDeck
        : null;
    }

    function renderCanonicalSlideElement(documentRef, slide, index) {
      if (!documentRef
        || typeof documentRef.createElement !== 'function'
        || !renderApi
        || typeof renderApi.renderCanonicalSlide !== 'function') {
        return null;
      }
      const html = renderApi.renderCanonicalSlide(slide, index, {
        preferSlideSourceHtml: true
      });
      if (typeof html !== 'string' || !html.trim()) return null;
      const template = documentRef.createElement('template');
      if (!template) return null;
      template.innerHTML = html;
      return template.content && template.content.firstElementChild
        ? template.content.firstElementChild
        : null;
    }

    function saveActiveSlide(templateLike = {}) {
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.saveCanonicalTemplateFromSlideId !== 'function') {
        return null;
      }

      let nextCanonicalDeck = null;
      try {
        nextCanonicalDeck = canonicalDeckApi.saveCanonicalTemplateFromSlideId(
          resolveCanonicalDeck(),
          getActiveSlideId(),
          templateLike
        );
      } catch (err) {
        return null;
      }
      if (!nextCanonicalDeck) return null;

      const template = nextCanonicalDeck.templates[nextCanonicalDeck.templates.length - 1] || null;
      if (saveHistoryState) saveHistoryState(false, null, nextCanonicalDeck);
      if (triggerAutoSave) triggerAutoSave();
      if (triggerAutoVersion) {
        triggerAutoVersion(`Auto: Saved Template${template && template.name ? ` "${template.name}"` : ''}`);
      }
      if (onTemplatesChanged) onTemplatesChanged(nextCanonicalDeck.templates, nextCanonicalDeck);
      return nextCanonicalDeck;
    }

    function removeTemplate(templateId) {
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.removeCanonicalTemplate !== 'function') {
        return null;
      }

      const canonicalDeck = resolveCanonicalDeck();
      const normalizedTemplateId = typeof templateId === 'string' ? templateId.trim() : '';
      const template = canonicalDeck
        && Array.isArray(canonicalDeck.templates)
        ? canonicalDeck.templates.find((candidate) => candidate && candidate.id === normalizedTemplateId)
        : null;
      const nextCanonicalDeck = canonicalDeckApi.removeCanonicalTemplate(
        canonicalDeck,
        normalizedTemplateId
      );
      if (!nextCanonicalDeck) return null;

      if (saveHistoryState) saveHistoryState(false, null, nextCanonicalDeck);
      if (triggerAutoSave) triggerAutoSave();
      if (triggerAutoVersion) {
        triggerAutoVersion(`Auto: Removed Template${template && template.name ? ` "${template.name}"` : normalizedTemplateId ? ` "${normalizedTemplateId}"` : ''}`);
      }
      if (onTemplatesChanged) onTemplatesChanged(nextCanonicalDeck.templates, nextCanonicalDeck);
      return nextCanonicalDeck;
    }

    function insertTemplate(templateId) {
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.insertCanonicalTemplateSlide !== 'function'
        || !applyInsertion) {
        return false;
      }

      const canonicalDeck = resolveCanonicalDeck();
      const activeSlideId = getActiveSlideId();
      const activeSlideIndex = canonicalDeck && Array.isArray(canonicalDeck.slides)
        ? canonicalDeck.slides.findIndex((slide) => slide && slide.id === activeSlideId)
        : -1;
      if (!canonicalDeck || activeSlideIndex < 0) return false;

      const insertionIndex = activeSlideIndex + 1;
      const nextCanonicalDeck = canonicalDeckApi.insertCanonicalTemplateSlide(
        canonicalDeck,
        templateId,
        insertionIndex
      );
      const nextSlide = nextCanonicalDeck && nextCanonicalDeck.slides[insertionIndex];
      const documentRef = getDocument();
      const container = getSlideContainer(documentRef);
      const slides = getSlides(documentRef);
      if (!nextSlide || !documentRef || !container || !Array.isArray(slides)) return false;

      const slideElement = renderCanonicalSlideElement(documentRef, nextSlide, insertionIndex);
      if (!slideElement) return false;
      if (prepareSlide) prepareSlide(slideElement);

      if (saveHistoryState) saveHistoryState(false);
      const mutation = applyInsertion(container, slideElement, {
        beforeNode: slides[insertionIndex] || null,
        ...(getElementId ? { getElementId } : {})
      });
      if (!mutation || !mutation.didApply) return false;

      if (generateThumbnails) generateThumbnails();
      if (setActiveSlide) setActiveSlide(insertionIndex);
      const template = Array.isArray(canonicalDeck.templates)
        ? canonicalDeck.templates.find((candidate) => candidate && candidate.id === templateId)
        : null;
      const versionLabel = `Auto: Inserted Template${template && template.name ? ` "${template.name}"` : ''}`;
      if (finalizeMutation) {
        finalizeMutation(versionLabel, mutation.transaction, nextCanonicalDeck);
      } else {
        if (saveHistoryState) saveHistoryState(false, mutation.transaction, nextCanonicalDeck);
        if (triggerAutoSave) triggerAutoSave();
        if (triggerAutoVersion) triggerAutoVersion(versionLabel);
      }
      return true;
    }

    return {
      saveActiveSlide,
      removeTemplate,
      insertTemplate
    };
  }

  return {
    createStudioEditorTemplateController
  };
});

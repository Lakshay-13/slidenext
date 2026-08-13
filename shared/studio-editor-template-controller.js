(function (root, factory) {
  const historyResultApi = typeof module === 'object' && module.exports
    ? require('./studio-editor-history-result.js')
    : root && root.SlideNextStudioEditorHistoryResult;
  const api = factory(root, historyResultApi);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTemplateController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root, historyResultApi) {
  const isStudioHistoryCaptureFailure = historyResultApi
    && typeof historyResultApi.isStudioHistoryCaptureFailure === 'function'
    ? historyResultApi.isStudioHistoryCaptureFailure
    : (value) => value === false
      || (!!value && typeof value === 'object' && value.didCapture === false);
  const captureStudioHistoryState = historyResultApi
    && typeof historyResultApi.captureStudioHistoryState === 'function'
    ? historyResultApi.captureStudioHistoryState
    : (saveHistoryState, ...args) => {
        if (typeof saveHistoryState !== 'function') return false;
        try {
          return saveHistoryState(...args);
        } catch (err) {
          return false;
        }
      };

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
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
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
    const rollbackMutation = typeof options.rollbackMutation === 'function'
      ? options.rollbackMutation
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
          getPendingCanonicalDeck,
          getCanonicalDeckBaseline,
          isCanonicalDeck: canonicalDeckApi
            && typeof canonicalDeckApi.isCanonicalDeck === 'function'
            ? canonicalDeckApi.isCanonicalDeck
            : null
        })
      : (sourceDocument) => {
          if (!getCanonicalDeckBaseline) return null;
          try {
            const liveCanonicalDeck = getCanonicalDeckBaseline(sourceDocument);
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
          getPendingCanonicalDeck,
          getCanonicalDeckBaseline,
          isCanonicalDeck: canonicalDeckApi
            && typeof canonicalDeckApi.isCanonicalDeck === 'function'
            ? canonicalDeckApi.isCanonicalDeck
            : null
        })
      : null;

    function resolveCanonicalDeck(sourceDocument = getDocument()) {
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

    function commitDeck(nextCanonicalDeck, versionLabel = '') {
      if (finalizeMutation) {
        let finalizeResult = false;
        try {
          finalizeResult = finalizeMutation(versionLabel, null, nextCanonicalDeck);
        } catch (err) {
          return null;
        }
        if (finalizeResult === false) return null;
      } else {
        if (saveHistoryState
          && isStudioHistoryCaptureFailure(
            captureStudioHistoryState(saveHistoryState, false, null, nextCanonicalDeck)
          )) {
          return null;
        }
        if (triggerAutoSave) triggerAutoSave();
        if (triggerAutoVersion && versionLabel) triggerAutoVersion(versionLabel);
      }
      if (onTemplatesChanged) onTemplatesChanged(nextCanonicalDeck.templates, nextCanonicalDeck);
      return nextCanonicalDeck;
    }

    function renderCanonicalSlideElement(documentRef, slide, index) {
      try {
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
      } catch (err) {
        return null;
      }
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
          resolveActiveSlideId(),
          templateLike
        );
      } catch (err) {
        return null;
      }
      if (!nextCanonicalDeck) return null;

      const template = nextCanonicalDeck.templates[nextCanonicalDeck.templates.length - 1] || null;
      return commitDeck(
        nextCanonicalDeck,
        `Auto: Saved Template${template && template.name ? ` "${template.name}"` : ''}`
      );
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
      let nextCanonicalDeck = null;
      try {
        nextCanonicalDeck = canonicalDeckApi.removeCanonicalTemplate(
          canonicalDeck,
          normalizedTemplateId
        );
      } catch (err) {
        return null;
      }
      if (!nextCanonicalDeck) return null;

      return commitDeck(
        nextCanonicalDeck,
        `Auto: Removed Template${template && template.name ? ` "${template.name}"` : normalizedTemplateId ? ` "${normalizedTemplateId}"` : ''}`
      );
    }

    function insertTemplate(templateId) {
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.insertCanonicalTemplateSlide !== 'function'
        || !applyInsertion) {
        return false;
      }

      const canonicalDeck = resolveCanonicalDeck();
      const activeSlideId = resolveActiveSlideId();
      const activeSlideIndex = canonicalDeck
        && canonicalDeckApi
        && typeof canonicalDeckApi.findCanonicalSlideIndexById === 'function'
        ? canonicalDeckApi.findCanonicalSlideIndexById(canonicalDeck, activeSlideId)
        : canonicalDeck && Array.isArray(canonicalDeck.slides)
          ? canonicalDeck.slides.findIndex((slide) => slide && slide.id === activeSlideId)
          : -1;
      if (!canonicalDeck || activeSlideIndex < 0) return false;

      const insertionIndex = activeSlideIndex + 1;
      let nextCanonicalDeck = null;
      try {
        nextCanonicalDeck = canonicalDeckApi.insertCanonicalTemplateSlide(
          canonicalDeck,
          templateId,
          insertionIndex
        );
      } catch (err) {
        return false;
      }
      const nextSlide = nextCanonicalDeck && nextCanonicalDeck.slides[insertionIndex];
      const documentRef = getDocument();
      const container = getSlideContainer(documentRef);
      const slides = getSlides(documentRef);
      if (!nextSlide || !documentRef || !container || !Array.isArray(slides)) return false;

      const slideElement = renderCanonicalSlideElement(documentRef, nextSlide, insertionIndex);
      if (!slideElement) return false;
      if (prepareSlide) {
        try {
          prepareSlide(slideElement);
        } catch (err) {
          return false;
        }
      }

      if (saveHistoryState
        && isStudioHistoryCaptureFailure(
          captureStudioHistoryState(saveHistoryState, false, null, canonicalDeck)
        )) {
        return false;
      }
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
        let finalizeResult = false;
        try {
          finalizeResult = finalizeMutation(versionLabel, mutation.transaction, nextCanonicalDeck);
        } catch (err) {
          finalizeResult = false;
        }
        if (finalizeResult === false) {
          if (rollbackMutation) rollbackMutation(mutation.transaction, documentRef);
          if (generateThumbnails) generateThumbnails();
          if (setActiveSlide) setActiveSlide(activeSlideIndex);
          return false;
        }
      } else {
        if (saveHistoryState
        && isStudioHistoryCaptureFailure(
            captureStudioHistoryState(
              saveHistoryState,
              false,
              mutation.transaction,
              nextCanonicalDeck
            )
          )) {
          if (rollbackMutation) rollbackMutation(mutation.transaction, documentRef);
          if (generateThumbnails) generateThumbnails();
          if (setActiveSlide) setActiveSlide(activeSlideIndex);
          return false;
        }
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

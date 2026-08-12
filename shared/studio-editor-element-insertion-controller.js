(function (root, factory) {
  const defaultLayoutModeApi = typeof module === 'object' && module.exports
    ? require('./studio-editor-layout-mode')
    : root && root.SlideNextStudioEditorLayoutMode;
  const api = factory(root, defaultLayoutModeApi);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorElementInsertionController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root, defaultLayoutModeApi) {

  function isStudioHistoryCaptureFailure(value) {
    return value === false
      || (!!value && typeof value === 'object' && value.didCapture === false);
  }

  function normalizeInsertionLayoutMode(value) {
    if (typeof value !== 'string') return '';
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === 'freeform') return 'absolute';
    return normalizedValue === 'absolute' || normalizedValue === 'flow'
      ? normalizedValue
      : '';
  }

  function createStudioEditorElementInsertionController(options = {}) {
    const hasOption = (name) => Object.prototype.hasOwnProperty.call(options, name);
    const resolveDependency = (name, globalName, defaultValue = null) => hasOption(name)
      ? options[name]
      : (root && root[globalName]) || defaultValue;
    const canonicalDeckApi = resolveDependency('canonicalDeckApi', 'SlideNextCanonicalDeck');
    const layoutModeApi = resolveDependency(
      'layoutModeApi',
      'SlideNextStudioEditorLayoutMode',
      defaultLayoutModeApi
    );
    const normalizeLayoutMode = layoutModeApi
      && typeof layoutModeApi.normalizeStudioLayoutMode === 'function'
      ? layoutModeApi.normalizeStudioLayoutMode
      : normalizeInsertionLayoutMode;
    const canonicalInsertionApi = resolveDependency(
      'canonicalInsertionApi',
      'SlideNextStudioEditorCanonicalInsertion'
    );
    const deckImportApi = resolveDependency('deckImportApi', 'SlideNextDeckImport');
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getEditorSlideId = typeof options.getEditorSlideId === 'function'
      ? options.getEditorSlideId
      : (slide) => slide && slide.id;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const applyElementInsertion = typeof options.applyElementInsertion === 'function'
      ? options.applyElementInsertion
      : () => ({ element: null, transaction: null });
    const makeElementsHoverable = typeof options.makeElementsHoverable === 'function'
      ? options.makeElementsHoverable
      : null;
    const assignElementId = typeof options.assignElementId === 'function'
      ? (element) => {
          const assignedId = options.assignElementId(element);
          if (assignedId) return assignedId;
          return element && element.dataset && element.dataset.editorId;
        }
      : (element) => element && element.dataset && element.dataset.editorId;
    const finalizeInsertedElements = typeof options.finalizeInsertedElements === 'function'
      ? options.finalizeInsertedElements
      : null;
    const selectElement = typeof options.selectElement === 'function' ? options.selectElement : null;
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
    const updateInsertionActionState = typeof options.updateInsertionActionState === 'function'
      ? options.updateInsertionActionState
      : null;

    function buildCanonicalInsertionBuilders() {
      const importElementToCanonicalNode = deckImportApi
        && typeof deckImportApi.importElementToCanonicalNode === 'function'
        ? deckImportApi.importElementToCanonicalNode
        : null;
      return canonicalInsertionApi
        && typeof canonicalInsertionApi.createStudioCanonicalInsertionMutationBuilders === 'function'
        ? canonicalInsertionApi.createStudioCanonicalInsertionMutationBuilders({
            canonicalDeckApi,
            buildCanonicalDeck,
            buildCanonicalDeckBaseline,
            getCanonicalDeckBaseline,
            importElementToCanonicalNode
          })
        : null;
    }

    function removeInsertedElement(element) {
      if (!element) return false;
      try {
        if (typeof element.remove === 'function') {
          element.remove();
          return true;
        }
        if (element.parentNode && typeof element.parentNode.removeChild === 'function') {
          element.parentNode.removeChild(element);
          return true;
        }
      } catch (err) {
        return false;
      }
      return false;
    }

    function insert(type, insertOptions = {}) {
      const normalizedInsertOptions = insertOptions && typeof insertOptions === 'object'
        ? insertOptions
        : {};
      const iframeDoc = getIframeDoc();
      const activeSlide = getActiveSlide(iframeDoc);
      if (!activeSlide) {
        if (updateInsertionActionState) updateInsertionActionState(iframeDoc);
        return false;
      }

      const activeSlideId = getEditorSlideId(activeSlide) || '';
      let canonicalInsertionBuilders = null;
      let canonicalDeckBeforeInsertion = null;
      try {
        canonicalInsertionBuilders = buildCanonicalInsertionBuilders();
        canonicalDeckBeforeInsertion = canonicalInsertionBuilders
          && typeof canonicalInsertionBuilders.buildCanonicalInsertionBaseline === 'function'
          ? canonicalInsertionBuilders.buildCanonicalInsertionBaseline({
              canonicalDeckApi,
              buildCanonicalDeck,
              buildCanonicalDeckBaseline,
              sourceDocument: iframeDoc
            })
          : null;
      } catch (err) {
        if (updateInsertionActionState) updateInsertionActionState(iframeDoc);
        return false;
      }
      const insertionLayoutMode = normalizeLayoutMode(normalizedInsertOptions.layoutMode)
        || (layoutModeApi
          && typeof layoutModeApi.resolveStudioCanonicalLayoutMode === 'function'
          ? layoutModeApi.resolveStudioCanonicalLayoutMode(
              canonicalDeckBeforeInsertion,
              activeSlideId,
              { canonicalDeckApi }
            )
          : 'absolute');
      const childCount = activeSlide.children && Number.isFinite(activeSlide.children.length)
        ? activeSlide.children.length
        : 0;
      const customPrepareElement = typeof normalizedInsertOptions.prepareElement === 'function'
        ? normalizedInsertOptions.prepareElement
        : null;
      const prepareElement = makeElementsHoverable || customPrepareElement
        ? (element) => {
            if (makeElementsHoverable) makeElementsHoverable(element);
            if (customPrepareElement) customPrepareElement(element);
          }
        : null;
      const mutation = applyElementInsertion(type, {
        documentRef: iframeDoc,
        slide: activeSlide,
        offset: (childCount * 15) % 150,
        layoutMode: insertionLayoutMode,
        prepareElement,
        transactionElementId: activeSlideId ? `slide:${activeSlideId}` : ''
      });
      const newElement = mutation && mutation.element ? mutation.element : null;
      const transaction = mutation && mutation.transaction ? mutation.transaction : null;
      let canonicalDeck = null;
      if (canonicalInsertionBuilders
        && typeof canonicalInsertionBuilders.buildCanonicalInsertionDeck === 'function'
        && canonicalDeckBeforeInsertion
        && newElement) {
        try {
          canonicalDeck = canonicalInsertionBuilders.buildCanonicalInsertionDeck(newElement, {
            canonicalDeckApi,
            canonicalDeckBeforeMutation: canonicalDeckBeforeInsertion,
            slideId: activeSlideId,
            sourceDocument: iframeDoc,
            getNodeId: (element) => assignElementId(element)
          });
        } catch (err) {
          // Preserve the inserted element through transaction history when the sidecar fails.
          canonicalDeck = null;
        }
      }

      if (canonicalInsertionBuilders
        && typeof canonicalInsertionBuilders.buildCanonicalInsertionDeck === 'function'
        && canonicalDeckBeforeInsertion
        && newElement
        && !canonicalDeck) {
        removeInsertedElement(newElement);
        if (updateInsertionActionState) updateInsertionActionState(iframeDoc);
        return false;
      }

      if (newElement) {
        const versionLabel = typeof normalizedInsertOptions.versionLabel === 'string'
          && normalizedInsertOptions.versionLabel.trim()
          ? normalizedInsertOptions.versionLabel.trim()
          : 'Auto: Added ' + type.toUpperCase();
        if (finalizeInsertedElements) {
          const finalizeResult = finalizeInsertedElements(
            [newElement],
            versionLabel,
            transaction,
            canonicalDeck
          );
          if (finalizeResult === false) {
            removeInsertedElement(newElement);
            if (updateInsertionActionState) updateInsertionActionState(iframeDoc);
            return false;
          }
          return true;
        }
        if (selectElement) selectElement(newElement);
        if (generateThumbnails) generateThumbnails();
        if (saveHistoryState) {
          if (transaction && canonicalDeck) {
            if (isStudioHistoryCaptureFailure(saveHistoryState(false, transaction, canonicalDeck))) {
              removeInsertedElement(newElement);
              if (updateInsertionActionState) updateInsertionActionState(iframeDoc);
              return false;
            }
          } else if (transaction) {
            if (isStudioHistoryCaptureFailure(saveHistoryState(false, transaction))) {
              removeInsertedElement(newElement);
              if (updateInsertionActionState) updateInsertionActionState(iframeDoc);
              return false;
            }
          } else {
            if (isStudioHistoryCaptureFailure(saveHistoryState())) {
              removeInsertedElement(newElement);
              if (updateInsertionActionState) updateInsertionActionState(iframeDoc);
              return false;
            }
          }
        }
        if (triggerAutoSave && triggerAutoSave() === false) {
          removeInsertedElement(newElement);
          if (updateInsertionActionState) updateInsertionActionState(iframeDoc);
          return false;
        }
        if (triggerAutoVersion) triggerAutoVersion(versionLabel);
        return true;
      }

      if (updateInsertionActionState) updateInsertionActionState(iframeDoc);
      return false;
    }

    return { insert };
  }

  return {
    createStudioEditorElementInsertionController
  };
});

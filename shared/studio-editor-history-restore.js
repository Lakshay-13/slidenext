(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryRestore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isCanonicalDeckLike(value) {
    return !!value
      && typeof value === 'object'
      && !Array.isArray(value)
      && Array.isArray(value.slides);
  }

  function isValidCanonicalDeck(value, validator) {
    if (!value) return false;
    const validate = typeof validator === 'function' ? validator : isCanonicalDeckLike;
    try {
      return validate(value) === true;
    } catch (error) {
      return false;
    }
  }

  function createStudioEditorHistoryRestoreHandler(options = {}) {
    const historyApi = options.historyApi && typeof options.historyApi === 'object'
      ? options.historyApi
      : null;
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const elementStateApi = options.elementStateApi && typeof options.elementStateApi === 'object'
      ? options.elementStateApi
      : null;
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const getCurrentSlideIndex = typeof options.getCurrentSlideIndex === 'function'
      ? options.getCurrentSlideIndex
      : () => 0;
    const resolveElementById = typeof options.resolveElementById === 'function'
      ? options.resolveElementById
      : () => null;
    const makeElementsHoverable = typeof options.makeElementsHoverable === 'function'
      ? options.makeElementsHoverable
      : () => {};
    const generateThumbnails = typeof options.generateThumbnails === 'function'
      ? options.generateThumbnails
      : () => {};
    const restoreCommittedSelectionByIdsOnActiveSlide = typeof options.restoreCommittedSelectionByIdsOnActiveSlide === 'function'
      ? options.restoreCommittedSelectionByIdsOnActiveSlide
      : () => {};
    const observeDeckActiveSlideState = typeof options.observeDeckActiveSlideState === 'function'
      ? options.observeDeckActiveSlideState
      : () => {};
    const syncSelectionOverlay = typeof options.syncSelectionOverlay === 'function'
      ? options.syncSelectionOverlay
      : () => {};
    const capturePersistedDeckPlaybackState = typeof options.capturePersistedDeckPlaybackState === 'function'
      ? options.capturePersistedDeckPlaybackState
      : () => null;
    const applyPersistedDeckState = typeof options.applyPersistedDeckState === 'function'
      ? options.applyPersistedDeckState
      : () => {};
    const setEditorLiveCanonicalDeck = typeof options.setEditorLiveCanonicalDeck === 'function'
      ? options.setEditorLiveCanonicalDeck
      : null;
    const getSessionToken = typeof options.getSessionToken === 'function'
      ? options.getSessionToken
      : () => null;
    const setCurrentPresentationCanonicalDeck = typeof options.setCurrentPresentationCanonicalDeck === 'function'
      ? options.setCurrentPresentationCanonicalDeck
      : () => {};
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const applyEditorSelectionState = typeof options.applyEditorSelectionState === 'function'
      ? options.applyEditorSelectionState
      : () => {};
    const buildDeckViewOptions = typeof options.buildDeckViewOptions === 'function'
      ? options.buildDeckViewOptions
      : () => ({ deckHtmlOptions: {} });
    const syncIframeTheme = typeof options.syncIframeTheme === 'function'
      ? options.syncIframeTheme
      : () => {};
    const setupIframeDragging = typeof options.setupIframeDragging === 'function'
      ? options.setupIframeDragging
      : () => {};
    const bindDeckNavigationSync = typeof options.bindDeckNavigationSync === 'function'
      ? options.bindDeckNavigationSync
      : () => {};
    const getSlides = typeof options.getSlides === 'function'
      ? options.getSlides
      : () => [];
    const setActiveSlideById = typeof options.setActiveSlideById === 'function'
      ? options.setActiveSlideById
      : () => false;
    const setActiveSlide = typeof options.setActiveSlide === 'function'
      ? options.setActiveSlide
      : () => {};

    function syncRestoredCanonicalState(historyEntry, iframeDoc) {
      let restoredCanonicalDeck = historyEntry && isValidCanonicalDeck(
        historyEntry.canonicalDeck,
        isCanonicalDeck
      )
        ? historyEntry.canonicalDeck
        : null;
      if (!restoredCanonicalDeck && buildCanonicalDeck) {
        try {
          const rebuiltCanonicalDeck = buildCanonicalDeck(iframeDoc, {
            preferLiveCanonicalDeck: false
          });
          if (isValidCanonicalDeck(rebuiltCanonicalDeck, isCanonicalDeck)) {
            restoredCanonicalDeck = rebuiltCanonicalDeck;
          }
        } catch (error) {
          // Preserve legacy restore behavior when canonical rebuilding fails.
        }
      }
      let restoredPlaybackState = null;
      try {
        restoredPlaybackState = capturePersistedDeckPlaybackState(iframeDoc, restoredCanonicalDeck);
      } catch (error) {
        restoredPlaybackState = null;
      }
      applyPersistedDeckState({
        canonicalDeck: restoredCanonicalDeck,
        playbackState: restoredPlaybackState
      }, {
        syncPresentationMetadata: false
      });
      if (setEditorLiveCanonicalDeck) {
        setEditorLiveCanonicalDeck(restoredCanonicalDeck, iframeDoc, getSessionToken());
      }
      setCurrentPresentationCanonicalDeck(
        restoredCanonicalDeck
      );
    }

    return function restoreStudioEditorHistoryEntry(entry, historyStep = null) {
      if (!historyApi) return false;

      const iframeDoc = getIframeDoc();
      const normalizeHistoryEntry = typeof historyApi.normalizeStudioHistoryEntry === 'function'
        ? historyApi.normalizeStudioHistoryEntry
        : (value) => value || {};
      const historyEntry = normalizeHistoryEntry(entry);
      const restoreStudioHistoryTransaction = typeof historyApi.restoreStudioHistoryTransaction === 'function'
        ? historyApi.restoreStudioHistoryTransaction
        : null;
      const transactionRestoreResult = restoreStudioHistoryTransaction
          ? restoreStudioHistoryTransaction(historyEntry, historyStep, {
            transactionApi,
            getElementById: (editorId) => resolveElementById(editorId, iframeDoc),
            applyActiveSlideState: (slideId) => {
              if (!slideId) return false;
              return setActiveSlideById(slideId, iframeDoc, {
                captureHistory: false,
                preserveSelection: true
              }) !== false;
            },
            applyVisibilityState: elementStateApi
              && typeof elementStateApi.applyStudioElementVisibilityState === 'function'
              ? elementStateApi.applyStudioElementVisibilityState
              : null,
            applyMarkupState(element, markup) {
              if (!element || typeof markup !== 'string') return false;
              element.innerHTML = markup;
              makeElementsHoverable(element);
              if (element.id === 'slidesContainer') {
                generateThumbnails();
              }
              return true;
            },
            onApplied(transactionResult) {
              if (typeof historyApi.restoreStudioHistorySelectionState === 'function') {
                historyApi.restoreStudioHistorySelectionState(historyEntry, {
                  doc: iframeDoc,
                  restoreCommittedSelectionState: (selectedElementIds, doc) => restoreCommittedSelectionByIdsOnActiveSlide(selectedElementIds, doc),
                  observeDeckActiveSlideState
                });
              }
              syncSelectionOverlay();
              syncRestoredCanonicalState(historyEntry, iframeDoc);
              return {
                didRestoreTransaction: true,
                transactionResult
              };
            }
          })
        : null;
      if (transactionRestoreResult) return transactionRestoreResult;

      applyEditorSelectionState({});

      let restoreResult = null;
      if (typeof historyApi.restoreStudioHistoryEntry === 'function') {
        restoreResult = historyApi.restoreStudioHistoryEntry(historyEntry, {
          restoreFrameSetup: (nextHistoryEntry) => {
            const deckViewOptions = buildDeckViewOptions(nextHistoryEntry) || {};
            const deckHtmlOptions = deckViewOptions.deckHtmlOptions || {};
            if (typeof historyApi.restoreStudioHistoryFrameSetup !== 'function') return null;
            return historyApi.restoreStudioHistoryFrameSetup(nextHistoryEntry, {
              doc: iframeDoc,
              deckHtmlOptions,
              replaceFrameHtml: (doc, html) => {
                if (doc && doc.documentElement) {
                  doc.documentElement.innerHTML = html;
                }
              },
              syncIframeTheme,
              makeElementsHoverable,
              setupIframeDragging,
              bindDeckNavigationSync,
              generateThumbnails
            });
          },
          restoreActiveSlide: (nextHistoryEntry) => {
            if (typeof historyApi.restoreStudioHistoryActiveSlide !== 'function') return null;
            return historyApi.restoreStudioHistoryActiveSlide(nextHistoryEntry, {
              fallbackIndex: getCurrentSlideIndex(),
              restoreActiveSlideById: (slideId) => setActiveSlideById(slideId, iframeDoc),
              getSlideCount: () => getSlides(iframeDoc).length,
              setActiveSlideByIndex: (index) => setActiveSlide(index)
            });
          },
          restoreSelectionState: (nextHistoryEntry) => {
            if (typeof historyApi.restoreStudioHistorySelectionState !== 'function') return null;
            return historyApi.restoreStudioHistorySelectionState(nextHistoryEntry, {
              doc: iframeDoc,
              restoreCommittedSelectionState: (selectedElementIds, doc) => restoreCommittedSelectionByIdsOnActiveSlide(selectedElementIds, doc),
              observeDeckActiveSlideState
            });
          }
        });
      }
      const frameSetup = restoreResult && restoreResult.frameSetup;
      if (frameSetup && frameSetup.didRestoreDoc === false) {
        // Do not publish model state when the iframe still shows the old deck.
        return false;
      }
      syncRestoredCanonicalState(historyEntry, iframeDoc);
      return undefined;
    };
  }

  function createStudioEditorHistoryRestoreStateAdapter(options = {}) {
    const restoreApi = options.restoreApi && typeof options.restoreApi === 'object'
      ? options.restoreApi
      : null;
    const createHistoryRestoreHandler = typeof options.createHistoryRestoreHandler === 'function'
      ? options.createHistoryRestoreHandler
      : restoreApi && typeof restoreApi.createStudioEditorHistoryRestoreHandler === 'function'
        ? restoreApi.createStudioEditorHistoryRestoreHandler
        : null;
    if (!createHistoryRestoreHandler) return null;

    const handlerOptions = { ...options };
    delete handlerOptions.restoreApi;
    delete handlerOptions.createHistoryRestoreHandler;
    const restoreHandler = createHistoryRestoreHandler(handlerOptions);
    return typeof restoreHandler === 'function' ? restoreHandler : null;
  }

  return {
    createStudioEditorHistoryRestoreHandler,
    createStudioEditorHistoryRestoreStateAdapter
  };
});

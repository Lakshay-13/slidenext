(function initStudioEditorWallpaperTransactionActions(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorWallpaperTransactionActions = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorWallpaperTransactionActions(options = {}) {
    const wallpaperMutationApi = options.wallpaperMutationApi
      && typeof options.wallpaperMutationApi.applyStudioWallpaperSlidesMutationWithTransaction === 'function'
      ? options.wallpaperMutationApi
      : null;
    const transactionApi = options.transactionApi
      && typeof options.transactionApi.applyStudioEditorTransaction === 'function'
      ? options.transactionApi
      : null;
    const wallpaperViewApi = options.wallpaperViewApi
      && typeof options.wallpaperViewApi.applyStudioWallpaperToSlides === 'function'
      ? options.wallpaperViewApi
      : null;
    const canonicalDeckApi = options.canonicalDeckApi || null;
    const canonicalWallpaperApi = options.canonicalWallpaperApi || null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : (slide) => slide && slide.dataset && slide.dataset.slideId || '';
    const getIframeDocument = typeof options.getIframeDocument === 'function'
      ? options.getIframeDocument
      : () => null;
    const getSlideById = typeof options.getSlideById === 'function'
      ? options.getSlideById
      : null;
    const getElementByEditorId = typeof options.getElementByEditorId === 'function'
      ? options.getElementByEditorId
      : null;

    function applyEditorWallpaperSlidesMutationWithTransaction(slides, background, options = {}) {
      if (!wallpaperMutationApi) {
        return {
          didChange: false,
          transaction: null
        };
      }

      const sourceDocument = options.sourceDocument || null;
      const sourceSlideId = typeof options.getSlideId === 'function'
        ? options.getSlideId
        : typeof options.slideId === 'string'
          ? () => options.slideId
          : getSlideId;
      return wallpaperMutationApi.applyStudioWallpaperSlidesMutationWithTransaction(
        slides,
        background,
        {
          createStyleTransaction: transactionApi
            && typeof transactionApi.createStudioStyleTransaction === 'function'
            ? transactionApi.createStudioStyleTransaction
            : null,
          applyStudioWallpaperToSlides: wallpaperViewApi
            ? wallpaperViewApi.applyStudioWallpaperToSlides
            : null,
          getSlideId: sourceSlideId,
          canonicalDeckApi,
          canonicalWallpaperApi,
          sourceDocument,
          buildCanonicalDeckBaseline: buildCanonicalDeck
            ? (sourceDoc, buildOptions) => buildCanonicalDeck(
                sourceDoc || sourceDocument,
                buildOptions
              )
            : null,
          getCanonicalDeckBaseline: getCanonicalDeckBaseline
            ? (sourceDoc) => getCanonicalDeckBaseline(sourceDoc || sourceDocument)
            : null,
          getPendingCanonicalDeck: getPendingCanonicalDeck
            ? (sourceDoc) => getPendingCanonicalDeck(sourceDoc || sourceDocument)
            : null
        }
      );
    }

    function applyEditorWallpaperMutationWithTransaction(activeSlide, background, options = {}) {
      return applyEditorWallpaperSlidesMutationWithTransaction([activeSlide], background, options);
    }

    function rollbackEditorWallpaperMutation(transaction, sourceDoc = getIframeDocument()) {
      if (!transaction || !transactionApi) return false;
      try {
        const rollbackResult = transactionApi.applyStudioEditorTransaction(transaction, 'undo', {
          getElementById: (elementId) => {
            const documentRef = sourceDoc || getIframeDocument();
            if (typeof elementId === 'string'
              && elementId.startsWith('slide:')
              && getSlideById) {
              return getSlideById(elementId.slice('slide:'.length), documentRef);
            }
            return getElementByEditorId
              ? getElementByEditorId(elementId, documentRef)
              : null;
          }
        });
        return !!(rollbackResult && rollbackResult.didApply);
      } catch (error) {
        return false;
      }
    }

    return {
      applyEditorWallpaperSlidesMutationWithTransaction,
      applyEditorWallpaperMutationWithTransaction,
      rollbackEditorWallpaperMutation
    };
  }

  function createStudioEditorWallpaperTransactionGlobalApi(options = {}) {
    const actions = options.actions || {};
    return {
      applyEditorWallpaperSlidesMutationWithTransaction: (...args) => (
        typeof actions.applyEditorWallpaperSlidesMutationWithTransaction === 'function'
          ? actions.applyEditorWallpaperSlidesMutationWithTransaction(...args)
          : { didChange: false, transaction: null }
      ),
      applyEditorWallpaperMutationWithTransaction: (...args) => (
        typeof actions.applyEditorWallpaperMutationWithTransaction === 'function'
          ? actions.applyEditorWallpaperMutationWithTransaction(...args)
          : { didChange: false, transaction: null }
      ),
      rollbackEditorWallpaperMutation: (...args) => (
        typeof actions.rollbackEditorWallpaperMutation === 'function'
          ? actions.rollbackEditorWallpaperMutation(...args)
          : false
      )
    };
  }

  return {
    createStudioEditorWallpaperTransactionActions,
    createStudioEditorWallpaperTransactionGlobalApi
  };
}));

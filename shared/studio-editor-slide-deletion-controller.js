(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideDeletionController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSlideDeletionController(options = {}) {
    const slideCommandsApi = options.slideCommandsApi
      || (root && root.SlideNextStudioEditorSlideCommands)
      || null;
    const canonicalSlideApi = options.canonicalSlideApi
      || (root && root.SlideNextStudioEditorCanonicalSlide)
      || null;
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    const transactionApi = options.transactionApi
      || (root && root.SlideNextStudioEditorTransaction)
      || null;
    const deletionTransactionApi = options.deletionTransactionApi
      || (root && root.SlideNextStudioEditorSlideDeletionTransaction)
      || null;
    const deletionMutationApi = options.deletionMutationApi
      || (root && root.SlideNextStudioEditorSlideDeletionMutation)
      || null;
    const deckViewApi = options.deckViewApi
      || (root && root.SlideNextStudioDeckView)
      || null;
    const deleteStudioSlideNode = slideCommandsApi
      && typeof slideCommandsApi.deleteStudioSlideNode === 'function'
      ? slideCommandsApi.deleteStudioSlideNode
      : null;
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const getSlideContainer = typeof options.getSlideContainer === 'function'
      ? options.getSlideContainer
      : (doc) => doc && typeof doc.getElementById === 'function'
        ? doc.getElementById('slidesContainer')
        : null;
    const getSlides = typeof options.getSlides === 'function' ? options.getSlides : () => [];
    const alert = typeof options.alert === 'function'
      ? options.alert
      : root && typeof root.alert === 'function'
        ? root.alert.bind(root)
        : null;
    const captureSlideMutationState = typeof options.captureSlideMutationState === 'function'
      ? options.captureSlideMutationState
      : null;
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : (slide) => slide && slide.id || '';
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const legacyApplyDeletion = typeof options.applyDeletion === 'function'
      ? options.applyDeletion
      : () => ({ didApply: false, transaction: null });
    const applyDeletionTransaction = deletionTransactionApi
      && typeof deletionTransactionApi.applyStudioEditorSlideDeletionMutationWithTransaction === 'function'
      ? deletionTransactionApi.applyStudioEditorSlideDeletionMutationWithTransaction
      : null;
    const applyDeletion = (container, slideNode, mutationOptions = {}) => {
      if (applyDeletionTransaction) {
        return applyDeletionTransaction(container, slideNode, {
          mutationApi: deletionMutationApi,
          slideCommandsApi,
          deckViewApi,
          transactionApi,
          ...mutationOptions
        });
      }
      return legacyApplyDeletion(container, slideNode, mutationOptions);
    };
    const generateThumbnails = typeof options.generateThumbnails === 'function'
      ? options.generateThumbnails
      : null;
    const restoreDeckViewAfterSlideMutation = typeof options.restoreDeckViewAfterSlideMutation === 'function'
      ? options.restoreDeckViewAfterSlideMutation
      : null;
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    const rollbackMutation = typeof options.rollbackMutation === 'function'
      ? options.rollbackMutation
      : null;
    const createStudioSlidePresenceTransaction = transactionApi
      && typeof transactionApi.createStudioSlidePresenceTransaction === 'function'
      ? transactionApi.createStudioSlidePresenceTransaction
      : null;

    function remove(index) {
      if (!deleteStudioSlideNode) return false;

      let canonicalDeleteSlideBuilders = null;
      try {
        canonicalDeleteSlideBuilders = canonicalSlideApi
          && typeof canonicalSlideApi.createStudioCanonicalDeleteSlideMutationBuilders === 'function'
          ? canonicalSlideApi.createStudioCanonicalDeleteSlideMutationBuilders({
              canonicalDeckApi,
              buildCanonicalDeck,
              buildCanonicalDeckBaseline,
              getPendingCanonicalDeck,
              getCanonicalDeckBaseline
            })
          : null;
      } catch (error) {
        return false;
      }

      return deleteStudioSlideNode(index, {
        getIframeDoc,
        getSlideContainer,
        getSlides,
        alert,
        captureSlideMutationState,
        getSlideId,
        createStudioSlidePresenceTransaction,
        buildCanonicalDeleteSlideBaseline: canonicalDeleteSlideBuilders
          ? canonicalDeleteSlideBuilders.buildCanonicalDeleteSlideBaseline
          : null,
        buildCanonicalDeleteSlideDeck: canonicalDeleteSlideBuilders
          ? canonicalDeleteSlideBuilders.buildCanonicalDeleteSlideDeck
          : null,
        applyDeletion,
        generateThumbnails,
        restoreDeckViewAfterSlideMutation,
        finalizeMutation,
        rollbackMutation
      });
    }

    return {
      remove
    };
  }

  return {
    createStudioEditorSlideDeletionController
  };
});

(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideDuplicationController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSlideDuplicationController(options = {}) {
    const slideCommandsApi = options.slideCommandsApi
      || (root && root.SlideNextStudioEditorSlideCommands)
      || null;
    const canonicalSlideApi = options.canonicalSlideApi
      || (root && root.SlideNextStudioEditorCanonicalSlide)
      || null;
    const deckImportApi = options.deckImportApi
      || (root && root.SlideNextDeckImport)
      || null;
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    const duplicateStudioSlideNode = slideCommandsApi
      && typeof slideCommandsApi.duplicateStudioSlideNode === 'function'
      ? slideCommandsApi.duplicateStudioSlideNode
      : null;
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const resolveInsertionActionState = typeof options.resolveInsertionActionState === 'function'
      ? options.resolveInsertionActionState
      : () => ({ canDuplicateSlide: false });
    const getSlideContainer = typeof options.getSlideContainer === 'function'
      ? options.getSlideContainer
      : (doc) => doc && typeof doc.getElementById === 'function'
        ? doc.getElementById('slidesContainer')
        : null;
    const getSlides = typeof options.getSlides === 'function' ? options.getSlides : () => [];
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const sanitizeDuplicatedSubtree = typeof options.sanitizeDuplicatedSubtree === 'function'
      ? options.sanitizeDuplicatedSubtree
      : null;
    const assignSlideId = typeof options.assignSlideId === 'function'
      ? options.assignSlideId
      : null;
    const makeElementsHoverable = typeof options.makeElementsHoverable === 'function'
      ? options.makeElementsHoverable
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const applyInsertion = typeof options.applyInsertion === 'function'
      ? options.applyInsertion
      : () => ({ didApply: false, transaction: null });
    const generateThumbnails = typeof options.generateThumbnails === 'function'
      ? options.generateThumbnails
      : null;
    const setActiveSlide = typeof options.setActiveSlide === 'function'
      ? options.setActiveSlide
      : null;
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;

    function duplicate() {
      if (!duplicateStudioSlideNode) return false;

      const importSlideToCanonicalSlide = deckImportApi
        && typeof deckImportApi.importSlideToCanonicalSlide === 'function'
        ? deckImportApi.importSlideToCanonicalSlide
        : null;
      const canonicalDuplicateSlideBuilders = canonicalSlideApi
        && typeof canonicalSlideApi.createStudioCanonicalDuplicateSlideMutationBuilders === 'function'
        ? canonicalSlideApi.createStudioCanonicalDuplicateSlideMutationBuilders({
            canonicalDeckApi,
            buildCanonicalDeck,
            getCanonicalDeckBaseline,
            importSlideToCanonicalSlide
          })
        : null;

      return duplicateStudioSlideNode({
        getIframeDoc,
        resolveInsertionActionState,
        getSlideContainer,
        getSlides,
        getActiveSlide,
        sanitizeDuplicatedSubtree,
        assignSlideId,
        makeElementsHoverable,
        buildCanonicalDuplicateSlideBaseline: canonicalDuplicateSlideBuilders
          ? canonicalDuplicateSlideBuilders.buildCanonicalDuplicateSlideBaseline
          : null,
        buildCanonicalDuplicateSlideDeck: canonicalDuplicateSlideBuilders
          ? canonicalDuplicateSlideBuilders.buildCanonicalDuplicateSlideDeck
          : null,
        importSlideToCanonicalSlide,
        saveHistoryState: typeof options.saveHistoryState === 'function'
          ? options.saveHistoryState
          : null,
        applyInsertion,
        generateThumbnails,
        setActiveSlide,
        finalizeMutation
      });
    }

    return {
      duplicate
    };
  }

  return {
    createStudioEditorSlideDuplicationController
  };
});

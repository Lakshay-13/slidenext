(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideInsertionController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSlideInsertionController(options = {}) {
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
    const addStudioSlideNode = slideCommandsApi
      && typeof slideCommandsApi.addStudioSlideNode === 'function'
      ? slideCommandsApi.addStudioSlideNode
      : null;
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const resolveInsertionActionState = typeof options.resolveInsertionActionState === 'function'
      ? options.resolveInsertionActionState
      : () => ({ canAddSlide: false });
    const getSlideContainer = typeof options.getSlideContainer === 'function'
      ? options.getSlideContainer
      : (doc) => doc && typeof doc.getElementById === 'function'
        ? doc.getElementById('slidesContainer')
        : null;
    const getSlides = typeof options.getSlides === 'function' ? options.getSlides : () => [];
    const createBlankSlide = typeof options.createBlankSlide === 'function'
      ? options.createBlankSlide
      : () => null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : (slide) => slide && slide.id || '';
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : () => {};
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

    function add() {
      if (!addStudioSlideNode) return false;

      const importSlideToCanonicalSlide = deckImportApi
        && typeof deckImportApi.importSlideToCanonicalSlide === 'function'
        ? deckImportApi.importSlideToCanonicalSlide
        : null;
      const canonicalAddSlideBuilders = canonicalSlideApi
        && typeof canonicalSlideApi.createStudioCanonicalAddSlideMutationBuilders === 'function'
        ? canonicalSlideApi.createStudioCanonicalAddSlideMutationBuilders({
            canonicalDeckApi,
            buildCanonicalDeck,
            importSlideToCanonicalSlide,
            getSlideId
          })
        : null;

      return addStudioSlideNode({
        getIframeDoc,
        resolveInsertionActionState,
        getSlideContainer,
        getSlides,
        createBlankSlide,
        buildCanonicalAddSlideDeck: canonicalAddSlideBuilders
          ? canonicalAddSlideBuilders.buildCanonicalAddSlideDeck
          : null,
        saveHistoryState,
        applyInsertion,
        generateThumbnails,
        setActiveSlide,
        finalizeMutation
      });
    }

    return {
      add
    };
  }

  return {
    createStudioEditorSlideInsertionController
  };
});

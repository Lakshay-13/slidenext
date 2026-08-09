(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideReorderController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSlideReorderController(options = {}) {
    const slideCommandsApi = options.slideCommandsApi
      || (root && root.SlideNextStudioEditorSlideCommands)
      || null;
    const canonicalSlideApi = options.canonicalSlideApi
      || (root && root.SlideNextStudioEditorCanonicalSlide)
      || null;
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    const reorderStudioSlideNodes = slideCommandsApi
      && typeof slideCommandsApi.reorderStudioSlideNodes === 'function'
      ? slideCommandsApi.reorderStudioSlideNodes
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
    const captureSlideMutationState = typeof options.captureSlideMutationState === 'function'
      ? options.captureSlideMutationState
      : null;
    const applyReorder = typeof options.applyReorder === 'function'
      ? options.applyReorder
      : () => ({ didApply: false, transaction: null });
    const generateThumbnails = typeof options.generateThumbnails === 'function'
      ? options.generateThumbnails
      : null;
    const restoreDeckViewAfterSlideMutation = typeof options.restoreDeckViewAfterSlideMutation === 'function'
      ? options.restoreDeckViewAfterSlideMutation
      : null;
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;

    function reorder(fromIdx, toIdx) {
      if (!reorderStudioSlideNodes) return false;

      let canonicalReorderSlideBuilders = null;
      try {
        canonicalReorderSlideBuilders = canonicalSlideApi
          && typeof canonicalSlideApi.createStudioCanonicalReorderSlideMutationBuilders === 'function'
          ? canonicalSlideApi.createStudioCanonicalReorderSlideMutationBuilders({
              canonicalDeckApi,
              buildCanonicalDeck,
              buildCanonicalDeckBaseline,
              getCanonicalDeckBaseline
            })
          : null;
      } catch (error) {
        return false;
      }

      return reorderStudioSlideNodes(fromIdx, toIdx, {
        getIframeDoc,
        getSlideContainer,
        getSlides,
        getSlideId,
        buildCanonicalReorderSlideBaseline: canonicalReorderSlideBuilders
          ? canonicalReorderSlideBuilders.buildCanonicalReorderSlideBaseline
          : null,
        buildCanonicalReorderSlideDeck: canonicalReorderSlideBuilders
          ? canonicalReorderSlideBuilders.buildCanonicalReorderSlideDeck
          : null,
        captureSlideMutationState,
        applyReorder,
        generateThumbnails,
        restoreDeckViewAfterSlideMutation,
        finalizeMutation
      });
    }

    return {
      reorder
    };
  }

  return {
    createStudioEditorSlideReorderController
  };
});

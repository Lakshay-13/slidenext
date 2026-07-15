(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideCommands = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function prepareStudioSlideDuplication(sourceSlide, options = {}) {
    if (!sourceSlide || typeof sourceSlide.cloneNode !== 'function') {
      return null;
    }

    const sanitizeDuplicatedSubtree = typeof options.sanitizeDuplicatedSubtree === 'function'
      ? options.sanitizeDuplicatedSubtree
      : () => {};
    const assignSlideId = typeof options.assignSlideId === 'function'
      ? options.assignSlideId
      : null;
    if (!assignSlideId) return null;

    const duplicateSlide = sourceSlide.cloneNode(true);
    if (!duplicateSlide) return null;
    sanitizeDuplicatedSubtree(duplicateSlide);
    if (duplicateSlide.classList && typeof duplicateSlide.classList.remove === 'function') {
      duplicateSlide.classList.remove(options.activeClassName || 'slide-active');
    }

    const slideId = assignSlideId(duplicateSlide, { forceNew: true });
    if (typeof slideId !== 'string' || !slideId.trim()) return null;

    if (typeof options.makeElementsHoverable === 'function') {
      options.makeElementsHoverable(duplicateSlide);
    }

    return {
      slide: duplicateSlide,
      slideId
    };
  }

  function addStudioSlideNode(options = {}) {
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const iframeDoc = getIframeDoc();
    const resolveInsertionActionState = typeof options.resolveInsertionActionState === 'function'
      ? options.resolveInsertionActionState
      : () => ({ canAddSlide: false });
    if (!iframeDoc || !resolveInsertionActionState(iframeDoc).canAddSlide) return false;

    const getSlideContainer = typeof options.getSlideContainer === 'function'
      ? options.getSlideContainer
      : (doc) => doc && typeof doc.getElementById === 'function'
        ? doc.getElementById('slidesContainer')
        : null;
    const container = getSlideContainer(iframeDoc);
    if (!container) return false;

    const getSlides = typeof options.getSlides === 'function' ? options.getSlides : () => [];
    const newIndex = getSlides(iframeDoc).length;
    const createBlankSlide = typeof options.createBlankSlide === 'function'
      ? options.createBlankSlide
      : () => null;
    const newSlide = createBlankSlide(iframeDoc, newIndex);
    if (!newSlide) return false;

    const appendCanonicalSlide = typeof options.appendCanonicalSlide === 'function'
      ? options.appendCanonicalSlide
      : null;
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : () => '';
    const newSlideId = getSlideId(newSlide) || newSlide.id || '';
    const importSlideToCanonicalSlide = typeof options.importSlideToCanonicalSlide === 'function'
      ? options.importSlideToCanonicalSlide
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const canonicalDeckBeforeAddition = appendCanonicalSlide && buildCanonicalDeck
      ? buildCanonicalDeck(iframeDoc)
      : null;
    const canonicalSlide = importSlideToCanonicalSlide && newSlideId
      ? importSlideToCanonicalSlide(newSlide, newIndex, {
          getSlideId: () => newSlideId
        })
      : {
          id: newSlideId,
          title: `Slide ${newIndex + 1}`
        };
    const canonicalDeckAfterAddition = appendCanonicalSlide
      ? appendCanonicalSlide(canonicalDeckBeforeAddition, canonicalSlide)
      : null;

    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : () => {};
    saveHistoryState();
    const applyInsertion = typeof options.applyInsertion === 'function'
      ? options.applyInsertion
      : () => ({ didApply: false, transaction: null });
    const mutation = applyInsertion(container, newSlide);
    if (!mutation || !mutation.didApply) return false;

    if (typeof options.generateThumbnails === 'function') {
      options.generateThumbnails();
    }
    if (typeof options.setActiveSlide === 'function') {
      options.setActiveSlide(newIndex);
    }
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : () => {};
    if (canonicalDeckAfterAddition) {
      finalizeMutation('Auto: Added Slide', mutation.transaction, canonicalDeckAfterAddition);
    } else {
      finalizeMutation('Auto: Added Slide', mutation.transaction);
    }
    return true;
  }

  return {
    prepareStudioSlideDuplication,
    addStudioSlideNode
  };
});

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

  function duplicateStudioSlideNode(options = {}) {
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const iframeDoc = getIframeDoc();
    const resolveInsertionActionState = typeof options.resolveInsertionActionState === 'function'
      ? options.resolveInsertionActionState
      : () => ({ canDuplicateSlide: false });
    if (!iframeDoc || !resolveInsertionActionState(iframeDoc).canDuplicateSlide) return false;

    const getSlideContainer = typeof options.getSlideContainer === 'function'
      ? options.getSlideContainer
      : (doc) => doc && typeof doc.getElementById === 'function'
        ? doc.getElementById('slidesContainer')
        : null;
    const container = getSlideContainer(iframeDoc);
    if (!container) return false;

    const getSlides = typeof options.getSlides === 'function' ? options.getSlides : () => [];
    const slides = getSlides(iframeDoc);
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const sourceSlide = getActiveSlide(iframeDoc);
    const sourceIndex = slides.indexOf(sourceSlide);
    if (!sourceSlide || sourceIndex < 0 || typeof sourceSlide.cloneNode !== 'function') {
      return false;
    }

    const duplicatePreparation = prepareStudioSlideDuplication(sourceSlide, {
      sanitizeDuplicatedSubtree: options.sanitizeDuplicatedSubtree,
      assignSlideId: options.assignSlideId,
      activeClassName: options.activeClassName,
      makeElementsHoverable: options.makeElementsHoverable
    });
    if (!duplicatePreparation) return false;
    const duplicateSlide = duplicatePreparation.slide;
    const duplicateSlideId = duplicatePreparation.slideId;
    const insertionIndex = sourceIndex + 1;

    const buildCanonicalDuplicateSlideBaseline = typeof options.buildCanonicalDuplicateSlideBaseline === 'function'
      ? options.buildCanonicalDuplicateSlideBaseline
      : null;
    const canonicalDeckBeforeDuplication = buildCanonicalDuplicateSlideBaseline
      ? buildCanonicalDuplicateSlideBaseline({
          sourceDocument: iframeDoc
        })
      : null;
    const buildCanonicalDuplicateSlideDeck = typeof options.buildCanonicalDuplicateSlideDeck === 'function'
      ? options.buildCanonicalDuplicateSlideDeck
      : null;
    const canonicalDeckAfterDuplication = buildCanonicalDuplicateSlideDeck
      ? buildCanonicalDuplicateSlideDeck({
          canonicalDeckBeforeMutation: canonicalDeckBeforeDuplication,
          duplicateSlide,
          duplicateSlideId,
          insertionIndex,
          sourceDocument: iframeDoc,
          title: `Slide ${insertionIndex + 1}`,
          getSlideId: () => duplicateSlideId,
          importSlideToCanonicalSlide: options.importSlideToCanonicalSlide
        })
      : null;
    if (canonicalDeckBeforeDuplication && !canonicalDeckAfterDuplication) return false;

    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : () => {};
    if (canonicalDeckBeforeDuplication) {
      saveHistoryState(false, null, canonicalDeckBeforeDuplication);
    } else {
      saveHistoryState();
    }
    const applyInsertion = typeof options.applyInsertion === 'function'
      ? options.applyInsertion
      : () => ({ didApply: false, transaction: null });
    const mutation = applyInsertion(container, duplicateSlide, {
      beforeNode: slides[insertionIndex] || null
    });
    if (!mutation || !mutation.didApply) return false;

    if (typeof options.generateThumbnails === 'function') {
      options.generateThumbnails();
    }
    if (typeof options.setActiveSlide === 'function') {
      options.setActiveSlide(insertionIndex);
    }
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : () => {};
    if (canonicalDeckAfterDuplication) {
      finalizeMutation('Auto: Duplicated Slide', mutation.transaction, canonicalDeckAfterDuplication);
    } else {
      finalizeMutation('Auto: Duplicated Slide', mutation.transaction);
    }
    return true;
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

    const buildCanonicalAddSlideBaseline = typeof options.buildCanonicalAddSlideBaseline === 'function'
      ? options.buildCanonicalAddSlideBaseline
      : null;
    const canonicalDeckBeforeAddition = buildCanonicalAddSlideBaseline
      ? buildCanonicalAddSlideBaseline({
          sourceDocument: iframeDoc
        })
      : null;
    const buildCanonicalAddSlideDeck = typeof options.buildCanonicalAddSlideDeck === 'function'
      ? options.buildCanonicalAddSlideDeck
      : null;
    const canonicalDeckAfterAddition = buildCanonicalAddSlideDeck
      ? buildCanonicalAddSlideDeck({
          ...(canonicalDeckBeforeAddition
            ? { canonicalDeckBeforeMutation: canonicalDeckBeforeAddition }
            : {}),
          sourceDocument: iframeDoc,
          newSlide,
          insertionIndex: newIndex
        })
      : null;
    if (canonicalDeckBeforeAddition && !canonicalDeckAfterAddition) return false;

    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : () => {};
    if (canonicalDeckBeforeAddition) {
      saveHistoryState(false, null, canonicalDeckBeforeAddition);
    } else {
      saveHistoryState();
    }
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

  function deleteStudioSlideNode(index, options = {}) {
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const iframeDoc = getIframeDoc();
    if (!iframeDoc) return false;

    const getSlideContainer = typeof options.getSlideContainer === 'function'
      ? options.getSlideContainer
      : (doc) => doc && typeof doc.getElementById === 'function'
        ? doc.getElementById('slidesContainer')
        : null;
    const container = getSlideContainer(iframeDoc);
    if (!container) return false;

    const getSlides = typeof options.getSlides === 'function' ? options.getSlides : () => [];
    const slides = getSlides(iframeDoc);
    if (slides.length <= 1) {
      if (typeof options.alert === 'function') {
        options.alert('Action aborted: presentation requires at least one slide.');
      }
      return false;
    }
    const deletedSlide = slides[index];
    if (!deletedSlide) return false;

    const captureSlideMutationState = typeof options.captureSlideMutationState === 'function'
      ? options.captureSlideMutationState
      : () => ({ preservedActiveSlideId: '', preservedSelectionIds: [] });
    const slideMutationState = captureSlideMutationState(iframeDoc);
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : (slide) => slide && slide.id || '';
    const deletedSlideId = getSlideId(deletedSlide);
    const buildCanonicalDeleteSlideBaseline = typeof options.buildCanonicalDeleteSlideBaseline === 'function'
      ? options.buildCanonicalDeleteSlideBaseline
      : null;
    const canonicalDeckBeforeDeletion = buildCanonicalDeleteSlideBaseline
      ? buildCanonicalDeleteSlideBaseline({
          sourceDocument: iframeDoc
        })
      : null;
    const buildCanonicalDeleteSlideDeck = typeof options.buildCanonicalDeleteSlideDeck === 'function'
      ? options.buildCanonicalDeleteSlideDeck
      : null;
    const canonicalDeckAfterDeletion = buildCanonicalDeleteSlideDeck
      ? buildCanonicalDeleteSlideDeck({
          ...(canonicalDeckBeforeDeletion
            ? { canonicalDeckBeforeMutation: canonicalDeckBeforeDeletion }
            : {}),
          sourceDocument: iframeDoc,
          deletedSlide,
          slideId: deletedSlideId
        })
      : null;
    if (canonicalDeckBeforeDeletion && !canonicalDeckAfterDeletion) return false;

    const applyDeletion = typeof options.applyDeletion === 'function'
      ? options.applyDeletion
      : () => ({ didApply: false, transaction: null });
    const mutation = applyDeletion(container, deletedSlide);
    if (!mutation || !mutation.didApply) return false;

    if (typeof options.generateThumbnails === 'function') {
      options.generateThumbnails();
    }
    const remainingSlides = getSlides(iframeDoc);
    if (typeof options.restoreDeckViewAfterSlideMutation === 'function') {
      options.restoreDeckViewAfterSlideMutation(iframeDoc, slideMutationState.preservedSelectionIds, {
        preservedActiveSlideId: slideMutationState.preservedActiveSlideId,
        removedSlideId: deletedSlideId,
        fallbackIndex: remainingSlides.length === 0
          ? 0
          : Math.max(0, Math.min(index - 1, remainingSlides.length - 1))
      });
    }

    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : () => {};
    const rollbackMutation = typeof options.rollbackMutation === 'function'
      ? options.rollbackMutation
      : null;
    const finalized = canonicalDeckAfterDeletion
      ? finalizeMutation('Auto: Deleted Slide', mutation.transaction, canonicalDeckAfterDeletion)
      : finalizeMutation('Auto: Deleted Slide', mutation.transaction);
    if (finalized === false) {
      if (rollbackMutation) rollbackMutation(mutation.transaction, iframeDoc);
      if (typeof options.generateThumbnails === 'function') {
        options.generateThumbnails();
      }
      if (typeof options.restoreDeckViewAfterSlideMutation === 'function') {
        options.restoreDeckViewAfterSlideMutation(iframeDoc, slideMutationState.preservedSelectionIds, {
          preservedActiveSlideId: slideMutationState.preservedActiveSlideId,
          fallbackIndex: Math.min(index, Math.max(0, getSlides(iframeDoc).length - 1))
        });
      }
      return false;
    }
    return true;
  }

  function reorderStudioSlideNodes(fromIndex, toIndex, options = {}) {
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const iframeDoc = getIframeDoc();
    if (!iframeDoc) return false;

    const getSlideContainer = typeof options.getSlideContainer === 'function'
      ? options.getSlideContainer
      : (doc) => doc && typeof doc.getElementById === 'function'
        ? doc.getElementById('slidesContainer')
        : null;
    const container = getSlideContainer(iframeDoc);
    if (!container) return false;

    const getSlides = typeof options.getSlides === 'function' ? options.getSlides : () => [];
    const slides = getSlides(iframeDoc);
    const draggedNode = slides[fromIndex];
    const targetNode = slides[toIndex];
    if (!draggedNode || !targetNode || fromIndex === toIndex) return false;

    const buildCanonicalReorderSlideDeck = typeof options.buildCanonicalReorderSlideDeck === 'function'
      ? options.buildCanonicalReorderSlideDeck
      : null;
    const buildCanonicalReorderSlideBaseline = typeof options.buildCanonicalReorderSlideBaseline === 'function'
      ? options.buildCanonicalReorderSlideBaseline
      : null;
    const canonicalDeckBeforeReorder = buildCanonicalReorderSlideBaseline
      ? buildCanonicalReorderSlideBaseline({
          sourceDocument: iframeDoc
        })
      : null;
    const canonicalDeckAfterReorder = buildCanonicalReorderSlideDeck
      ? buildCanonicalReorderSlideDeck({
          ...(canonicalDeckBeforeReorder
            ? { canonicalDeckBeforeMutation: canonicalDeckBeforeReorder }
            : {}),
          sourceDocument: iframeDoc,
          sourceSlide: draggedNode,
          targetSlide: targetNode,
          getSlideId: options.getSlideId
        })
      : null;
    if (canonicalDeckBeforeReorder && !canonicalDeckAfterReorder) return false;

    const captureSlideMutationState = typeof options.captureSlideMutationState === 'function'
      ? options.captureSlideMutationState
      : () => ({ preservedActiveSlideId: '', preservedSelectionIds: [] });
    const slideMutationState = captureSlideMutationState(iframeDoc);
    const applyReorder = typeof options.applyReorder === 'function'
      ? options.applyReorder
      : () => ({ didApply: false, transaction: null });
    const beforeNode = fromIndex < toIndex ? targetNode.nextSibling : targetNode;
    const mutation = applyReorder(container, draggedNode, beforeNode);
    if (!mutation || !mutation.didApply) return false;

    if (typeof options.generateThumbnails === 'function') {
      options.generateThumbnails();
    }
    const slideCount = getSlides(iframeDoc).length;
    if (typeof options.restoreDeckViewAfterSlideMutation === 'function') {
      options.restoreDeckViewAfterSlideMutation(iframeDoc, slideMutationState.preservedSelectionIds, {
        preservedActiveSlideId: slideMutationState.preservedActiveSlideId,
        fallbackIndex: slideCount === 0 ? 0 : Math.min(toIndex, slideCount - 1)
      });
    }

    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : () => {};
    const rollbackMutation = typeof options.rollbackMutation === 'function'
      ? options.rollbackMutation
      : null;
    const finalized = canonicalDeckAfterReorder
      ? finalizeMutation('Auto: Reordered Slides', mutation.transaction, canonicalDeckAfterReorder)
      : finalizeMutation('Auto: Reordered Slides', mutation.transaction);
    if (finalized === false) {
      if (rollbackMutation) rollbackMutation(mutation.transaction, iframeDoc);
      if (typeof options.generateThumbnails === 'function') {
        options.generateThumbnails();
      }
      if (typeof options.restoreDeckViewAfterSlideMutation === 'function') {
        options.restoreDeckViewAfterSlideMutation(iframeDoc, slideMutationState.preservedSelectionIds, {
          preservedActiveSlideId: slideMutationState.preservedActiveSlideId,
          fallbackIndex: Math.min(fromIndex, Math.max(0, getSlides(iframeDoc).length - 1))
        });
      }
      return false;
    }
    return true;
  }

  function applyStudioSlideInsertionWithTransaction(container, slideNode, options = {}) {
    if (!container || !slideNode) {
      return {
        didApply: false,
        transaction: null
      };
    }

    const applyStudioSlideInsertionMutation = typeof options.applyStudioSlideInsertionMutation === 'function'
      ? options.applyStudioSlideInsertionMutation
      : null;
    const createStudioMarkupTransactionCapture = typeof options.createStudioMarkupTransactionCapture === 'function'
      ? options.createStudioMarkupTransactionCapture
      : null;
    const containerElementId = typeof options.containerElementId === 'string'
      && options.containerElementId.trim()
      ? options.containerElementId.trim()
      : 'slides-container';

    if (applyStudioSlideInsertionMutation) {
      const mutation = applyStudioSlideInsertionMutation(container, slideNode, {
        createMarkupTransactionCapture: createStudioMarkupTransactionCapture,
        containerElementId,
        beforeNode: options.beforeNode,
        getElementId: options.getElementId
      });
      return {
        didApply: !!(mutation && mutation.didApply),
        transaction: mutation && mutation.transaction ? mutation.transaction : null
      };
    }

    if (typeof container.appendChild !== 'function'
      && typeof container.insertBefore !== 'function') {
      return {
        didApply: false,
        transaction: null
      };
    }

    const markupCapture = createStudioMarkupTransactionCapture
      ? createStudioMarkupTransactionCapture([{
          element: container,
          elementId: containerElementId
        }], {
          getElementId: options.getElementId
        })
      : null;
    if (options.beforeNode && typeof container.insertBefore === 'function') {
      container.insertBefore(slideNode, options.beforeNode);
    } else {
      container.appendChild(slideNode);
    }
    return {
      didApply: true,
      transaction: markupCapture
        ? markupCapture.createTransaction()
        : null
    };
  }

  function applyStudioSlideDeletionWithTransaction(container, slideNode, options = {}) {
    if (!container || !slideNode) {
      return {
        didApply: false,
        transaction: null
      };
    }

    const applyStudioSlideDeletionMutation = typeof options.applyStudioSlideDeletionMutation === 'function'
      ? options.applyStudioSlideDeletionMutation
      : null;
    const createStudioMarkupTransactionCapture = typeof options.createStudioMarkupTransactionCapture === 'function'
      ? options.createStudioMarkupTransactionCapture
      : null;
    const containerElementId = typeof options.containerElementId === 'string'
      && options.containerElementId.trim()
      ? options.containerElementId.trim()
      : 'slides-container';

    if (applyStudioSlideDeletionMutation) {
      const mutation = applyStudioSlideDeletionMutation(container, slideNode, {
        createMarkupTransactionCapture: createStudioMarkupTransactionCapture,
        containerElementId,
        getElementId: options.getElementId
      });
      return {
        didApply: !!(mutation && mutation.didApply),
        transaction: mutation && mutation.transaction ? mutation.transaction : null
      };
    }

    if (typeof slideNode.remove !== 'function') {
      return {
        didApply: false,
        transaction: null
      };
    }

    const markupCapture = createStudioMarkupTransactionCapture
      ? createStudioMarkupTransactionCapture([{
          element: container,
          elementId: containerElementId
        }], {
          getElementId: options.getElementId
        })
      : null;
    slideNode.remove();
    return {
      didApply: true,
      transaction: markupCapture
        ? markupCapture.createTransaction()
        : null
    };
  }

  function applyStudioSlideReorderWithTransaction(container, slideNode, beforeNode = null, options = {}) {
    if (!container || !slideNode) {
      return {
        didApply: false,
        transaction: null
      };
    }

    const applyStudioSlideReorderMutation = typeof options.applyStudioSlideReorderMutation === 'function'
      ? options.applyStudioSlideReorderMutation
      : null;
    const createStudioMarkupTransactionCapture = typeof options.createStudioMarkupTransactionCapture === 'function'
      ? options.createStudioMarkupTransactionCapture
      : null;
    const containerElementId = typeof options.containerElementId === 'string'
      && options.containerElementId.trim()
      ? options.containerElementId.trim()
      : 'slides-container';

    if (applyStudioSlideReorderMutation) {
      const mutation = applyStudioSlideReorderMutation(container, slideNode, beforeNode, {
        createMarkupTransactionCapture: createStudioMarkupTransactionCapture,
        containerElementId,
        getElementId: options.getElementId
      });
      return {
        didApply: !!(mutation && mutation.didApply),
        transaction: mutation && mutation.transaction ? mutation.transaction : null
      };
    }

    if (typeof container.insertBefore !== 'function') {
      return {
        didApply: false,
        transaction: null
      };
    }

    const markupCapture = createStudioMarkupTransactionCapture
      ? createStudioMarkupTransactionCapture([{
          element: container,
          elementId: containerElementId
        }], {
          getElementId: options.getElementId
        })
      : null;
    container.insertBefore(slideNode, beforeNode || null);
    return {
      didApply: true,
      transaction: markupCapture
        ? markupCapture.createTransaction()
        : null
    };
  }

  return {
    prepareStudioSlideDuplication,
    duplicateStudioSlideNode,
    addStudioSlideNode,
    deleteStudioSlideNode,
    reorderStudioSlideNodes,
    applyStudioSlideInsertionWithTransaction,
    applyStudioSlideDeletionWithTransaction,
    applyStudioSlideReorderWithTransaction
  };
});

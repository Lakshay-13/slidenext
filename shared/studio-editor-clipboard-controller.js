(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorClipboardController(options = {}) {
    const hasOption = (name) => Object.prototype.hasOwnProperty.call(options, name);
    const resolveDependency = (name, globalName) => hasOption(name)
      ? options[name]
      : (root && root[globalName]) || null;
    const clipboardApi = resolveDependency('clipboardApi', 'SlideNextStudioEditorClipboard');
    const canonicalDeckApi = resolveDependency('canonicalDeckApi', 'SlideNextCanonicalDeck');
    const canonicalInsertionApi = resolveDependency(
      'canonicalInsertionApi',
      'SlideNextStudioEditorCanonicalInsertion'
    );
    const deckImportApi = resolveDependency('deckImportApi', 'SlideNextDeckImport');
    const getClipboard = typeof options.getClipboard === 'function' ? options.getClipboard : () => null;
    const setClipboard = typeof options.setClipboard === 'function' ? options.setClipboard : () => {};
    const buildClipboardSelectionMutationPlan = typeof options.buildClipboardSelectionMutationPlan === 'function'
      ? options.buildClipboardSelectionMutationPlan
      : null;
    const finalizeClipboardActionResult = typeof options.finalizeClipboardActionResult === 'function'
      ? options.finalizeClipboardActionResult
      : (result) => result;
    const getIframeDoc = typeof options.getIframeDoc === 'function' ? options.getIframeDoc : () => null;
    const getActiveSlide = typeof options.getActiveSlide === 'function' ? options.getActiveSlide : () => null;
    const getEditorSlideId = typeof options.getEditorSlideId === 'function'
      ? options.getEditorSlideId
      : (slide) => slide && slide.id;
    const assignElementId = typeof options.assignElementId === 'function'
      ? (element) => {
          const assignedId = options.assignElementId(element);
          if (assignedId) return assignedId;
          return element && element.dataset && element.dataset.editorId;
        }
      : (element) => element && element.dataset && element.dataset.editorId;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const insertClipboardPayload = typeof options.insertClipboardPayload === 'function'
      ? options.insertClipboardPayload
      : () => [];
    const finalizeInsertedElements = typeof options.finalizeInsertedElements === 'function'
      ? options.finalizeInsertedElements
      : () => false;

    function getCanonicalInsertionSequence() {
      const importElementToCanonicalNode = deckImportApi
        && typeof deckImportApi.importElementToCanonicalNode === 'function'
        ? deckImportApi.importElementToCanonicalNode
        : null;
      const builders = canonicalInsertionApi
        && typeof canonicalInsertionApi.createStudioCanonicalInsertionMutationBuilders === 'function'
        ? canonicalInsertionApi.createStudioCanonicalInsertionMutationBuilders({
            canonicalDeckApi,
            buildCanonicalDeck,
            importElementToCanonicalNode
          })
        : null;
      return builders && typeof builders.buildCanonicalInsertionSequence === 'function'
        ? builders.buildCanonicalInsertionSequence
        : null;
    }

    function buildCanonicalInsertionContext(items) {
      const buildCanonicalInsertionSequence = getCanonicalInsertionSequence();
      if (!buildCanonicalInsertionSequence) return null;
      const doc = getIframeDoc();
      const activeSlide = getActiveSlide(doc);
      const slideId = getEditorSlideId(activeSlide);
      if (!doc || !slideId) return null;
      return { buildCanonicalInsertionSequence, doc, slideId, items };
    }

    function buildCanonicalDeckForInsertion(context) {
      if (!context || typeof context.buildCanonicalInsertionSequence !== 'function') return null;
      return context.buildCanonicalInsertionSequence(context.items, {
        slideId: context.slideId,
        sourceDocument: context.doc,
        getNodeId: (node) => assignElementId(node)
      });
    }

    function copy() {
      if (!buildClipboardSelectionMutationPlan
        || !clipboardApi
        || typeof clipboardApi.createStudioClipboardState !== 'function') {
        return finalizeClipboardActionResult(false);
      }
      const clipboardActionState = buildClipboardSelectionMutationPlan();
      if (!clipboardActionState.canCopy) return finalizeClipboardActionResult(false);
      const items = clipboardActionState.payloadItems;
      if (items.length === 0) return finalizeClipboardActionResult(false);
      setClipboard(clipboardApi.createStudioClipboardState(items));
      return finalizeClipboardActionResult(true);
    }

    function paste() {
      if (!clipboardApi || typeof clipboardApi.buildStudioClipboardPastePlan !== 'function') {
        return finalizeClipboardActionResult(false);
      }
      const pastePlan = clipboardApi.buildStudioClipboardPastePlan(getClipboard(), {
        canMutateDeck: () => !!getActiveSlide(getIframeDoc())
      });
      if (!pastePlan.canPaste) return finalizeClipboardActionResult(false);
      const insertionContext = buildCanonicalInsertionContext(pastePlan.items);
      let transaction = null;
      const pasted = insertClipboardPayload(pastePlan.items, pastePlan.nextPasteCount, {
        onTransaction(nextTransaction) {
          transaction = nextTransaction;
        }
      });
      const canonicalDeck = buildCanonicalDeckForInsertion({
        ...(insertionContext || {}),
        items: pasted
      });
      const didPaste = finalizeInsertedElements(
        pasted,
        'Auto: Pasted Element',
        transaction,
        canonicalDeck
      );
      if (didPaste) setClipboard(pastePlan.nextClipboard);
      return finalizeClipboardActionResult(didPaste);
    }

    function duplicate() {
      if (!buildClipboardSelectionMutationPlan) return finalizeClipboardActionResult(false);
      const clipboardActionState = buildClipboardSelectionMutationPlan();
      if (!clipboardActionState.canDuplicate) return finalizeClipboardActionResult(false);
      const insertionContext = buildCanonicalInsertionContext(clipboardActionState.payloadItems);
      let transaction = null;
      const duplicates = insertClipboardPayload(clipboardActionState.payloadItems, 1, {
        onTransaction(nextTransaction) {
          transaction = nextTransaction;
        }
      });
      if (duplicates.length === 0) return finalizeClipboardActionResult(false);
      const canonicalDeck = buildCanonicalDeckForInsertion({
        ...(insertionContext || {}),
        items: duplicates
      });
      return finalizeClipboardActionResult(finalizeInsertedElements(
        duplicates,
        'Auto: Duplicated Element',
        transaction,
        canonicalDeck
      ));
    }

    return { copy, paste, duplicate };
  }

  return {
    createStudioEditorClipboardController
  };
});

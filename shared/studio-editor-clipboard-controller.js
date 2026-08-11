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
    let clipboard = Object.prototype.hasOwnProperty.call(options, 'initialClipboard')
      ? options.initialClipboard
      : null;
    const getClipboard = typeof options.getClipboard === 'function'
      ? options.getClipboard
      : () => clipboard;
    const setClipboard = typeof options.setClipboard === 'function'
      ? options.setClipboard
      : (nextClipboard) => {
          clipboard = nextClipboard;
          return clipboard;
        };
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
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const insertClipboardPayload = typeof options.insertClipboardPayload === 'function'
      ? options.insertClipboardPayload
      : () => [];
    const finalizeInsertedElements = typeof options.finalizeInsertedElements === 'function'
      ? options.finalizeInsertedElements
      : () => false;

    function isValidCanonicalDeck(value) {
      if (!value) return false;
      const validate = canonicalDeckApi
        && typeof canonicalDeckApi.isCanonicalDeck === 'function'
        ? canonicalDeckApi.isCanonicalDeck
        : (candidate) => !!candidate
          && typeof candidate === 'object'
          && !Array.isArray(candidate)
          && Array.isArray(candidate.slides);
      try {
        return validate(value) === true;
      } catch (error) {
        return false;
      }
    }

    function getCanonicalInsertionSequence() {
      const importElementToCanonicalNode = deckImportApi
        && typeof deckImportApi.importElementToCanonicalNode === 'function'
        ? deckImportApi.importElementToCanonicalNode
        : null;
      let builders = null;
      try {
        builders = canonicalInsertionApi
          && typeof canonicalInsertionApi.createStudioCanonicalInsertionMutationBuilders === 'function'
          ? canonicalInsertionApi.createStudioCanonicalInsertionMutationBuilders({
              canonicalDeckApi,
              buildCanonicalDeck,
              buildCanonicalDeckBaseline,
              getCanonicalDeckBaseline,
              importElementToCanonicalNode
            })
          : null;
      } catch (err) {
        return null;
      }
      return builders && typeof builders.buildCanonicalInsertionSequence === 'function'
        ? builders.buildCanonicalInsertionSequence
        : null;
    }

    function buildCanonicalInsertionContext(items) {
      const buildCanonicalInsertionSequence = getCanonicalInsertionSequence();
      if (!buildCanonicalInsertionSequence && !getCanonicalDeckBaseline) return null;
      const doc = getIframeDoc();
      const activeSlide = getActiveSlide(doc);
      const slideId = getEditorSlideId(activeSlide);
      if (!doc || !slideId) return null;
      let canonicalDeckBefore = null;
      if (getCanonicalDeckBaseline) {
        try {
          const candidate = getCanonicalDeckBaseline(doc);
          if (isValidCanonicalDeck(candidate)) canonicalDeckBefore = candidate;
        } catch (error) {
          canonicalDeckBefore = null;
        }
      }
      return {
        buildCanonicalInsertionSequence,
        canonicalDeckBefore,
        hasCanonicalBaseline: !!canonicalDeckBefore,
        doc,
        slideId,
        items
      };
    }

    function buildCanonicalDeckForInsertion(context) {
      const sourceDocument = context && context.doc
        ? context.doc
        : getIframeDoc();
      const insertedItems = context && Array.isArray(context.items) ? context.items : [];
      let liveCanonicalDeck = context && context.canonicalDeckBefore
        ? context.canonicalDeckBefore
        : null;
      if (!liveCanonicalDeck && getCanonicalDeckBaseline) {
        try {
          liveCanonicalDeck = getCanonicalDeckBaseline(sourceDocument);
        } catch (err) {
          liveCanonicalDeck = null;
        }
        if (liveCanonicalDeck && !isValidCanonicalDeck(liveCanonicalDeck)) {
          liveCanonicalDeck = null;
        }
      }
      if (liveCanonicalDeck && context && typeof context.buildCanonicalInsertionSequence === 'function') {
        const canonicalDeckFromSequence = context.buildCanonicalInsertionSequence(insertedItems, {
          slideId: context.slideId,
          sourceDocument,
          canonicalDeckBeforeMutation: liveCanonicalDeck,
          getNodeId: (node) => assignElementId(node)
        });
        if (canonicalDeckFromSequence) return canonicalDeckFromSequence;
      }
      const fallbackCanonicalDeckBuilder = buildCanonicalDeckBaseline || buildCanonicalDeck;
      if (fallbackCanonicalDeckBuilder && sourceDocument) {
        const liveCanonicalDeck = fallbackCanonicalDeckBuilder(sourceDocument, {
          preferLiveCanonicalDeck: false
        });
        const insertedIds = insertedItems
          .map((item) => assignElementId(item))
          .filter((id) => typeof id === 'string' && id.trim());
        const canonicalNodeIds = new Set();
        const collectCanonicalNodeIds = (nodes = []) => {
          (Array.isArray(nodes) ? nodes : []).forEach((node) => {
            if (!node || typeof node !== 'object') return;
            if (typeof node.id === 'string' && node.id.trim()) {
              canonicalNodeIds.add(node.id);
            }
            collectCanonicalNodeIds(node.children);
          });
        };
        if (liveCanonicalDeck && Array.isArray(liveCanonicalDeck.slides)) {
          liveCanonicalDeck.slides.forEach((slide) => collectCanonicalNodeIds(slide && slide.nodes));
        }
        if (liveCanonicalDeck && (insertedIds.length === 0
          || insertedIds.every((id) => canonicalNodeIds.has(id)))) {
          return liveCanonicalDeck;
        }
      }
      if (!context || typeof context.buildCanonicalInsertionSequence !== 'function') return null;
      return context.buildCanonicalInsertionSequence(context.items, {
        slideId: context.slideId,
        sourceDocument: context.doc,
        getNodeId: (node) => assignElementId(node)
      });
    }

    function removeInsertedElements(insertedElements = []) {
      let didRemoveAll = true;
      (Array.isArray(insertedElements) ? insertedElements : []).forEach((element) => {
        if (!element) return;
        try {
          if (typeof element.remove === 'function') {
            element.remove();
            return;
          }
          if (element.parentNode && typeof element.parentNode.removeChild === 'function') {
            element.parentNode.removeChild(element);
            return;
          }
          didRemoveAll = false;
        } catch (error) {
          didRemoveAll = false;
        }
      });
      return didRemoveAll;
    }

    function tryBuildCanonicalDeckForInsertion(context) {
      try {
        return buildCanonicalDeckForInsertion(context);
      } catch (err) {
        // Preserve the pasted or duplicated DOM mutation through its transaction.
        return null;
      }
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
      const canonicalDeck = tryBuildCanonicalDeckForInsertion({
        ...(insertionContext || {}),
        items: pasted
      });
      if (insertionContext && insertionContext.hasCanonicalBaseline && !canonicalDeck) {
        removeInsertedElements(pasted);
        return finalizeClipboardActionResult(false);
      }
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
      const canonicalDeck = tryBuildCanonicalDeckForInsertion({
        ...(insertionContext || {}),
        items: duplicates
      });
      if (insertionContext && insertionContext.hasCanonicalBaseline && !canonicalDeck) {
        removeInsertedElements(duplicates);
        return finalizeClipboardActionResult(false);
      }
      return finalizeClipboardActionResult(finalizeInsertedElements(
        duplicates,
        'Auto: Duplicated Element',
        transaction,
        canonicalDeck
      ));
    }

    return {
      copy,
      paste,
      duplicate,
      getClipboard,
      setClipboard,
      clearClipboard() {
        return setClipboard(null);
      }
    };
  }

  return {
    createStudioEditorClipboardController
  };
});

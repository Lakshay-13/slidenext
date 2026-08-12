(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorRemovalController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorRemovalController(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    const canonicalRemovalApi = options.canonicalRemovalApi
      || (root && root.SlideNextStudioEditorCanonicalRemoval)
      || null;
    const buildRemovalSelectionActionState = typeof options.buildRemovalSelectionActionState === 'function'
      ? options.buildRemovalSelectionActionState
      : null;
    const finalizeRemovalActionResult = typeof options.finalizeRemovalActionResult === 'function'
      ? options.finalizeRemovalActionResult
      : (result) => result;
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
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
    const applyRemovalMutation = typeof options.applyRemovalMutation === 'function'
      ? options.applyRemovalMutation
      : () => ({ didRemove: false, transaction: null });
    const deselectElement = typeof options.deselectElement === 'function'
      ? options.deselectElement
      : null;
    const rollbackMutation = typeof options.rollbackMutation === 'function'
      ? options.rollbackMutation
      : null;
    const restoreSelection = typeof options.restoreSelection === 'function'
      ? options.restoreSelection
      : null;
    const finalizeDeckMutation = typeof options.finalizeDeckMutation === 'function'
      ? options.finalizeDeckMutation
      : null;

    function finalizeRemovalMutation(versionLabel, options = {}) {
      if (!finalizeDeckMutation) return false;
      try {
        return finalizeDeckMutation(versionLabel, options);
      } catch (error) {
        return false;
      }
    }

    function remove(sourceDoc) {
      const doc = sourceDoc || getIframeDoc();
      if (!buildRemovalSelectionActionState) return finalizeRemovalActionResult(false, doc);
      const removalActionState = buildRemovalSelectionActionState(doc);
      if (!removalActionState.canRemove) return finalizeRemovalActionResult(false, doc);
      if (!finalizeDeckMutation) return finalizeRemovalActionResult(false, doc);
      const getRemovalElementId = (element) => assignElementId(element);
      let canonicalDeck = null;
      let canonicalDeckBeforeRemoval = null;
      try {
        const canonicalRemovalBuilders = canonicalRemovalApi
          && typeof canonicalRemovalApi.createStudioCanonicalRemovalMutationBuilders === 'function'
          ? canonicalRemovalApi.createStudioCanonicalRemovalMutationBuilders({
              canonicalDeckApi,
              buildCanonicalDeck,
              buildCanonicalDeckBaseline,
              getCanonicalDeckBaseline
            })
          : null;
        const buildCanonicalRemovalMutation = canonicalRemovalBuilders
          && typeof canonicalRemovalBuilders.buildCanonicalRemovalMutation === 'function'
          ? canonicalRemovalBuilders.buildCanonicalRemovalMutation
          : null;
        const buildCanonicalRemovalBaseline = canonicalRemovalBuilders
          && typeof canonicalRemovalBuilders.buildCanonicalRemovalBaseline === 'function'
          ? canonicalRemovalBuilders.buildCanonicalRemovalBaseline
          : null;
        if (buildCanonicalRemovalBaseline) {
          canonicalDeckBeforeRemoval = buildCanonicalRemovalBaseline({ sourceDocument: doc });
        }
        canonicalDeck = buildCanonicalRemovalMutation
          ? buildCanonicalRemovalMutation(removalActionState.selection, {
              sourceDocument: doc,
              canonicalDeckBeforeMutation: canonicalDeckBeforeRemoval,
              getElementId: getRemovalElementId
            })
          : null;
      } catch (err) {
        // Do not remove DOM nodes without a canonical deletion sidecar.
        return finalizeRemovalActionResult(false, doc);
      }
      if (canonicalDeckBeforeRemoval && !canonicalDeck) {
        return finalizeRemovalActionResult(false, doc);
      }
      const selectedElementIds = restoreSelection
        ? removalActionState.selection
            .map((element) => getRemovalElementId(element))
            .filter((elementId) => typeof elementId === 'string' && elementId.trim())
        : [];
      const mutation = applyRemovalMutation(removalActionState.selection, {
        getElementId: getRemovalElementId,
        removeElement(element) {
          element.remove();
        }
      });
      if (!mutation || !mutation.didRemove) return finalizeRemovalActionResult(false, doc);
      if (deselectElement) deselectElement();
      const finalizeResult = finalizeRemovalMutation('Auto: Deleted Element', {
        transaction: mutation.transaction,
        ...(canonicalDeck ? { canonicalDeck } : {})
      });
      if (finalizeResult === false) {
        if (rollbackMutation) rollbackMutation(mutation.transaction, doc);
        if (restoreSelection) restoreSelection(selectedElementIds, doc);
        return finalizeRemovalActionResult(false, doc);
      }
      return true;
    }

    return {
      remove
    };
  }

  return {
    createStudioEditorRemovalController
  };
});

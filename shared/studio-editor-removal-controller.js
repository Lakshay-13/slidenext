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
    const removalTransactionApi = options.removalTransactionApi
      || (root && root.SlideNextStudioEditorRemovalTransaction)
      || null;
    const removalMutationApi = options.removalMutationApi
      || (root && root.SlideNextStudioEditorRemovalMutation)
      || null;
    const removalApi = options.removalApi
      || (root && root.SlideNextStudioEditorRemoval)
      || null;
    const transactionApi = options.transactionApi
      || (root && root.SlideNextStudioEditorTransaction)
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
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const createRemovalApplicator = removalTransactionApi
      && typeof removalTransactionApi.createStudioEditorRemovalApplicator === 'function'
      ? removalTransactionApi.createStudioEditorRemovalApplicator
      : null;
    const applyRemovalMutation = createRemovalApplicator
      ? createRemovalApplicator({
          mutationApi: removalMutationApi,
          removalApi,
          transactionApi,
          legacyApplyRemoval: options.applyRemovalMutation
        })
      : typeof options.applyRemovalMutation === 'function'
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

    function rollbackRemovalMutation(transaction, doc) {
      if (!rollbackMutation) return;
      try {
        rollbackMutation(transaction, doc);
      } catch (err) {
        // Preserve the failed action result so selection restoration can still run.
      }
    }

    function restoreRemovalSelection(selectedElementIds, doc) {
      if (!restoreSelection) return;
      try {
        restoreSelection(selectedElementIds, doc);
      } catch (err) {
        // Selection chrome is secondary; preserve the failed removal result.
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
              getPendingCanonicalDeck,
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
        rollbackRemovalMutation(mutation.transaction, doc);
        restoreRemovalSelection(selectedElementIds, doc);
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

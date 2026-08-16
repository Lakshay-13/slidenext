(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAlignmentController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorAlignmentController(options = {}) {
    const alignmentApi = options.alignmentApi
      || (root && root.SlideNextStudioEditorAlignment)
      || null;
    const canonicalLayoutApi = options.canonicalLayoutApi
      || (root && root.SlideNextStudioEditorCanonicalLayout)
      || null;
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    const buildAlignmentActionState = typeof options.buildAlignmentActionState === 'function'
      ? options.buildAlignmentActionState
      : null;
    const updateAlignmentActionState = typeof options.updateAlignmentActionState === 'function'
      ? options.updateAlignmentActionState
      : null;
    const assignElementId = typeof options.assignElementId === 'function'
      ? options.assignElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
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
    const applyPositionLayout = typeof options.applyPositionLayout === 'function'
      ? options.applyPositionLayout
      : () => ({ didApply: false, transaction: null });
    const finalizeDeckMutation = typeof options.finalizeDeckMutation === 'function'
      ? options.finalizeDeckMutation
      : null;
    const rollbackPositionMutation = typeof options.rollbackPositionMutation === 'function'
      ? options.rollbackPositionMutation
      : null;

    function rollbackMutation(transaction, doc) {
      if (!rollbackPositionMutation) return;
      try {
        rollbackPositionMutation(transaction, doc);
      } catch (error) {
        // A rollback failure must not break the editor event handler.
      }
    }

    function refreshActionState() {
      if (!updateAlignmentActionState) return;
      try {
        updateAlignmentActionState();
      } catch (error) {
        // A toolbar refresh failure must not change the alignment result.
      }
    }

    function applyLayoutMutation(nextItems, versionLabel) {
      if (!finalizeDeckMutation) return false;
      const getAlignmentElementId = (element) => assignElementId(element);
      const canonicalLayoutBuilder = canonicalLayoutApi
        && typeof canonicalLayoutApi.createStudioCanonicalLayoutMutationBuilder === 'function'
        ? canonicalLayoutApi.createStudioCanonicalLayoutMutationBuilder({
            canonicalDeckApi,
            buildCanonicalDeck,
            buildCanonicalDeckBaseline,
            getPendingCanonicalDeck,
            getCanonicalDeckBaseline
          })
        : null;
      const doc = getIframeDoc();
      let hasCanonicalBaseline = false;
      if (canonicalLayoutBuilder
        && canonicalLayoutApi
        && typeof canonicalLayoutApi.buildStudioCanonicalLayoutBaseline === 'function') {
        try {
          hasCanonicalBaseline = !!canonicalLayoutApi.buildStudioCanonicalLayoutBaseline({
            canonicalDeckApi,
            buildCanonicalDeckBaseline,
            getPendingCanonicalDeck,
            getCanonicalDeckBaseline,
            sourceDocument: doc
          });
        } catch (err) {
          return false;
        }
      }
      let canonicalDeck = null;
      if (canonicalLayoutBuilder) {
        try {
          canonicalDeck = canonicalLayoutBuilder({
            sourceDocument: doc,
            nextItems,
            getElementId: getAlignmentElementId
          });
        } catch (err) {
          // Do not apply a DOM-only alignment when the canonical sidecar fails.
          return false;
        }
      }
      if (hasCanonicalBaseline && !canonicalDeck) return false;
      const mutation = applyPositionLayout(nextItems, {
        getElementId: getAlignmentElementId
      });
      if (!mutation || !mutation.didApply) return false;

      let finalizeResult = false;
      try {
        finalizeResult = finalizeDeckMutation(versionLabel, {
          syncSelectionOverlay: true,
          refreshThumbnails: false,
          debounceHistory: true,
          transaction: mutation.transaction,
          ...(canonicalDeck ? { canonicalDeck } : {})
        });
      } catch (error) {
        finalizeResult = false;
      }
      if (finalizeResult === false) {
        rollbackMutation(mutation.transaction, doc);
        return false;
      }
      return true;
    }

    function resolveAlignmentActionState() {
      if (!buildAlignmentActionState) return null;
      try {
        const actionState = buildAlignmentActionState();
        return actionState && actionState.alignmentActionState
          ? actionState.alignmentActionState
          : null;
      } catch (error) {
        return null;
      }
    }

    function align(action = '') {
      const alignmentActionState = resolveAlignmentActionState();
      if (!alignmentActionState || !alignmentActionState.canAlign) {
        refreshActionState();
        return false;
      }

      const buildAlignedLayout = alignmentApi
        && typeof alignmentApi.buildStudioAlignedLayout === 'function'
        ? alignmentApi.buildStudioAlignedLayout
        : null;
      if (!buildAlignedLayout) return false;
      const alignmentResult = buildAlignedLayout(alignmentActionState.selection, action);
      if (!alignmentResult || !alignmentResult.didChange) return false;
      return applyLayoutMutation(alignmentResult.nextItems, `Auto: Aligned ${action}`);
    }

    function distribute(axis = '') {
      const alignmentActionState = resolveAlignmentActionState();
      if (!alignmentActionState
        || !alignmentActionState.canAlign
        || alignmentActionState.selection.length < 3) {
        refreshActionState();
        return false;
      }

      const buildDistributedLayout = alignmentApi
        && typeof alignmentApi.buildStudioDistributedLayout === 'function'
        ? alignmentApi.buildStudioDistributedLayout
        : null;
      if (!buildDistributedLayout) return false;
      const distributionResult = buildDistributedLayout(alignmentActionState.selection, axis);
      if (!distributionResult || !distributionResult.didChange) return false;
      return applyLayoutMutation(distributionResult.nextItems, `Auto: Distributed ${axis}`);
    }

    return {
      align,
      distribute
    };
  }

  return {
    createStudioEditorAlignmentController
  };
});

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
    const applyPositionLayout = typeof options.applyPositionLayout === 'function'
      ? options.applyPositionLayout
      : () => ({ didApply: false, transaction: null });
    const finalizeDeckMutation = typeof options.finalizeDeckMutation === 'function'
      ? options.finalizeDeckMutation
      : null;

    function applyLayoutMutation(nextItems, versionLabel) {
      const getAlignmentElementId = (element) => assignElementId(element);
      const canonicalLayoutBuilder = canonicalLayoutApi
        && typeof canonicalLayoutApi.createStudioCanonicalLayoutMutationBuilder === 'function'
        ? canonicalLayoutApi.createStudioCanonicalLayoutMutationBuilder({
            canonicalDeckApi,
            buildCanonicalDeck,
            buildCanonicalDeckBaseline,
            getCanonicalDeckBaseline
          })
        : null;
      const canonicalDeck = canonicalLayoutBuilder
        ? canonicalLayoutBuilder({
            sourceDocument: getIframeDoc(),
            nextItems,
            getElementId: getAlignmentElementId
          })
        : null;
      const mutation = applyPositionLayout(nextItems, {
        getElementId: getAlignmentElementId
      });
      if (!mutation || !mutation.didApply) return false;

      if (finalizeDeckMutation) {
        finalizeDeckMutation(versionLabel, {
          syncSelectionOverlay: true,
          refreshThumbnails: false,
          debounceHistory: true,
          transaction: mutation.transaction,
          ...(canonicalDeck ? { canonicalDeck } : {})
        });
      }
      return true;
    }

    function align(action = '') {
      if (!buildAlignmentActionState) return false;
      const alignmentActionState = buildAlignmentActionState().alignmentActionState;
      if (!alignmentActionState.canAlign) {
        if (updateAlignmentActionState) updateAlignmentActionState();
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
      if (!buildAlignmentActionState) return false;
      const alignmentActionState = buildAlignmentActionState().alignmentActionState;
      if (!alignmentActionState.canAlign || alignmentActionState.selection.length < 3) {
        if (updateAlignmentActionState) updateAlignmentActionState();
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

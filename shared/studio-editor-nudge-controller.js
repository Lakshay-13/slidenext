(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorNudgeController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorNudgeController(options = {}) {
    const nudgeApi = options.nudgeApi
      || (root && root.SlideNextStudioEditorNudge)
      || null;
    const canonicalLayoutApi = options.canonicalLayoutApi
      || (root && root.SlideNextStudioEditorCanonicalLayout)
      || null;
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    const buildMotionSelectionActionState = typeof options.buildMotionSelectionActionState === 'function'
      ? options.buildMotionSelectionActionState
      : null;
    const updateMotionActionState = typeof options.updateMotionActionState === 'function'
      ? options.updateMotionActionState
      : null;
    const assignElementId = typeof options.assignElementId === 'function'
      ? options.assignElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const applyPositionLayout = typeof options.applyPositionLayout === 'function'
      ? options.applyPositionLayout
      : () => ({ didApply: false, transaction: null });
    const finalizeDeckMutation = typeof options.finalizeDeckMutation === 'function'
      ? options.finalizeDeckMutation
      : null;

    function nudge(dx, dy) {
      if (!buildMotionSelectionActionState) return false;

      const motionActionState = buildMotionSelectionActionState();
      const { doc, nudgeLayoutItems, slideBounds } = motionActionState || {};
      if (!motionActionState || !motionActionState.canNudge) {
        if (updateMotionActionState) updateMotionActionState(doc);
        return false;
      }

      const buildNudgedLayout = nudgeApi
        && typeof nudgeApi.buildStudioNudgedLayout === 'function'
        ? nudgeApi.buildStudioNudgedLayout
        : null;
      if (!buildNudgedLayout) return false;
      const nudgeResult = buildNudgedLayout(nudgeLayoutItems, { dx, dy }, slideBounds);
      if (!nudgeResult || !nudgeResult.didChange) return false;

      const getNudgeElementId = (element) => assignElementId(element);
      const canonicalLayoutBuilder = canonicalLayoutApi
        && typeof canonicalLayoutApi.createStudioCanonicalLayoutMutationBuilder === 'function'
        ? canonicalLayoutApi.createStudioCanonicalLayoutMutationBuilder({
            canonicalDeckApi,
            buildCanonicalDeck,
            buildCanonicalDeckBaseline
          })
        : null;
      const canonicalDeck = canonicalLayoutBuilder
        ? canonicalLayoutBuilder({
            sourceDocument: doc,
            nextItems: nudgeResult.nextItems,
            getElementId: getNudgeElementId
          })
        : null;
      const applyStudioNudgedLayout = nudgeApi
        && typeof nudgeApi.applyStudioNudgedLayout === 'function'
        ? nudgeApi.applyStudioNudgedLayout
        : null;
      const mutation = applyPositionLayout(nudgeResult.nextItems, {
        getElementId: getNudgeElementId,
        applyLayout: applyStudioNudgedLayout
      });
      if (!mutation || !mutation.didApply) return false;

      if (finalizeDeckMutation) {
        finalizeDeckMutation('Auto: Nudged Element', {
          syncSelectionOverlay: true,
          refreshThumbnails: false,
          debounceHistory: true,
          transaction: mutation.transaction,
          ...(canonicalDeck ? { canonicalDeck } : {})
        });
      }
      return true;
    }

    return {
      nudge
    };
  }

  return {
    createStudioEditorNudgeController
  };
});

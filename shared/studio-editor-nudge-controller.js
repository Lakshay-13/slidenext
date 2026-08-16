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

    function refreshActionState(doc) {
      if (!updateMotionActionState) return;
      try {
        updateMotionActionState(doc);
      } catch (error) {
        // A toolbar refresh failure must not change the nudge result.
      }
    }

    function nudge(dx, dy, sourceDoc) {
      if (!buildMotionSelectionActionState) return false;

      let motionActionState;
      try {
        motionActionState = buildMotionSelectionActionState(sourceDoc);
      } catch (error) {
        refreshActionState(sourceDoc);
        return false;
      }
      const { doc, nudgeLayoutItems, slideBounds } = motionActionState || {};
      if (!motionActionState || !motionActionState.canNudge) {
        refreshActionState(doc);
        return false;
      }

      const buildNudgedLayout = nudgeApi
        && typeof nudgeApi.buildStudioNudgedLayout === 'function'
        ? nudgeApi.buildStudioNudgedLayout
        : null;
      if (!buildNudgedLayout) return false;
      const nudgeResult = buildNudgedLayout(nudgeLayoutItems, { dx, dy }, slideBounds);
      if (!nudgeResult || !nudgeResult.didChange) return false;
      if (!finalizeDeckMutation) return false;

      const getNudgeElementId = (element) => assignElementId(element);
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
            nextItems: nudgeResult.nextItems,
            getElementId: getNudgeElementId
          });
        } catch (err) {
          // Do not apply a DOM-only movement when the canonical sidecar fails.
          return false;
        }
      }
      if (hasCanonicalBaseline && !canonicalDeck) return false;
      const applyStudioNudgedLayout = nudgeApi
        && typeof nudgeApi.applyStudioNudgedLayout === 'function'
        ? nudgeApi.applyStudioNudgedLayout
        : null;
      const mutation = applyPositionLayout(nudgeResult.nextItems, {
        getElementId: getNudgeElementId,
        applyLayout: applyStudioNudgedLayout
      });
      if (!mutation || !mutation.didApply) return false;

      let finalizeResult = false;
      try {
        finalizeResult = finalizeDeckMutation('Auto: Nudged Element', {
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

    return {
      nudge
    };
  }

  return {
    createStudioEditorNudgeController
  };
});

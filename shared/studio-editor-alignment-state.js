(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAlignmentState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorAlignmentStateController(options = {}) {
    const alignmentApi = options.alignmentApi && typeof options.alignmentApi === 'object'
      ? options.alignmentApi
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const buildMotionActionState = typeof options.buildMotionActionState === 'function'
      ? options.buildMotionActionState
      : () => ({
          slide: null,
          nudgeLayoutItems: [],
          canNudge: false
        });
    const getLockedState = typeof options.getLockedState === 'function'
      ? options.getLockedState
      : () => () => false;
    const documentRef = options.documentRef || null;
    const injectedActionState = typeof options.getActionState === 'function'
      ? options.getActionState
      : null;
    let actionStateBuilder = null;
    let toolbarStateSync = null;

    function buildDisabledState(motionActionState = {}) {
      return {
        ...motionActionState,
        alignmentActionState: {
          selection: [],
          canAlign: false
        }
      };
    }

    function buildActionState(doc = null) {
      const resolvedDoc = doc || getDocument();
      if (injectedActionState) {
        try {
          return injectedActionState(resolvedDoc) || buildDisabledState();
        } catch (error) {
          return buildDisabledState();
        }
      }

      let motionActionState = {};
      try {
        motionActionState = buildMotionActionState(resolvedDoc) || {};
      } catch (error) {
        motionActionState = {};
      }
      if (!alignmentApi) return buildDisabledState(motionActionState);

      if (typeof alignmentApi.createStudioAlignmentActionStateBuilder === 'function') {
        if (!actionStateBuilder) {
          try {
            actionStateBuilder = alignmentApi.createStudioAlignmentActionStateBuilder({
              getDocument,
              buildMotionActionState,
              getLockedState
            });
          } catch (error) {
            actionStateBuilder = null;
          }
        }
        if (typeof actionStateBuilder === 'function') {
          try {
            return actionStateBuilder(resolvedDoc);
          } catch (error) {
            return buildDisabledState(motionActionState);
          }
        }
      }

      if (typeof alignmentApi.buildStudioAlignmentActionState !== 'function') {
        return buildDisabledState(motionActionState);
      }
      try {
        const lockedState = getLockedState(resolvedDoc);
        return {
          ...motionActionState,
          alignmentActionState: alignmentApi.buildStudioAlignmentActionState(
            Array.isArray(motionActionState.nudgeLayoutItems)
              ? motionActionState.nudgeLayoutItems
              : [],
            {
              isLocked: typeof lockedState === 'function' ? lockedState : () => false,
              canMutateDeck: () => !!motionActionState.slide && motionActionState.canNudge
            }
          )
        };
      } catch (error) {
        return buildDisabledState(motionActionState);
      }
    }

    function sync(doc = null) {
      if (!alignmentApi || typeof alignmentApi.syncStudioAlignmentToolbarState !== 'function') {
        return false;
      }
      const resolvedDoc = doc || getDocument();
      if (typeof alignmentApi.createStudioAlignmentToolbarStateSync === 'function') {
        if (!toolbarStateSync) {
          try {
            toolbarStateSync = alignmentApi.createStudioAlignmentToolbarStateSync({
              getDocument,
              getActionState: buildActionState,
              getDocumentRef: () => documentRef
            });
          } catch (error) {
            toolbarStateSync = null;
          }
        }
        if (typeof toolbarStateSync === 'function') {
          try {
            return toolbarStateSync(resolvedDoc);
          } catch (error) {
            return false;
          }
        }
      }

      const actionState = buildActionState(resolvedDoc);
      const motionActionState = actionState || {};
      let lockedState = () => false;
      try {
        const resolvedLockedState = getLockedState(resolvedDoc);
        if (typeof resolvedLockedState === 'function') lockedState = resolvedLockedState;
      } catch (error) {
        // Keep the toolbar disabled when canonical visibility cannot be read.
      }
      return alignmentApi.syncStudioAlignmentToolbarState({
        documentRef,
        items: Array.isArray(motionActionState.nudgeLayoutItems)
          ? motionActionState.nudgeLayoutItems
          : [],
        isLocked: lockedState,
        canMutateDeck: () => !!motionActionState.slide && motionActionState.canNudge
      });
    }

    return {
      buildActionState,
      sync
    };
  }

  return {
    createStudioEditorAlignmentStateController
  };
});

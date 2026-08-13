(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGroupState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorGroupStateController(options = {}) {
    const groupApi = options.groupApi && typeof options.groupApi === 'object'
      ? options.groupApi
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getLiveSelectedElements = typeof options.getLiveSelectedElements === 'function'
      ? options.getLiveSelectedElements
      : (selection) => selection;
    const getSlideMetrics = typeof options.getSlideMetrics === 'function'
      ? options.getSlideMetrics
      : () => null;
    const buildPositionedLayoutItems = typeof options.buildPositionedLayoutItems === 'function'
      ? options.buildPositionedLayoutItems
      : () => [];
    const getClosestPositionedAncestor = typeof options.getClosestPositionedAncestor === 'function'
      ? options.getClosestPositionedAncestor
      : () => null;
    const getRectOnSlide = typeof options.getRectOnSlide === 'function'
      ? options.getRectOnSlide
      : (rect) => rect;
    const getLockedState = typeof options.getLockedState === 'function'
      ? options.getLockedState
      : () => () => false;
    const getFreeformPositioned = typeof options.getFreeformPositioned === 'function'
      ? options.getFreeformPositioned
      : () => null;
    const isFreeformPositioned = typeof options.isFreeformPositioned === 'function'
      ? options.isFreeformPositioned
      : () => false;
    let actionStateBuilder = null;

    function buildDisabledState() {
      return {
        slide: null,
        selection: [],
        layoutItems: [],
        parent: null,
        groupPlan: {
          canGroup: false,
          selection: [],
          bounds: null,
          nextItems: []
        },
        canGroup: false
      };
    }

    function resolveLockedState(doc) {
      try {
        const resolved = getLockedState(doc);
        return typeof resolved === 'function' ? resolved : () => false;
      } catch (error) {
        return () => false;
      }
    }

    function resolveFreeformPositioned(doc) {
      try {
        const resolved = getFreeformPositioned(doc);
        return typeof resolved === 'function' ? resolved : isFreeformPositioned;
      } catch (error) {
        return isFreeformPositioned;
      }
    }

    function buildActionState(doc = null) {
      if (!groupApi) return buildDisabledState();
      const hasActionStateBuilder = typeof groupApi.buildStudioGroupPlan === 'function'
        || typeof groupApi.buildStudioGroupSelectionActionState === 'function'
        || typeof groupApi.createStudioGroupSelectionActionStateBuilder === 'function';
      if (!hasActionStateBuilder) return buildDisabledState();

      if (typeof groupApi.createStudioGroupSelectionActionStateBuilder === 'function') {
        if (!actionStateBuilder) {
          try {
            actionStateBuilder = groupApi.createStudioGroupSelectionActionStateBuilder({
              getDocument,
              getSelectedElements,
              getActiveSlide,
              getLiveSelectedElements,
              getSlideMetrics,
              buildPositionedLayoutItems,
              getClosestPositionedAncestor,
              getRectOnSlide,
              getLockedState: (sourceDoc) => resolveLockedState(sourceDoc),
              getFreeformPositioned: (sourceDoc) => resolveFreeformPositioned(sourceDoc)
            });
          } catch (error) {
            actionStateBuilder = null;
          }
        }
        if (typeof actionStateBuilder === 'function') {
          try {
            return actionStateBuilder(doc);
          } catch (error) {
            return buildDisabledState();
          }
        }
      }

      const buildGroupPlan = typeof groupApi.buildStudioGroupPlan === 'function'
        ? groupApi.buildStudioGroupPlan
        : null;
      if (typeof groupApi.buildStudioGroupSelectionActionState !== 'function' && !buildGroupPlan) {
        return buildDisabledState();
      }

      const resolvedDoc = doc || getDocument();
      const freeformPositioned = resolveFreeformPositioned(resolvedDoc);
      const lockedState = resolveLockedState(resolvedDoc);

      if (typeof groupApi.buildStudioGroupSelectionActionState === 'function') {
        try {
          return groupApi.buildStudioGroupSelectionActionState(getSelectedElements(resolvedDoc), {
            doc: resolvedDoc,
            getActiveSlide,
            getLiveSelectedElements,
            getSlideMetrics,
            buildPositionedLayoutItems,
            getClosestPositionedAncestor,
            getRectOnSlide,
            isLocked: lockedState,
            isFreeformPositioned: freeformPositioned
          });
        } catch (error) {
          return buildDisabledState();
        }
      }

      let slide = null;
      let selection = [];
      try {
        slide = getActiveSlide(resolvedDoc);
        selection = getLiveSelectedElements(getSelectedElements(resolvedDoc), resolvedDoc) || [];
      } catch (error) {
        return buildDisabledState();
      }
      if (!resolvedDoc || !slide || selection.length < 2) {
        return {
          ...buildDisabledState(),
          slide,
          selection
        };
      }

      let layoutItems = [];
      try {
        const slideMetrics = getSlideMetrics(slide);
        layoutItems = buildPositionedLayoutItems(selection, {
          getClosestPositionedAncestor,
          getRectOnSlide,
          slideMetrics
        });
        const parent = getClosestPositionedAncestor(selection[0]);
        const sameDirectParent = !!parent && selection.every((element) => {
          return element.parentElement === parent
            && getClosestPositionedAncestor(element) === parent;
        });
        const groupPlan = buildGroupPlan(layoutItems, {
          isLocked: lockedState,
          isFreeformPositioned: freeformPositioned
        });
        return {
          slide,
          selection,
          layoutItems,
          parent: sameDirectParent ? parent : null,
          groupPlan,
          canGroup: !!(sameDirectParent
            && groupPlan
            && groupPlan.canGroup
            && groupPlan.selection.length === selection.length)
        };
      } catch (error) {
        return {
          ...buildDisabledState(),
          slide,
          selection,
          layoutItems
        };
      }
    }

    return {
      buildActionState
    };
  }

  return {
    createStudioEditorGroupStateController
  };
});

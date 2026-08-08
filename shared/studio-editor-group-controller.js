(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGroupController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorGroupController(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    const canonicalGroupApi = options.canonicalGroupApi
      || (root && root.SlideNextStudioEditorCanonicalGroup)
      || null;
    const deckImportApi = options.deckImportApi
      || (root && root.SlideNextDeckImport)
      || null;
    const buildGroupSelectionActionState = typeof options.buildGroupSelectionActionState === 'function'
      ? options.buildGroupSelectionActionState
      : null;
    const buildUngroupSelectionActionState = typeof options.buildUngroupSelectionActionState === 'function'
      ? options.buildUngroupSelectionActionState
      : null;
    const updateGroupActionState = typeof options.updateGroupActionState === 'function'
      ? options.updateGroupActionState
      : null;
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const getSlideMetrics = typeof options.getSlideMetrics === 'function'
      ? options.getSlideMetrics
      : () => null;
    const getRectOnSlide = typeof options.getRectOnSlide === 'function'
      ? options.getRectOnSlide
      : (rect) => rect;
    const getNormalizedSlideLayerOrder = typeof options.getNormalizedSlideLayerOrder === 'function'
      ? options.getNormalizedSlideLayerOrder
      : () => [];
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
    const getEditorSlideId = typeof options.getEditorSlideId === 'function'
      ? options.getEditorSlideId
      : (slide) => slide && slide.id;
    const applyGroupMutation = typeof options.applyGroupMutation === 'function'
      ? options.applyGroupMutation
      : () => ({ didApply: false, group: null, transaction: null });
    const applyUngroupMutation = typeof options.applyUngroupMutation === 'function'
      ? options.applyUngroupMutation
      : () => ({ didApply: false, restoredElements: [], restoredGroups: [], transaction: null });
    const commitSelectionState = typeof options.commitSelectionState === 'function'
      ? options.commitSelectionState
      : null;
    const finalizeDeckMutation = typeof options.finalizeDeckMutation === 'function'
      ? options.finalizeDeckMutation
      : null;
    const prepareGroup = typeof options.prepareGroup === 'function'
      ? options.prepareGroup
      : null;

    function createCanonicalGroupBuilders() {
      const importElementToCanonicalNode = deckImportApi
        && typeof deckImportApi.importElementToCanonicalNode === 'function'
        ? deckImportApi.importElementToCanonicalNode
        : null;
      const builders = canonicalGroupApi
        && typeof canonicalGroupApi.createStudioCanonicalGroupMutationBuilders === 'function'
        ? canonicalGroupApi.createStudioCanonicalGroupMutationBuilders({
            canonicalDeckApi,
            buildCanonicalDeck,
            buildCanonicalDeckBaseline,
            getCanonicalDeckBaseline,
            importElementToCanonicalNode
          })
        : null;
      return {
        importElementToCanonicalNode,
        buildCanonicalGroupDeck: builders ? builders.buildCanonicalGroupDeck : null,
        buildCanonicalGroupBaseline: builders ? builders.buildCanonicalGroupBaseline : null
      };
    }

    function createCanonicalUngroupBuilders() {
      const importElementToCanonicalNode = deckImportApi
        && typeof deckImportApi.importElementToCanonicalNode === 'function'
        ? deckImportApi.importElementToCanonicalNode
        : null;
      const builders = canonicalGroupApi
        && typeof canonicalGroupApi.createStudioCanonicalUngroupMutationBuilders === 'function'
        ? canonicalGroupApi.createStudioCanonicalUngroupMutationBuilders({
            canonicalDeckApi,
            buildCanonicalDeck,
            buildCanonicalDeckBaseline,
            getCanonicalDeckBaseline,
            importElementToCanonicalNode
          })
        : null;
      return {
        importElementToCanonicalNode,
        buildCanonicalUngroupDeck: builders ? builders.buildCanonicalUngroupDeck : null,
        buildCanonicalUngroupBaseline: builders ? builders.buildCanonicalUngroupBaseline : null
      };
    }

    function group() {
      if (!buildGroupSelectionActionState) return false;
      const groupActionState = buildGroupSelectionActionState();
      if (!groupActionState.canGroup) {
        if (updateGroupActionState) updateGroupActionState();
        return false;
      }

      const doc = getIframeDoc();
      const { slide, parent, groupPlan } = groupActionState;
      const slideMetrics = getSlideMetrics(slide);
      const parentBounds = getRectOnSlide(parent.getBoundingClientRect(), slideMetrics);
      const getGroupElementId = (element) => assignElementId(element);
      const selectedSet = new Set(groupActionState.selection);
      const orderedSelection = getNormalizedSlideLayerOrder(slide)
        .filter((element) => selectedSet.has(element));
      const {
        importElementToCanonicalNode,
        buildCanonicalGroupDeck,
        buildCanonicalGroupBaseline
      } = createCanonicalGroupBuilders();
      let canonicalDeckBeforeGrouping = null;
      let canonicalSlideId = '';
      let canonicalParentId = '';
      let canonicalSelectedNodeIds = [];
      if (buildCanonicalGroupDeck
        && canonicalDeckApi
        && typeof canonicalDeckApi.groupCanonicalNodes === 'function'
        && importElementToCanonicalNode
        && (buildCanonicalDeckBaseline || buildCanonicalDeck)) {
        canonicalSlideId = getEditorSlideId(slide);
        canonicalParentId = parent === slide ? '' : getGroupElementId(parent);
        canonicalSelectedNodeIds = orderedSelection
          .map((element) => getGroupElementId(element))
          .filter(Boolean);
        if (parent === slide || canonicalParentId) {
          canonicalDeckBeforeGrouping = buildCanonicalGroupBaseline
            ? buildCanonicalGroupBaseline({
                canonicalDeckApi,
                buildCanonicalDeck,
                sourceDocument: doc
              })
            : null;
        } else {
          canonicalSelectedNodeIds = [];
        }
      }
      const mutation = applyGroupMutation({
        documentRef: doc,
        parent,
        groupPlan,
        parentBounds,
        orderedSelection,
        getElementId: getGroupElementId,
        assignElementId: options.assignElementId || null,
        prepareGroup
      });
      if (!mutation || !mutation.didApply) return false;
      let canonicalDeck = null;
      if (buildCanonicalGroupDeck
        && canonicalDeckBeforeGrouping
        && canonicalSlideId
        && canonicalSelectedNodeIds.length > 1) {
        canonicalDeck = buildCanonicalGroupDeck({
          canonicalDeckApi,
          canonicalDeckBeforeMutation: canonicalDeckBeforeGrouping,
          importElementToCanonicalNode,
          slideId: canonicalSlideId,
          parentNodeId: canonicalParentId,
          nodeIds: canonicalSelectedNodeIds,
          groupElement: mutation.group,
          getNodeId: (element) => assignElementId(element)
        });
      }
      if (commitSelectionState) {
        commitSelectionState({ selectedElements: [mutation.group] });
      }
      if (finalizeDeckMutation) {
        finalizeDeckMutation('Auto: Grouped Elements', {
          syncSelectionOverlay: true,
          refreshThumbnails: false,
          debounceHistory: true,
          transaction: mutation.transaction,
          ...(canonicalDeck ? { canonicalDeck } : {})
        });
      }
      return true;
    }

    function ungroup() {
      if (!buildUngroupSelectionActionState) return false;
      const ungroupActionState = buildUngroupSelectionActionState();
      if (!ungroupActionState.canUngroup) {
        if (updateGroupActionState) updateGroupActionState();
        return false;
      }

      const slideMetrics = getSlideMetrics(ungroupActionState.slide);
      const getUngroupElementId = (element) => assignElementId(element);
      const {
        importElementToCanonicalNode,
        buildCanonicalUngroupDeck,
        buildCanonicalUngroupBaseline
      } = createCanonicalUngroupBuilders();
      let canonicalDeckBeforeUngrouping = null;
      let canonicalGroupTargets = [];
      if (buildCanonicalUngroupDeck
        && canonicalDeckApi
        && typeof canonicalDeckApi.ungroupCanonicalNodes === 'function'
        && importElementToCanonicalNode
        && (buildCanonicalDeckBaseline || buildCanonicalDeck)) {
        const canonicalSlideId = getEditorSlideId(ungroupActionState.slide);
        const groupIds = new Set();
        let canBuildCanonicalSidecar = !!canonicalSlideId;
        canonicalGroupTargets = ungroupActionState.groups.map((group) => {
          const parent = group && group.parentElement;
          const groupId = getUngroupElementId(group);
          const parentNodeId = parent === ungroupActionState.slide
            ? ''
            : getUngroupElementId(parent);
          if (!groupId || (!parentNodeId && parent !== ungroupActionState.slide) || groupIds.has(groupId)) {
            canBuildCanonicalSidecar = false;
          }
          groupIds.add(groupId);
          return { group, groupId, parentNodeId };
        });
        if (canonicalGroupTargets.some((target) => target.parentNodeId && groupIds.has(target.parentNodeId))) {
          canBuildCanonicalSidecar = false;
        }
        if (canBuildCanonicalSidecar) {
          canonicalDeckBeforeUngrouping = buildCanonicalUngroupBaseline
            ? buildCanonicalUngroupBaseline({
                canonicalDeckApi,
                buildCanonicalDeck
              })
            : null;
          canonicalGroupTargets = canonicalGroupTargets.map((target) => ({
            ...target,
            slideId: canonicalSlideId
          }));
        } else {
          canonicalGroupTargets = [];
        }
      }

      const mutation = applyUngroupMutation({
        groups: ungroupActionState.groups,
        slideMetrics,
        getRectOnSlide,
        getElementId: getUngroupElementId
      });
      if (!mutation || !mutation.didApply) return false;
      let canonicalDeck = null;
      if (buildCanonicalUngroupDeck
        && canonicalDeckBeforeUngrouping
        && canonicalGroupTargets.length === ungroupActionState.groups.length
        && Array.isArray(mutation.restoredGroups)
        && mutation.restoredGroups.length === canonicalGroupTargets.length) {
        canonicalDeck = buildCanonicalUngroupDeck({
          canonicalDeckApi,
          canonicalDeckBeforeMutation: canonicalDeckBeforeUngrouping,
          importElementToCanonicalNode,
          groupTargets: canonicalGroupTargets,
          restoredGroups: mutation.restoredGroups,
          getElementId: getUngroupElementId
        });
      }
      if (commitSelectionState) {
        commitSelectionState({ selectedElements: mutation.restoredElements });
      }
      if (finalizeDeckMutation) {
        finalizeDeckMutation('Auto: Ungrouped Elements', {
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
      group,
      ungroup
    };
  }

  return {
    createStudioEditorGroupController
  };
});

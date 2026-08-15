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
    const transactionApi = options.transactionApi
      || (root && root.SlideNextStudioEditorTransaction)
      || null;
    const groupTransactionApi = options.groupTransactionApi
      || (root && root.SlideNextStudioEditorGroupTransaction)
      || null;
    const ungroupTransactionApi = options.ungroupTransactionApi
      || (root && root.SlideNextStudioEditorUngroupTransaction)
      || null;
    const groupMutationApi = options.groupMutationApi
      || (root && root.SlideNextStudioEditorGroupMutation)
      || null;
    const ungroupMutationApi = options.ungroupMutationApi
      || (root && root.SlideNextStudioEditorGroupMutation)
      || null;
    const groupEngineApi = options.groupEngineApi
      || (root && root.SlideNextStudioEditorGroup)
      || null;
    const getTransactionElementById = typeof options.getTransactionElementById === 'function'
      ? options.getTransactionElementById
      : null;
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
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const getEditorSlideId = typeof options.getEditorSlideId === 'function'
      ? options.getEditorSlideId
      : (slide) => slide && slide.id;
    const prepareGroup = typeof options.prepareGroup === 'function'
      ? options.prepareGroup
      : null;
    const applyGroup = groupTransactionApi
      && typeof groupTransactionApi.createStudioEditorGroupApplicator === 'function'
      ? groupTransactionApi.createStudioEditorGroupApplicator
      : null;
    const applyGroupMutation = applyGroup
      ? applyGroup({
          mutationApi: groupMutationApi,
          groupApi: groupEngineApi,
          transactionApi,
          assignElementId,
          prepareGroup,
          legacyApplyGroup: options.applyGroupMutation
        })
      : typeof options.applyGroupMutation === 'function'
        ? options.applyGroupMutation
        : () => ({ didApply: false, group: null, transaction: null });
    const applyUngroup = ungroupTransactionApi
      && typeof ungroupTransactionApi.createStudioEditorUngroupApplicator === 'function'
      ? ungroupTransactionApi.createStudioEditorUngroupApplicator
      : null;
    const applyUngroupMutation = applyUngroup
      ? applyUngroup({
          mutationApi: ungroupMutationApi,
          groupApi: groupEngineApi,
          transactionApi,
          legacyApplyUngroup: options.applyUngroupMutation
        })
      : typeof options.applyUngroupMutation === 'function'
        ? options.applyUngroupMutation
        : () => ({ didApply: false, restoredElements: [], restoredGroups: [], transaction: null });
    const commitSelectionState = typeof options.commitSelectionState === 'function'
      ? options.commitSelectionState
      : null;
    const finalizeDeckMutation = typeof options.finalizeDeckMutation === 'function'
      ? options.finalizeDeckMutation
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
            getPendingCanonicalDeck,
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
            getPendingCanonicalDeck,
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

    function rollbackGroupMutation(transaction, doc) {
      if (!transaction
        || !transactionApi
        || typeof transactionApi.applyStudioEditorTransaction !== 'function') {
        return false;
      }
      let rollbackResult = null;
      try {
        rollbackResult = transactionApi.applyStudioEditorTransaction(transaction, 'undo', {
          getElementById: (elementId) => {
            if (getTransactionElementById) return getTransactionElementById(elementId, doc);
            return null;
          },
          applyMarkupState(element, markup) {
            if (!element || typeof markup !== 'string') return false;
            element.innerHTML = markup;
            return true;
          },
          applyElementPresenceState(elementId, parentId, snapshot) {
            const parent = getTransactionElementById
              ? getTransactionElementById(parentId, doc)
              : null;
            if (!parent || !snapshot || typeof snapshot !== 'object') return false;
            const currentElement = getTransactionElementById
              ? getTransactionElementById(elementId, doc)
              : null;
            if (snapshot.exists !== true) {
              if (!currentElement) return false;
              if (typeof currentElement.remove === 'function') {
                currentElement.remove();
              } else if (currentElement.parentNode
                && typeof currentElement.parentNode.removeChild === 'function') {
                currentElement.parentNode.removeChild(currentElement);
              } else {
                return false;
              }
            } else {
              let element = currentElement;
              if (!element) {
                if (!doc || typeof doc.createElement !== 'function'
                  || typeof snapshot.markup !== 'string' || !snapshot.markup.trim()) {
                  return false;
                }
                const template = doc.createElement('template');
                if (!template) return false;
                template.innerHTML = snapshot.markup;
                element = template.content && template.content.firstElementChild;
                if (!element) return false;
              }
              const childNodes = parent.children || parent.childNodes || [];
              const beforeNode = childNodes[snapshot.index] || null;
              if (beforeNode && beforeNode !== element && typeof parent.insertBefore === 'function') {
                parent.insertBefore(element, beforeNode);
              } else if (typeof parent.appendChild === 'function') {
                parent.appendChild(element);
              } else {
                return false;
              }
              if (prepareGroup) prepareGroup(element);
            }
            return true;
          }
        });
      } catch (error) {
        rollbackResult = null;
      }
      return !!(rollbackResult && rollbackResult.didApply);
    }

    function finalizeGroupMutation(versionLabel, options = {}) {
      if (!finalizeDeckMutation) return false;
      try {
        return finalizeDeckMutation(versionLabel, options);
      } catch (error) {
        return false;
      }
    }

    function group() {
      if (!buildGroupSelectionActionState) return false;
      const groupActionState = buildGroupSelectionActionState();
      if (!groupActionState.canGroup) {
        if (updateGroupActionState) updateGroupActionState();
        return false;
      }
      if (!finalizeDeckMutation) return false;

      const doc = getIframeDoc();
      const { slide, parent, groupPlan } = groupActionState;
      const slideMetrics = getSlideMetrics(slide);
      const parentBounds = getRectOnSlide(parent.getBoundingClientRect(), slideMetrics);
      const canonicalSlideId = getEditorSlideId(slide) || '';
      const getGroupElementId = (element) => {
        const assignedId = assignElementId(element);
        if (assignedId) return assignedId;
        if (element === slide && canonicalSlideId) return `slide:${canonicalSlideId}`;
        return element && element.dataset && element.dataset.editorId;
      };
      const selectedSet = new Set(groupActionState.selection);
      const orderedSelection = getNormalizedSlideLayerOrder(slide)
        .filter((element) => selectedSet.has(element));
      let canonicalGroupBuilders;
      try {
        canonicalGroupBuilders = createCanonicalGroupBuilders();
      } catch (error) {
        return false;
      }
      const {
        importElementToCanonicalNode,
        buildCanonicalGroupDeck,
        buildCanonicalGroupBaseline
      } = canonicalGroupBuilders;
      let canonicalDeckBeforeGrouping = null;
      let canonicalParentId = '';
      let canonicalSelectedNodeIds = [];
      let canonicalGroupMutationRequired = false;
      if (buildCanonicalGroupDeck
        && canonicalDeckApi
        && typeof canonicalDeckApi.groupCanonicalNodes === 'function'
        && importElementToCanonicalNode
        && (buildCanonicalDeckBaseline || buildCanonicalDeck)) {
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
        canonicalGroupMutationRequired = true;
        try {
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
        } catch (error) {
          canonicalDeck = null;
        }
      }
      if (canonicalGroupMutationRequired && !canonicalDeck) {
        rollbackGroupMutation(mutation.transaction, doc);
        if (commitSelectionState) commitSelectionState({ selectedElements: [] });
        return false;
      }
      if (commitSelectionState) {
        commitSelectionState({ selectedElements: [mutation.group] });
      }
      const finalizeResult = finalizeGroupMutation('Auto: Grouped Elements', {
        syncSelectionOverlay: true,
        refreshThumbnails: false,
        debounceHistory: true,
        transaction: mutation.transaction,
        ...(canonicalDeck ? { canonicalDeck } : {})
      });
      if (finalizeResult === false) {
        rollbackGroupMutation(mutation.transaction, doc);
        if (commitSelectionState) commitSelectionState({ selectedElements: [] });
        return false;
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
      if (!finalizeDeckMutation) return false;

      const doc = getIframeDoc();
      const slideMetrics = getSlideMetrics(ungroupActionState.slide);
      const canonicalSlideId = getEditorSlideId(ungroupActionState.slide) || '';
      const getUngroupElementId = (element) => {
        const assignedId = assignElementId(element);
        if (assignedId) return assignedId;
        if (element === ungroupActionState.slide && canonicalSlideId) {
          return `slide:${canonicalSlideId}`;
        }
        return element && element.dataset && element.dataset.editorId;
      };
      let canonicalUngroupBuilders;
      try {
        canonicalUngroupBuilders = createCanonicalUngroupBuilders();
      } catch (error) {
        return false;
      }
      const {
        importElementToCanonicalNode,
        buildCanonicalUngroupDeck,
        buildCanonicalUngroupBaseline
      } = canonicalUngroupBuilders;
      let canonicalDeckBeforeUngrouping = null;
      let canonicalGroupTargets = [];
      let canonicalUngroupMutationRequired = false;
      if (buildCanonicalUngroupDeck
        && canonicalDeckApi
        && typeof canonicalDeckApi.ungroupCanonicalNodes === 'function'
        && importElementToCanonicalNode
        && (buildCanonicalDeckBaseline || buildCanonicalDeck)) {
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
                buildCanonicalDeck,
                sourceDocument: doc
              })
            : null;
          canonicalGroupTargets = canonicalGroupTargets.map((target) => ({
            ...target,
            slideId: canonicalSlideId
          }));
          canonicalUngroupMutationRequired = !!canonicalDeckBeforeUngrouping;
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
        try {
          canonicalDeck = buildCanonicalUngroupDeck({
            canonicalDeckApi,
            canonicalDeckBeforeMutation: canonicalDeckBeforeUngrouping,
            importElementToCanonicalNode,
            groupTargets: canonicalGroupTargets,
            restoredGroups: mutation.restoredGroups,
            getElementId: getUngroupElementId
          });
        } catch (error) {
          canonicalDeck = null;
        }
      }
      if (canonicalUngroupMutationRequired && !canonicalDeck) {
        rollbackGroupMutation(mutation.transaction, doc);
        if (commitSelectionState) commitSelectionState({ selectedElements: [] });
        return false;
      }
      if (commitSelectionState) {
        commitSelectionState({ selectedElements: mutation.restoredElements });
      }
      const finalizeResult = finalizeGroupMutation('Auto: Ungrouped Elements', {
        syncSelectionOverlay: true,
        refreshThumbnails: false,
        debounceHistory: true,
        transaction: mutation.transaction,
        ...(canonicalDeck ? { canonicalDeck } : {})
      });
      if (finalizeResult === false) {
        rollbackGroupMutation(mutation.transaction, doc);
        if (commitSelectionState) commitSelectionState({ selectedElements: [] });
        return false;
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

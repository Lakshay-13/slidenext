(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLayerAccessors(options = {}) {
    const controller = options.controller
      || (root && root.SlideNextStudioEditorLayerController)
      || null;
    const documentRef = options.documentRef || null;
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const getElementByEditorId = typeof options.getElementByEditorId === 'function'
      ? options.getElementByEditorId
      : () => null;
    const updateLayersListOverride = typeof options.updateLayersList === 'function'
      ? options.updateLayersList
      : null;
    const resolveLayerRowElement = typeof options.resolveLayerRowElement === 'function'
      ? options.resolveLayerRowElement
      : (row) => controller
        && typeof controller.resolveStudioLayerRowElement === 'function'
        ? controller.resolveStudioLayerRowElement({ row, getElementByEditorId })
        : null;

    function updateLayersList() {
      if (!controller || typeof controller.syncStudioLayerList !== 'function') {
        return false;
      }
      const iframeDoc = arguments.length > 0 && arguments[0] ? arguments[0] : getIframeDoc();
      return controller.syncStudioLayerList({
        documentRef,
        iframeDoc,
        getActiveSlide: options.getActiveSlide,
        getNormalizedSlideLayerOrder: options.getNormalizedSlideLayerOrder,
        buildEditorDeckSnapshot: options.buildEditorDeckSnapshot,
        getSelectedElementIds: typeof options.getSelectedElementIds === 'function'
          ? options.getSelectedElementIds
          : null,
        getElementByEditorId,
        buildLayerOrderSelectionActionState: options.buildLayerOrderSelectionActionState,
        layerActionOptions: {
          resolveLayerRowElement,
          selectElement: options.selectElement,
          updateLayersList: (...args) => refreshLayersList(...args),
          getCommittedSelectedEditorElementIds: options.getCommittedSelectedEditorElementIds,
          deselectElement: options.deselectElement,
          restoreCommittedSelectionByIdsOnActiveSlide: options.restoreCommittedSelectionByIdsOnActiveSlide,
          applyEditorSelectionState: options.applyEditorSelectionState,
          refreshSelectionClasses: options.refreshSelectionClasses,
          toggleSelectedElementsVisibility: options.toggleSelectedElementsVisibility,
          refreshLayerOrderUi: options.refreshLayerOrderUi,
          isElementLocked: options.isElementLocked,
          reorderSlideLayers: options.reorderSlideLayers,
          liveSelectionApi: options.liveSelectionApi,
          getSelectedElements: options.getSelectedElements,
          syncLayerOrderZIndexInput: options.syncLayerOrderZIndexInput,
          finalizeLayerOrderMutation: options.finalizeLayerOrderMutation,
          rollbackLayerOrderMutation: options.rollbackLayerOrderMutation
        }
      });
    }

    function resolveRow(row) {
      return resolveLayerRowElement(row);
    }

    const refreshLayersList = (...args) => updateLayersListOverride
      ? updateLayersListOverride(...args)
      : updateLayersList(...args);

    function selectLayerElementByRef(event) {
      if (!controller || typeof controller.selectStudioLayerElementByRef !== 'function') {
        return false;
      }
      return controller.selectStudioLayerElementByRef({
        event,
        resolveLayerRowElement: resolveRow,
        selectElement: options.selectElement,
        updateLayersList: refreshLayersList
      });
    }

    function toggleLayerVisibilityByRef(event) {
      if (!controller || typeof controller.toggleStudioLayerVisibilityByRef !== 'function') {
        return false;
      }
      return controller.toggleStudioLayerVisibilityByRef({
        event,
        resolveLayerRowElement: resolveRow,
        updateLayersList: refreshLayersList,
        getCommittedSelectedEditorElementIds: options.getCommittedSelectedEditorElementIds,
        deselectElement: options.deselectElement,
        restoreCommittedSelectionByIdsOnActiveSlide: options.restoreCommittedSelectionByIdsOnActiveSlide,
        applyEditorSelectionState: options.applyEditorSelectionState,
        refreshSelectionClasses: options.refreshSelectionClasses,
        toggleSelectedElementsVisibility: options.toggleSelectedElementsVisibility
      });
    }

    function changeLayerZIndexByRef(event, action) {
      if (!controller || typeof controller.changeStudioLayerZIndexByRef !== 'function') {
        return false;
      }
      const sourceDoc = getIframeDoc();
      const getSelectedElements = typeof options.getSelectedElements === 'function'
        ? options.getSelectedElements
        : () => [];
      return controller.changeStudioLayerZIndexByRef({
        event,
        action,
        resolveLayerRowElement: resolveRow,
        refreshLayerOrderUi: options.refreshLayerOrderUi,
        isElementLocked: options.isElementLocked,
        reorderSlideLayers: options.reorderSlideLayers,
        liveSelectionApi: options.liveSelectionApi,
        selectedElements: getSelectedElements(sourceDoc),
        syncLayerOrderZIndexInput: options.syncLayerOrderZIndexInput,
        finalizeLayerOrderMutation: options.finalizeLayerOrderMutation,
        rollbackLayerOrderMutation: options.rollbackLayerOrderMutation
      });
    }

    function arrangeElementLayer(action, doc) {
      if (!controller || typeof controller.arrangeStudioElementLayer !== 'function') {
        return false;
      }
      const resolvedDoc = doc || getIframeDoc();
      const getSelectedElements = typeof options.getSelectedElements === 'function'
        ? options.getSelectedElements
        : () => [];
      const getLiveSelectedElements = typeof options.getLiveSelectedElements === 'function'
        ? options.getLiveSelectedElements
        : null;
      return controller.arrangeStudioElementLayer({
        action,
        getDocument: () => resolvedDoc,
        getSelectedElements: (sourceDoc) => {
          const selectedElements = getSelectedElements(sourceDoc);
          return getLiveSelectedElements
            ? getLiveSelectedElements(selectedElements, sourceDoc)
            : selectedElements;
        },
        selectionHasLockedElements: options.selectionHasLockedElements,
        refreshLayerOrderUi: options.refreshLayerOrderUi,
        reorderSlideLayers: options.reorderSlideLayers,
        syncLayerOrderZIndexInput,
        finalizeLayerOrderMutation: options.finalizeLayerOrderMutation
      });
    }

    function refreshLayerOrderUi(refreshOptions = {}) {
      if (!controller || typeof controller.refreshStudioLayerOrderUi !== 'function') {
        return false;
      }
      return controller.refreshStudioLayerOrderUi({
        ...refreshOptions,
        updateLayersList: options.updateLayersList,
        updateLayerOrderActionState: options.updateLayerOrderActionState
      });
    }

    function syncLayerOrderZIndexInput(target) {
      const getSynchronizer = typeof options.getLayerOrderZIndexSynchronizer === 'function'
        ? options.getLayerOrderZIndexSynchronizer
        : () => options.layerOrderZIndexSynchronizer;
      const synchronizer = getSynchronizer();
      if (typeof synchronizer === 'function') {
        return synchronizer(target);
      }

      const layerOrderView = options.layerOrderApi
        || (root && root.SlideNextStudioEditorLayerOrder)
        || null;
      if (!layerOrderView || typeof layerOrderView.syncStudioLayerOrderZIndexInput !== 'function') {
        return null;
      }
      const targetId = target && target.dataset && target.dataset.editorId;
      const targetDocument = target && target.ownerDocument ? target.ownerDocument : null;
      let canonicalDeck = null;
      const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
        ? options.resolveCanonicalDeck
        : null;
      const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : null;
      if (targetId && resolveCanonicalDeck) {
        try {
          canonicalDeck = resolveCanonicalDeck(targetDocument || getIframeDoc());
        } catch (error) {
          canonicalDeck = null;
        }
      } else if (targetId && buildCanonicalDeck) {
        try {
          canonicalDeck = buildCanonicalDeck(targetDocument || getIframeDoc());
        } catch (error) {
          canonicalDeck = null;
        }
      }
      const resolveCanonicalNode = typeof options.resolveCanonicalNode === 'function'
        ? options.resolveCanonicalNode
        : null;
      const canonicalTarget = resolveCanonicalNode
        ? resolveCanonicalNode(target, canonicalDeck)
        : null;
      return layerOrderView.syncStudioLayerOrderZIndexInput({
        documentRef: options.documentRef || null,
        target,
        canonicalTarget
      });
    }

    return {
      updateLayersList,
      resolveLayerRowElement: resolveRow,
      selectLayerElementByRef,
      toggleLayerVisibilityByRef,
      changeLayerZIndexByRef,
      arrangeElementLayer,
      refreshLayerOrderUi,
      syncLayerOrderZIndexInput
    };
  }

  function createStudioEditorLayerGlobalApi(options = {}) {
    const accessors = options.accessors || createStudioEditorLayerAccessors(options);
    return {
      updateLayersList: (...args) => accessors.updateLayersList(...args),
      resolveLayerRowElement: (row) => accessors.resolveLayerRowElement(row),
      selectLayerElementByRef: (event) => accessors.selectLayerElementByRef(event),
      toggleLayerVisibilityByRef: (event) => accessors.toggleLayerVisibilityByRef(event),
      changeLayerZIndexByRef: (event, action) => accessors.changeLayerZIndexByRef(event, action),
      arrangeElementLayer: (action, doc) => typeof accessors.arrangeElementLayer === 'function'
        ? accessors.arrangeElementLayer(action, doc)
        : false,
      refreshLayerOrderUi: (options) => typeof accessors.refreshLayerOrderUi === 'function'
        ? accessors.refreshLayerOrderUi(options)
        : false,
      syncLayerOrderZIndexInput: (target) => typeof accessors.syncLayerOrderZIndexInput === 'function'
        ? accessors.syncLayerOrderZIndexInput(target)
        : null
    };
  }

  return {
    createStudioEditorLayerAccessors,
    createStudioEditorLayerGlobalApi
  };
});

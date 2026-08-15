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
        buildLayerOrderSelectionActionState: options.buildLayerOrderSelectionActionState
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

    return {
      updateLayersList,
      resolveLayerRowElement: resolveRow,
      selectLayerElementByRef,
      toggleLayerVisibilityByRef,
      changeLayerZIndexByRef
    };
  }

  function createStudioEditorLayerGlobalApi(options = {}) {
    const accessors = options.accessors || createStudioEditorLayerAccessors(options);
    return {
      updateLayersList: (...args) => accessors.updateLayersList(...args),
      resolveLayerRowElement: (row) => accessors.resolveLayerRowElement(row),
      selectLayerElementByRef: (event) => accessors.selectLayerElementByRef(event),
      toggleLayerVisibilityByRef: (event) => accessors.toggleLayerVisibilityByRef(event),
      changeLayerZIndexByRef: (event, action) => accessors.changeLayerZIndexByRef(event, action)
    };
  }

  return {
    createStudioEditorLayerAccessors,
    createStudioEditorLayerGlobalApi
  };
});

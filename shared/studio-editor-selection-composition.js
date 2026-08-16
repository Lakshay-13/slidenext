(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorSelectionCompositionController(options = {}) {
    const selectionApi = options.selectionApi && typeof options.selectionApi === 'object'
      ? options.selectionApi
      : null;
    const selectionStateAdapter = options.selectionStateAdapter
      && typeof options.selectionStateAdapter === 'object'
      ? options.selectionStateAdapter
      : null;
    const selectionCommitAdapter = options.selectionCommitAdapter
      && typeof options.selectionCommitAdapter === 'object'
      ? options.selectionCommitAdapter
      : null;
    const selectionClassAdapter = options.selectionClassAdapter
      && typeof options.selectionClassAdapter === 'object'
      ? options.selectionClassAdapter
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getSelectionOptions = typeof options.getSelectionOptions === 'function'
      ? options.getSelectionOptions
      : () => ({});
    const getRefreshSelectionOptions = typeof options.getRefreshSelectionOptions === 'function'
      ? options.getRefreshSelectionOptions
      : getSelectionOptions;
    const setSelectionState = typeof options.setSelectionState === 'function'
      ? options.setSelectionState
      : () => {};
    const clearSelectionState = typeof options.clearSelectionState === 'function'
      ? options.clearSelectionState
      : () => {};
    const syncSelectionOverlay = typeof options.syncSelectionOverlay === 'function'
      ? options.syncSelectionOverlay
      : null;
    const syncInspectorForSelection = typeof options.syncInspectorForSelection === 'function'
      ? options.syncInspectorForSelection
      : null;
    const updateLayersList = typeof options.updateLayersList === 'function'
      ? options.updateLayersList
      : null;

    function refreshClasses(doc = getDocument()) {
      if (!selectionClassAdapter
        || typeof selectionClassAdapter.refreshStudioEditorSelectionClasses !== 'function') {
        clearSelectionState();
        return false;
      }
      const nextSelectionState = selectionClassAdapter.refreshStudioEditorSelectionClasses(
        doc,
        getSelectedElements(doc),
        {
          selectionApi,
          getSelectionOptions: () => getRefreshSelectionOptions(doc)
        }
      );
      if (!nextSelectionState) {
        clearSelectionState();
        return false;
      }
      setSelectionState(nextSelectionState);
      return true;
    }

    function apply(nextState = {}) {
      if (!selectionStateAdapter
        || typeof selectionStateAdapter.applyStudioEditorSelectionState !== 'function') {
        clearSelectionState();
        return false;
      }
      return selectionStateAdapter.applyStudioEditorSelectionState(nextState, {
        selectionApi,
        getSelectionOptions,
        setSelectionState,
        clearSelectionState
      });
    }

    function commit(nextSelectionState, commitOptions = {}) {
      if (!selectionCommitAdapter
        || typeof selectionCommitAdapter.commitStudioEditorSelectionState !== 'function') {
        return false;
      }
      return selectionCommitAdapter.commitStudioEditorSelectionState(nextSelectionState, {
        selectionApi,
        getSelectionOptions,
        applySelectionState: apply,
        refreshSelectionClasses: refreshClasses,
        syncSelectionOverlay,
        syncInspectorForSelection,
        updateLayersList,
        commitOptions
      });
    }

    return {
      refreshClasses,
      apply,
      commit
    };
  }

  function createStudioEditorSelectAllElementsOnActiveSlideAdapter(options = {}) {
    const selectionApi = options.selectionApi && typeof options.selectionApi === 'object'
      ? options.selectionApi
      : null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getElements = typeof options.getElements === 'function'
      ? options.getElements
      : () => [];
    const isSelectableElement = typeof options.isSelectableElement === 'function'
      ? options.isSelectableElement
      : () => true;
    const getSelectionOptions = typeof options.getSelectionOptions === 'function'
      ? options.getSelectionOptions
      : () => ({});
    const commitSelectionState = typeof options.commitSelectionState === 'function'
      ? options.commitSelectionState
      : () => false;

    return function selectAllElementsOnActiveSlide(doc = null) {
      if (!selectionApi
        || typeof selectionApi.selectAllStudioElementsOnActiveSlide !== 'function') {
        return false;
      }
      return selectionApi.selectAllStudioElementsOnActiveSlide({
        getActiveSlide,
        getElements,
        isSelectableElement: (element, activeSlide) => isSelectableElement(
          element,
          doc,
          activeSlide
        ),
        getSelectionOptions: (selectionOptions = {}) => getSelectionOptions(
          doc,
          selectionOptions
        ),
        commitSelectionState: (nextSelectionState, selectionOptions = {}) => commitSelectionState(
          doc,
          nextSelectionState,
          selectionOptions
        ),
        doc
      });
    };
  }

  return {
    createStudioEditorSelectionCompositionController,
    createStudioEditorSelectAllElementsOnActiveSlideAdapter
  };
});

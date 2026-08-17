(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionCommandComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorSelectionCommandComposition(options = {}) {
    const selectionApi = options.selectionApi && typeof options.selectionApi === 'object'
      ? options.selectionApi
      : null;
    const selectionCompositionApi = options.selectionCompositionApi
      && typeof options.selectionCompositionApi === 'object'
      ? options.selectionCompositionApi
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const resolveEditableTarget = typeof options.resolveEditableTarget === 'function'
      ? options.resolveEditableTarget
      : (element) => element;
    const getSelectionOptions = typeof options.getSelectionOptions === 'function'
      ? options.getSelectionOptions
      : () => ({});
    const commitSelectionState = typeof options.commitSelectionState === 'function'
      ? options.commitSelectionState
      : () => false;
    const hideDragHud = typeof options.hideDragHud === 'function'
      ? options.hideDragHud
      : () => {};
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getElements = typeof options.getElements === 'function'
      ? options.getElements
      : () => [];
    const isSelectableElement = typeof options.isSelectableElement === 'function'
      ? options.isSelectableElement
      : () => true;

    function getDocumentSelectionOptions(doc, selectionOptions = {}) {
      return getSelectionOptions({
        ...selectionOptions,
        doc
      });
    }

    function commitDocumentSelectionState(doc, nextSelectionState, selectionOptions = {}) {
      return commitSelectionState(
        nextSelectionState,
        {
          ...selectionOptions,
          doc
        }
      );
    }

    const selectAllElementsAdapter = selectionCompositionApi
      && typeof selectionCompositionApi
        .createStudioEditorSelectAllElementsOnActiveSlideAdapter === 'function'
      ? selectionCompositionApi
        .createStudioEditorSelectAllElementsOnActiveSlideAdapter({
          selectionApi,
          getActiveSlide,
          getElements,
          isSelectableElement,
          getSelectionOptions: getDocumentSelectionOptions,
          commitSelectionState: commitDocumentSelectionState
        })
      : null;

    function selectElement(element, commandOptions = {}) {
      if (!selectionApi || typeof selectionApi.selectStudioElement !== 'function') {
        return false;
      }
      const doc = Object.prototype.hasOwnProperty.call(commandOptions, 'doc')
        ? commandOptions.doc
        : getDocument();
      return selectionApi.selectStudioElement({
        element,
        selectedElements: getSelectedElements(doc),
        additive: commandOptions.additive,
        toggle: commandOptions.toggle,
        resolveEditableTarget,
        getSelectionOptions: (selectionOptions = {}) => getDocumentSelectionOptions(
          doc,
          selectionOptions
        ),
        commitSelectionState: (nextSelectionState, selectionOptions = {}) => (
          commitDocumentSelectionState(doc, nextSelectionState, selectionOptions)
        )
      });
    }

    function deselectElement() {
      if (!selectionApi || typeof selectionApi.deselectStudioElement !== 'function') {
        return false;
      }
      return selectionApi.deselectStudioElement({
        hideDragHud,
        commitSelectionState
      });
    }

    function selectAllElementsOnActiveSlide(doc = getDocument()) {
      if (typeof selectAllElementsAdapter === 'function') {
        return selectAllElementsAdapter(doc);
      }
      if (!selectionApi
        || typeof selectionApi.selectAllStudioElementsOnActiveSlide !== 'function') {
        return false;
      }
      return selectionApi.selectAllStudioElementsOnActiveSlide({
        getActiveSlide,
        getElements,
        isSelectableElement: (element) => isSelectableElement(element, doc),
        getSelectionOptions: (selectionOptions = {}) => getDocumentSelectionOptions(
          doc,
          selectionOptions
        ),
        commitSelectionState: (nextSelectionState, selectionOptions = {}) => (
          commitDocumentSelectionState(doc, nextSelectionState, selectionOptions)
        ),
        doc
      });
    }

    return {
      selectElement,
      deselectElement,
      selectAllElementsOnActiveSlide
    };
  }

  return {
    createStudioEditorSelectionCommandComposition
  };
});

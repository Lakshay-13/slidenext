(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionStateController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorSelectionStateController(options = {}) {
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId
        ? element.dataset.editorId
        : element && element.id
          ? element.id
          : '';

    function normalizeElementIds(ids = []) {
      const seen = new Set();
      return (Array.isArray(ids) ? ids : []).filter((id) => {
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    }

    function getIdsForElements(elements = []) {
      return normalizeElementIds((Array.isArray(elements) ? elements : []).map((element) => {
        try {
          return getElementId(element);
        } catch (error) {
          return '';
        }
      }));
    }

    let selectedElements = Array.isArray(options.initialSelectedElements)
      ? options.initialSelectedElements
      : [];
    let selectedElement = options.initialSelectedElement || null;
    let selectedElementIds = Object.prototype.hasOwnProperty.call(options, 'initialSelectedElementIds')
      ? normalizeElementIds(options.initialSelectedElementIds)
      : getIdsForElements(selectedElements);
    let preserveSelectionOnNextActiveSlideSync = !!options.initialPreserveSelectionOnNextActiveSlideSync;

    function getState() {
      return {
        selectedElements: [...selectedElements],
        selectedElement
      };
    }

    function setState(nextState = {}) {
      selectedElements = Array.isArray(nextState.selectedElements)
        ? [...nextState.selectedElements]
        : [];
      selectedElement = Object.prototype.hasOwnProperty.call(nextState, 'selectedElement')
        ? nextState.selectedElement
        : selectedElements[0] || null;
      selectedElementIds = Object.prototype.hasOwnProperty.call(nextState, 'selectedElementIds')
        ? normalizeElementIds(nextState.selectedElementIds)
        : getIdsForElements(selectedElements);
      return getState();
    }

    function clear() {
      selectedElements = [];
      selectedElement = null;
      selectedElementIds = [];
      return getState();
    }

    return {
      getState,
      getSelectedElements: () => [...selectedElements],
      getSelectedElement: () => selectedElement,
      getSelectedElementIds: () => [...selectedElementIds],
      getPreserveSelectionOnNextActiveSlideSync: () => preserveSelectionOnNextActiveSlideSync,
      setPreserveSelectionOnNextActiveSlideSync: (nextValue) => {
        preserveSelectionOnNextActiveSlideSync = !!nextValue;
        return preserveSelectionOnNextActiveSlideSync;
      },
      setState,
      clear
    };
  }

  return { createStudioEditorSelectionStateController };
});

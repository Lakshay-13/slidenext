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
    let selectedElements = Array.isArray(options.initialSelectedElements)
      ? options.initialSelectedElements
      : [];
    let selectedElement = options.initialSelectedElement || null;
    let preserveSelectionOnNextActiveSlideSync = !!options.initialPreserveSelectionOnNextActiveSlideSync;

    function getState() {
      return {
        selectedElements,
        selectedElement
      };
    }

    function setState(nextState = {}) {
      selectedElements = Array.isArray(nextState.selectedElements)
        ? nextState.selectedElements
        : [];
      selectedElement = Object.prototype.hasOwnProperty.call(nextState, 'selectedElement')
        ? nextState.selectedElement
        : selectedElements[0] || null;
      return getState();
    }

    function clear() {
      selectedElements = [];
      selectedElement = null;
      return getState();
    }

    return {
      getState,
      getSelectedElements: () => selectedElements,
      getSelectedElement: () => selectedElement,
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

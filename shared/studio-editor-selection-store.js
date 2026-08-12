(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionStateStore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveController(options = {}) {
    if (options.stateController && typeof options.stateController === 'object') {
      return options.stateController;
    }

    const controllerApi = root && root.SlideNextStudioEditorSelectionStateController;
    if (!controllerApi
      || typeof controllerApi.createStudioEditorSelectionStateController !== 'function') {
      return null;
    }

    return controllerApi.createStudioEditorSelectionStateController({
      getElementId: options.getElementId
    });
  }

  function createStudioEditorSelectionStateStore(options = {}) {
    const controller = resolveController(options);

    function getState() {
      return controller && typeof controller.getState === 'function'
        ? controller.getState()
        : { selectedElements: [], selectedElement: null };
    }

    function getSelectedElements() {
      return controller && typeof controller.getSelectedElements === 'function'
        ? controller.getSelectedElements()
        : [];
    }

    function getSelectedElement() {
      return controller && typeof controller.getSelectedElement === 'function'
        ? controller.getSelectedElement()
        : null;
    }

    function getSelectedElementIds() {
      return controller && typeof controller.getSelectedElementIds === 'function'
        ? controller.getSelectedElementIds()
        : [];
    }

    function getPreserveSelectionOnNextActiveSlideSync() {
      return controller && typeof controller.getPreserveSelectionOnNextActiveSlideSync === 'function'
        ? controller.getPreserveSelectionOnNextActiveSlideSync()
        : false;
    }

    function setPreserveSelectionOnNextActiveSlideSync(nextValue) {
      return controller && typeof controller.setPreserveSelectionOnNextActiveSlideSync === 'function'
        ? controller.setPreserveSelectionOnNextActiveSlideSync(nextValue)
        : false;
    }

    function setState(nextState = {}) {
      return controller && typeof controller.setState === 'function'
        ? controller.setState(nextState)
        : false;
    }

    function clear() {
      return controller && typeof controller.clear === 'function'
        ? controller.clear()
        : false;
    }

    return {
      getState,
      getSelectedElements,
      getSelectedElement,
      getSelectedElementIds,
      getPreserveSelectionOnNextActiveSlideSync,
      setPreserveSelectionOnNextActiveSlideSync,
      setState,
      clear
    };
  }

  return { createStudioEditorSelectionStateStore };
});

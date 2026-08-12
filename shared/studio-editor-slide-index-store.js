(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideIndexStore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveController(options = {}) {
    if (options.stateController && typeof options.stateController === 'object') {
      return options.stateController;
    }

    const controllerApi = root && root.SlideNextStudioEditorSlideIndexController;
    if (!controllerApi
      || typeof controllerApi.createStudioEditorSlideIndexController !== 'function') {
      return null;
    }

    return controllerApi.createStudioEditorSlideIndexController({
      initialSlideIndex: Number.isInteger(options.initialSlideIndex)
        ? options.initialSlideIndex
        : 0,
      initialSlideId: options.initialSlideId
    });
  }

  function createStudioEditorSlideIndexStore(options = {}) {
    const controller = resolveController(options);

    function getSlideIndex() {
      return controller && typeof controller.getSlideIndex === 'function'
        ? controller.getSlideIndex()
        : 0;
    }

    function setSlideIndex(nextValue) {
      return controller && typeof controller.setSlideIndex === 'function'
        ? controller.setSlideIndex(nextValue)
        : false;
    }

    function getSlideId() {
      return controller && typeof controller.getSlideId === 'function'
        ? controller.getSlideId()
        : '';
    }

    function setSlideId(nextValue) {
      return controller && typeof controller.setSlideId === 'function'
        ? controller.setSlideId(nextValue)
        : false;
    }

    return { getSlideIndex, setSlideIndex, getSlideId, setSlideId };
  }

  return { createStudioEditorSlideIndexStore };
});

(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPresentationLabelStateStore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveController(options = {}) {
    if (options.stateController && typeof options.stateController === 'object') {
      return options.stateController;
    }

    const controllerApi = root && root.SlideNextStudioEditorPresentationLabelStateController;
    if (!controllerApi
      || typeof controllerApi.createStudioEditorPresentationLabelStateController !== 'function') {
      return null;
    }

    return controllerApi.createStudioEditorPresentationLabelStateController({
      initialTitle: options.initialTitle,
      initialCategory: options.initialCategory
    });
  }

  function createStudioEditorPresentationLabelStateStore(options = {}) {
    const controller = resolveController(options);

    function getTitle() {
      return controller && typeof controller.getTitle === 'function'
        ? controller.getTitle()
        : '';
    }

    function setTitle(nextTitle) {
      return controller && typeof controller.setTitle === 'function'
        ? controller.setTitle(nextTitle)
        : false;
    }

    function getCategory() {
      return controller && typeof controller.getCategory === 'function'
        ? controller.getCategory()
        : '';
    }

    function setCategory(nextCategory) {
      return controller && typeof controller.setCategory === 'function'
        ? controller.setCategory(nextCategory)
        : false;
    }

    return { getTitle, setTitle, getCategory, setCategory };
  }

  return { createStudioEditorPresentationLabelStateStore };
});

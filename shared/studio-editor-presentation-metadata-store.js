(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPresentationMetadataStateStore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveController(options = {}) {
    if (options.stateController && typeof options.stateController === 'object') {
      return options.stateController;
    }

    const controllerApi = root && root.SlideNextStudioEditorPresentationMetadataStateController;
    if (!controllerApi
      || typeof controllerApi.createStudioEditorPresentationMetadataStateController !== 'function') {
      return null;
    }

    return controllerApi.createStudioEditorPresentationMetadataStateController({
      presentationMetadata: options.presentationMetadata
    });
  }

  function createStudioEditorPresentationMetadataStateStore(options = {}) {
    const controller = resolveController(options);

    function getPresentationMetadata() {
      return controller && typeof controller.getPresentationMetadata === 'function'
        ? controller.getPresentationMetadata()
        : null;
    }

    function setPresentationMetadata(nextMetadata) {
      return controller && typeof controller.setPresentationMetadata === 'function'
        ? controller.setPresentationMetadata(nextMetadata)
        : null;
    }

    return { getPresentationMetadata, setPresentationMetadata };
  }

  return { createStudioEditorPresentationMetadataStateStore };
});

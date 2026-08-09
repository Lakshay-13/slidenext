(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGridSnapRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorGridSnapRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorGridSnapController)
      || null;
    const gridSnapController = controllerApi
      && typeof controllerApi.createStudioEditorGridSnapController === 'function'
      ? controllerApi.createStudioEditorGridSnapController({
          gridSnapView: options.gridSnapView
            || (root && root.SlideNextStudioEditorGridSnapView)
            || null,
          documentRef: options.documentRef,
          gridSizePx: options.gridSizePx,
          initiallyEnabled: options.initiallyEnabled
        })
      : null;

    return {
      gridSnapController
    };
  }

  return {
    createStudioEditorGridSnapRuntime
  };
});

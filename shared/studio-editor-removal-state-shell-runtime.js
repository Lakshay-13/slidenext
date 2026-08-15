(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorRemovalStateShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorRemovalStateShellRuntime(options = {}) {
    const removalStateApi = resolveApi(
      options,
      'removalStateApi',
      'SlideNextStudioEditorRemovalState'
    );
    const controller = removalStateApi
      && typeof removalStateApi.createStudioEditorRemovalStateController === 'function'
      ? removalStateApi.createStudioEditorRemovalStateController({
          removalView: options.removalView,
          getDocument: options.getDocument,
          getSelectedElements: options.getSelectedElements,
          getActiveSlide: options.getActiveSlide,
          getLockedState: options.getLockedState,
          documentRef: options.documentRef
        })
      : null;

    return {
      isAvailable: !!controller,
      removalStateController: controller
    };
  }

  return {
    createStudioEditorRemovalStateShellRuntime
  };
});

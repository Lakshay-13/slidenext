(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorUngroupStateShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorUngroupStateShellRuntime(options = {}) {
    const ungroupStateApi = resolveApi(
      options,
      'ungroupStateApi',
      'SlideNextStudioEditorUngroupState'
    );
    const controller = ungroupStateApi
      && typeof ungroupStateApi.createStudioEditorUngroupStateController === 'function'
      ? ungroupStateApi.createStudioEditorUngroupStateController({
          groupApi: options.groupApi,
          getDocument: options.getDocument,
          getSelectedElements: options.getSelectedElements,
          getActiveSlide: options.getActiveSlide,
          getLiveSelectedElements: options.getLiveSelectedElements,
          isEditorGroupElement: options.isEditorGroupElement,
          getActionState: options.getActionState
        })
      : null;

    return {
      isAvailable: !!controller,
      ungroupStateController: controller
    };
  }

  return {
    createStudioEditorUngroupStateShellRuntime
  };
});

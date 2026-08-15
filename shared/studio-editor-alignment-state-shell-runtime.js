(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAlignmentStateShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorAlignmentStateShellRuntime(options = {}) {
    const alignmentStateApi = resolveApi(
      options,
      'alignmentStateApi',
      'SlideNextStudioEditorAlignmentState'
    );
    const controller = alignmentStateApi
      && typeof alignmentStateApi.createStudioEditorAlignmentStateController === 'function'
      ? alignmentStateApi.createStudioEditorAlignmentStateController({
          alignmentApi: options.alignmentApi,
          getDocument: options.getDocument,
          buildMotionActionState: options.buildMotionActionState,
          getLockedState: options.getLockedState,
          getActionState: options.getActionState,
          documentRef: options.documentRef
        })
      : null;

    return {
      isAvailable: !!controller,
      alignmentStateController: controller
    };
  }

  return {
    createStudioEditorAlignmentStateShellRuntime
  };
});

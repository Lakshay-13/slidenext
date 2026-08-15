(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorElementSnapshotShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorElementSnapshotShellRuntime(options = {}) {
    const snapshotControllerApi = resolveApi(
      options,
      'snapshotControllerApi',
      'SlideNextStudioEditorElementSnapshotController'
    );
    const controller = snapshotControllerApi
      && typeof snapshotControllerApi.createStudioEditorElementSnapshotController === 'function'
      ? snapshotControllerApi.createStudioEditorElementSnapshotController({
          snapshotApi: resolveApi(
            options,
            'snapshotApi',
            'SlideNextStudioElementSnapshot'
          ),
          getElementId: options.getElementId,
          isElementLocked: options.isElementLocked,
          isElementHidden: options.isElementHidden,
          isSelectedElement: options.isSelectedElement
        })
      : null;

    return {
      isAvailable: !!controller,
      elementSnapshotController: controller
    };
  }

  return {
    createStudioEditorElementSnapshotShellRuntime
  };
});

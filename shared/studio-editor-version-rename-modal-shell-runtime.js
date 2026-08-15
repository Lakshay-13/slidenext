(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVersionRenameModalShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorVersionRenameModalShellRuntime(options = {}) {
    const modalControllerApi = resolveApi(
      options,
      'modalControllerApi',
      'SlideNextStudioEditorVersionRenameModalController'
    );
    const controller = modalControllerApi
      && typeof modalControllerApi.createStudioEditorVersionRenameModalController === 'function'
      ? modalControllerApi.createStudioEditorVersionRenameModalController({
          documentRef: options.documentRef,
          setRenameState: options.setRenameState,
          clearRenameState: options.clearRenameState,
          createVersionActionContext: options.createVersionActionContext,
          resetRenameButton: options.resetRenameButton,
          showModal: options.showModal,
          hideModal: options.hideModal
        })
      : null;

    return {
      isAvailable: !!controller,
      versionRenameModalController: controller
    };
  }

  return {
    createStudioEditorVersionRenameModalShellRuntime
  };
});

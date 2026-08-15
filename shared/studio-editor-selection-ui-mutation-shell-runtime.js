(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionUiMutationShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorSelectionUiMutationShellRuntime(options = {}) {
    const selectionApi = resolveApi(
      options,
      'selectionApi',
      'SlideNextStudioEditorSelection'
    );
    const synchronizer = selectionApi
      && typeof selectionApi.syncStudioSelectionUiAfterMutation === 'function'
      ? (selectedElements, syncOptions) => selectionApi.syncStudioSelectionUiAfterMutation(
          selectedElements,
          syncOptions
        )
      : null;

    return {
      isAvailable: typeof synchronizer === 'function',
      sync: (selectedElements, syncOptions) => typeof synchronizer === 'function'
        ? synchronizer(selectedElements, syncOptions)
        : false
    };
  }

  return {
    createStudioEditorSelectionUiMutationShellRuntime
  };
});

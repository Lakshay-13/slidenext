(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardSelectionShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorClipboardSelectionShellRuntime(options = {}) {
    const selectionRuntimeApi = resolveApi(
      options,
      'selectionRuntimeApi',
      'SlideNextStudioEditorClipboardSelectionRuntime'
    );
    if (!selectionRuntimeApi
      || typeof selectionRuntimeApi.createStudioEditorClipboardSelectionRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.selectionRuntimeApi;
    runtimeOptions.controllerApi = resolveApi(
      options,
      'controllerApi',
      'SlideNextStudioEditorClipboardSelectionController'
    );
    runtimeOptions.clipboardApi = resolveApi(
      options,
      'clipboardApi',
      'SlideNextStudioEditorClipboard'
    );

    return selectionRuntimeApi.createStudioEditorClipboardSelectionRuntime(runtimeOptions);
  }

  return {
    createStudioEditorClipboardSelectionShellRuntime
  };
});

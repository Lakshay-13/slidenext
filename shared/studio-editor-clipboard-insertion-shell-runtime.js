(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardInsertionShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorClipboardInsertionShellRuntime(options = {}) {
    const insertionRuntimeApi = resolveApi(
      options,
      'insertionRuntimeApi',
      'SlideNextStudioEditorClipboardInsertionRuntime'
    );
    if (!insertionRuntimeApi
      || typeof insertionRuntimeApi.createStudioEditorClipboardInsertionRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.insertionRuntimeApi;
    runtimeOptions.controllerApi = resolveApi(
      options,
      'controllerApi',
      'SlideNextStudioEditorClipboardInsertionController'
    );
    runtimeOptions.clipboardApi = resolveApi(
      options,
      'clipboardApi',
      'SlideNextStudioEditorClipboard'
    );
    runtimeOptions.mutationApi = resolveApi(
      options,
      'mutationApi',
      'SlideNextStudioEditorClipboardMutation'
    );
    runtimeOptions.transactionApi = resolveApi(
      options,
      'transactionApi',
      'SlideNextStudioEditorTransaction'
    );

    return insertionRuntimeApi.createStudioEditorClipboardInsertionRuntime(runtimeOptions);
  }

  return {
    createStudioEditorClipboardInsertionShellRuntime
  };
});

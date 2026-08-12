(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorClipboardShellRuntime(options = {}) {
    const clipboardRuntimeApi = resolveApi(
      options,
      'clipboardRuntimeApi',
      'SlideNextStudioEditorClipboardRuntime'
    );
    if (!clipboardRuntimeApi
      || typeof clipboardRuntimeApi.createStudioEditorClipboardRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.clipboardRuntimeApi;
    runtimeOptions.controllerApi = resolveApi(
      options,
      'controllerApi',
      'SlideNextStudioEditorClipboardController'
    );
    runtimeOptions.clipboardApi = resolveApi(
      options,
      'clipboardApi',
      'SlideNextStudioEditorClipboard'
    );
    runtimeOptions.canonicalDeckApi = resolveApi(
      options,
      'canonicalDeckApi',
      'SlideNextCanonicalDeck'
    );
    runtimeOptions.canonicalInsertionApi = resolveApi(
      options,
      'canonicalInsertionApi',
      'SlideNextStudioEditorCanonicalInsertion'
    );
    runtimeOptions.deckImportApi = resolveApi(
      options,
      'deckImportApi',
      'SlideNextDeckImport'
    );

    return clipboardRuntimeApi.createStudioEditorClipboardRuntime(runtimeOptions);
  }

  return {
    createStudioEditorClipboardShellRuntime
  };
});

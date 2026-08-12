(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorElementInsertionShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorElementInsertionShellRuntime(options = {}) {
    const insertionRuntimeApi = resolveApi(
      options,
      'insertionRuntimeApi',
      'SlideNextStudioEditorElementInsertionRuntime'
    );
    if (!insertionRuntimeApi
      || typeof insertionRuntimeApi.createStudioEditorElementInsertionRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.insertionRuntimeApi;
    runtimeOptions.controllerApi = resolveApi(
      options,
      'controllerApi',
      'SlideNextStudioEditorElementInsertionController'
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

    return insertionRuntimeApi.createStudioEditorElementInsertionRuntime(runtimeOptions);
  }

  return {
    createStudioEditorElementInsertionShellRuntime
  };
});

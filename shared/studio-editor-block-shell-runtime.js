(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorBlockShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorBlockShellRuntime(options = {}) {
    const blockRuntimeApi = resolveApi(
      options,
      'blockRuntimeApi',
      'SlideNextStudioEditorBlockRuntime'
    );
    if (!blockRuntimeApi
      || typeof blockRuntimeApi.createStudioEditorBlockRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.blockRuntimeApi;
    runtimeOptions.controllerApi = resolveApi(
      options,
      'controllerApi',
      'SlideNextStudioEditorBlockController'
    );
    runtimeOptions.canonicalDeckApi = resolveApi(
      options,
      'canonicalDeckApi',
      'SlideNextCanonicalDeck'
    );
    runtimeOptions.canonicalStateApi = resolveApi(
      options,
      'canonicalStateApi',
      'SlideNextStudioEditorCanonicalState'
    );
    runtimeOptions.renderApi = resolveApi(
      options,
      'renderApi',
      'SlideNextDeckRender'
    );
    runtimeOptions.transactionApi = resolveApi(
      options,
      'transactionApi',
      'SlideNextStudioEditorTransaction'
    );

    return blockRuntimeApi.createStudioEditorBlockRuntime(runtimeOptions);
  }

  return {
    createStudioEditorBlockShellRuntime
  };
});

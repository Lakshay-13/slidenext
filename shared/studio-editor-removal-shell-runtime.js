(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorRemovalShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorRemovalShellRuntime(options = {}) {
    const removalRuntimeApi = resolveApi(
      options,
      'removalRuntimeApi',
      'SlideNextStudioEditorRemovalRuntime'
    );
    if (!removalRuntimeApi
      || typeof removalRuntimeApi.createStudioEditorRemovalRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.removalRuntimeApi;
    runtimeOptions.controllerApi = resolveApi(
      options,
      'controllerApi',
      'SlideNextStudioEditorRemovalController'
    );
    runtimeOptions.canonicalDeckApi = resolveApi(
      options,
      'canonicalDeckApi',
      'SlideNextCanonicalDeck'
    );
    runtimeOptions.canonicalRemovalApi = resolveApi(
      options,
      'canonicalRemovalApi',
      'SlideNextStudioEditorCanonicalRemoval'
    );

    return removalRuntimeApi.createStudioEditorRemovalRuntime(runtimeOptions);
  }

  return {
    createStudioEditorRemovalShellRuntime
  };
});

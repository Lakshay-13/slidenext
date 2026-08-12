(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLockVisibilityShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorLockVisibilityShellRuntime(options = {}) {
    const lockVisibilityRuntimeApi = resolveApi(
      options,
      'lockVisibilityRuntimeApi',
      'SlideNextStudioEditorLockVisibilityRuntime'
    );
    if (!lockVisibilityRuntimeApi
      || typeof lockVisibilityRuntimeApi.createStudioEditorLockVisibilityRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.lockVisibilityRuntimeApi;
    runtimeOptions.controllerApi = resolveApi(
      options,
      'controllerApi',
      'SlideNextStudioEditorLockVisibilityController'
    );
    runtimeOptions.lockStateApi = resolveApi(
      options,
      'lockStateApi',
      'SlideNextStudioEditorLockState'
    );
    runtimeOptions.visibilityStateApi = resolveApi(
      options,
      'visibilityStateApi',
      'SlideNextStudioEditorVisibilityState'
    );
    runtimeOptions.canonicalDeckApi = resolveApi(
      options,
      'canonicalDeckApi',
      'SlideNextCanonicalDeck'
    );
    runtimeOptions.canonicalVisibilityApi = resolveApi(
      options,
      'canonicalVisibilityApi',
      'SlideNextStudioEditorCanonicalVisibility'
    );
    runtimeOptions.canonicalStateApi = resolveApi(
      options,
      'canonicalStateApi',
      'SlideNextStudioEditorCanonicalState'
    );

    return lockVisibilityRuntimeApi.createStudioEditorLockVisibilityRuntime(runtimeOptions);
  }

  return {
    createStudioEditorLockVisibilityShellRuntime
  };
});

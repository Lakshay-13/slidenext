(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorMasterSlideShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorMasterSlideShellRuntime(options = {}) {
    const masterSlideRuntimeApi = resolveApi(
      options,
      'masterSlideRuntimeApi',
      'SlideNextStudioEditorMasterSlideRuntime'
    );
    if (!masterSlideRuntimeApi
      || typeof masterSlideRuntimeApi.createStudioEditorMasterSlideRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.masterSlideRuntimeApi;
    runtimeOptions.controllerApi = resolveApi(
      options,
      'controllerApi',
      'SlideNextStudioEditorMasterSlideController'
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

    return masterSlideRuntimeApi.createStudioEditorMasterSlideRuntime(runtimeOptions);
  }

  return {
    createStudioEditorMasterSlideShellRuntime
  };
});

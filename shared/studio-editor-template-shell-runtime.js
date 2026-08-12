(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTemplateShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorTemplateShellRuntime(options = {}) {
    const templateRuntimeApi = resolveApi(
      options,
      'templateRuntimeApi',
      'SlideNextStudioEditorTemplateRuntime'
    );
    if (!templateRuntimeApi
      || typeof templateRuntimeApi.createStudioEditorTemplateRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.templateRuntimeApi;
    runtimeOptions.controllerApi = resolveApi(
      options,
      'controllerApi',
      'SlideNextStudioEditorTemplateController'
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

    return templateRuntimeApi.createStudioEditorTemplateRuntime(runtimeOptions);
  }

  return {
    createStudioEditorTemplateShellRuntime
  };
});

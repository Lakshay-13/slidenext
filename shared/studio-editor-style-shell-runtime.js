(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorStyleShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorStyleShellRuntime(options = {}) {
    const styleRuntimeApi = resolveApi(
      options,
      'styleRuntimeApi',
      'SlideNextStudioEditorStyleRuntime'
    );
    if (!styleRuntimeApi
      || typeof styleRuntimeApi.createStudioEditorStyleRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.styleRuntimeApi;
    runtimeOptions.controllerApi = resolveApi(
      options,
      'controllerApi',
      'SlideNextStudioEditorStyleController'
    );
    runtimeOptions.styleApi = resolveApi(
      options,
      'styleApi',
      'SlideNextStudioEditorStyle'
    );
    runtimeOptions.canonicalStyleApi = resolveApi(
      options,
      'canonicalStyleApi',
      'SlideNextStudioEditorCanonicalStyle'
    );
    runtimeOptions.canonicalDeckApi = resolveApi(
      options,
      'canonicalDeckApi',
      'SlideNextCanonicalDeck'
    );
    runtimeOptions.transactionApi = resolveApi(
      options,
      'transactionApi',
      'SlideNextStudioEditorTransaction'
    );
    runtimeOptions.domApi = resolveApi(
      options,
      'domApi',
      'SlideNextStudioEditorDom'
    );
    runtimeOptions.chartApi = resolveApi(
      options,
      'chartApi',
      'SlideNextStudioEditorChartMutation'
    );

    return styleRuntimeApi.createStudioEditorStyleRuntime(runtimeOptions);
  }

  return {
    createStudioEditorStyleShellRuntime
  };
});

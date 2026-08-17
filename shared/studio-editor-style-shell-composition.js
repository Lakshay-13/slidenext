(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorStyleShellComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function resolveApi(options, optionName, globalName, fallbackOptions = null) {
    if (hasOwn(options, optionName)) {
      return options[optionName];
    }
    if (fallbackOptions && hasOwn(fallbackOptions, optionName)) {
      return fallbackOptions[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorStyleShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorStyleAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorStyleAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null,
        controller: null
      };
    }

    const runtimeOptions = { ...(options.runtimeOptions || {}) };
    const dependencies = [
      ['controllerApi', 'SlideNextStudioEditorStyleController'],
      ['styleApi', 'SlideNextStudioEditorStyle'],
      ['canonicalStyleApi', 'SlideNextStudioEditorCanonicalStyle'],
      ['canonicalDeckApi', 'SlideNextCanonicalDeck'],
      ['transactionApi', 'SlideNextStudioEditorTransaction'],
      ['styleTransactionApi', 'SlideNextStudioEditorStyleTransaction'],
      ['styleMutationApi', 'SlideNextStudioEditorStyleMutation'],
      ['domApi', 'SlideNextStudioEditorDom'],
      ['chartApi', 'SlideNextStudioEditorChartMutation']
    ];
    for (const [optionName, globalName] of dependencies) {
      runtimeOptions[optionName] = resolveApi(
        options,
        optionName,
        globalName,
        runtimeOptions
      );
    }

    const accessors = accessorsApi.createStudioEditorStyleAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorStyleShellRuntime'
      ),
      styleRuntimeApi: resolveApi(
        options,
        'styleRuntimeApi',
        'SlideNextStudioEditorStyleRuntime'
      ),
      runtimeOptions
    });
    const runtime = accessors && accessors.runtime ? accessors.runtime : null;

    return {
      accessors,
      runtime,
      controller: runtime && runtime.styleController
        ? runtime.styleController
        : null
    };
  }

  return {
    createStudioEditorStyleShellComposition
  };
});

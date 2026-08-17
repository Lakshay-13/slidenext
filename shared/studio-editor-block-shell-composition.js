(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorBlockShellComposition = api;
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

  function createStudioEditorBlockShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorBlockRuntimeAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorBlockRuntimeAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null,
        controller: null
      };
    }

    const runtimeOptions = { ...(options.runtimeOptions || {}) };
    const dependencies = [
      ['controllerApi', 'SlideNextStudioEditorBlockController'],
      ['canonicalDeckApi', 'SlideNextCanonicalDeck'],
      ['canonicalStateApi', 'SlideNextStudioEditorCanonicalState'],
      ['renderApi', 'SlideNextDeckRender'],
      ['transactionApi', 'SlideNextStudioEditorTransaction']
    ];
    for (const [optionName, globalName] of dependencies) {
      runtimeOptions[optionName] = resolveApi(
        options,
        optionName,
        globalName,
        runtimeOptions
      );
    }

    const accessors = accessorsApi.createStudioEditorBlockRuntimeAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorBlockShellRuntime'
      ),
      blockRuntimeApi: resolveApi(
        options,
        'blockRuntimeApi',
        'SlideNextStudioEditorBlockRuntime'
      ),
      runtimeOptions
    });
    const runtime = accessors && accessors.runtime ? accessors.runtime : null;

    return {
      accessors,
      runtime,
      controller: runtime && runtime.blockController
        ? runtime.blockController
        : null
    };
  }

  return {
    createStudioEditorBlockShellComposition
  };
});

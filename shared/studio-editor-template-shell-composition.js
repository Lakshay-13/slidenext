(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTemplateShellComposition = api;
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

  function createStudioEditorTemplateShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorTemplateRuntimeAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorTemplateRuntimeAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null,
        controller: null
      };
    }

    const runtimeOptions = { ...(options.runtimeOptions || {}) };
    const dependencies = [
      ['controllerApi', 'SlideNextStudioEditorTemplateController'],
      ['canonicalDeckApi', 'SlideNextCanonicalDeck'],
      ['canonicalStateApi', 'SlideNextStudioEditorCanonicalState'],
      ['renderApi', 'SlideNextDeckRender'],
      ['insertionMutationApi', 'SlideNextStudioEditorSlideInsertionMutation'],
      ['insertionTransactionApi', 'SlideNextStudioEditorSlideInsertionTransaction'],
      ['slideCommandsApi', 'SlideNextStudioEditorSlideCommands'],
      ['deckViewApi', 'SlideNextStudioDeckView'],
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

    const accessors = accessorsApi.createStudioEditorTemplateRuntimeAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorTemplateShellRuntime'
      ),
      templateRuntimeApi: resolveApi(
        options,
        'templateRuntimeApi',
        'SlideNextStudioEditorTemplateRuntime'
      ),
      runtimeOptions
    });
    const runtime = accessors && accessors.runtime ? accessors.runtime : null;

    return {
      accessors,
      runtime,
      controller: runtime && runtime.templateController
        ? runtime.templateController
        : null
    };
  }

  return {
    createStudioEditorTemplateShellComposition
  };
});

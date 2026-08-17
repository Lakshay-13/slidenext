(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorRemovalShellComposition = api;
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

  function createStudioEditorRemovalShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorRemovalAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorRemovalAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null,
        controller: null
      };
    }

    const runtimeOptions = { ...(options.runtimeOptions || {}) };
    const dependencies = [
      ['controllerApi', 'SlideNextStudioEditorRemovalController'],
      ['canonicalDeckApi', 'SlideNextCanonicalDeck'],
      ['canonicalRemovalApi', 'SlideNextStudioEditorCanonicalRemoval'],
      ['removalTransactionApi', 'SlideNextStudioEditorRemovalTransaction'],
      ['removalMutationApi', 'SlideNextStudioEditorRemovalMutation'],
      ['removalApi', 'SlideNextStudioEditorRemoval'],
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

    const accessors = accessorsApi.createStudioEditorRemovalAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorRemovalShellRuntime'
      ),
      removalRuntimeApi: resolveApi(
        options,
        'removalRuntimeApi',
        'SlideNextStudioEditorRemovalRuntime'
      ),
      runtimeOptions
    });
    const runtime = accessors && accessors.runtime ? accessors.runtime : null;

    return {
      accessors,
      runtime,
      controller: runtime && runtime.removalController
        ? runtime.removalController
        : null
    };
  }

  return {
    createStudioEditorRemovalShellComposition
  };
});

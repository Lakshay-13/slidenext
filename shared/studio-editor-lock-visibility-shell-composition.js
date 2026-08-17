(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLockVisibilityShellComposition = api;
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

  function createStudioEditorLockVisibilityShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorLockVisibilityAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorLockVisibilityAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null,
        controller: null
      };
    }

    const runtimeOptions = { ...(options.runtimeOptions || {}) };
    const dependencies = [
      ['controllerApi', 'SlideNextStudioEditorLockVisibilityController'],
      ['lockStateApi', 'SlideNextStudioEditorLockState'],
      ['visibilityStateApi', 'SlideNextStudioEditorVisibilityState'],
      ['canonicalDeckApi', 'SlideNextCanonicalDeck'],
      ['canonicalVisibilityApi', 'SlideNextStudioEditorCanonicalVisibility'],
      ['canonicalStateApi', 'SlideNextStudioEditorCanonicalState'],
      ['lockTransactionApi', 'SlideNextStudioEditorLockTransaction'],
      ['lockMutationApi', 'SlideNextStudioEditorLockMutation'],
      ['visibilityTransactionApi', 'SlideNextStudioEditorVisibilityTransaction'],
      ['visibilityMutationApi', 'SlideNextStudioEditorVisibilityMutation'],
      ['elementStateApi', 'SlideNextStudioElementState'],
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

    const accessors = accessorsApi.createStudioEditorLockVisibilityAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorLockVisibilityShellRuntime'
      ),
      lockVisibilityRuntimeApi: resolveApi(
        options,
        'lockVisibilityRuntimeApi',
        'SlideNextStudioEditorLockVisibilityRuntime'
      ),
      runtimeOptions
    });
    const runtime = accessors && accessors.runtime ? accessors.runtime : null;

    return {
      accessors,
      runtime,
      controller: runtime && runtime.lockVisibilityController
        ? runtime.lockVisibilityController
        : null
    };
  }

  return {
    createStudioEditorLockVisibilityShellComposition
  };
});

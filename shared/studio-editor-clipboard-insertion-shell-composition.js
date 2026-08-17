(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardInsertionShellComposition = api;
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

  function createStudioEditorClipboardInsertionShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorClipboardInsertionRuntimeAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorClipboardInsertionRuntimeAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null,
        controller: null
      };
    }

    const runtimeOptions = { ...(options.runtimeOptions || {}) };
    const dependencies = [
      ['controllerApi', 'SlideNextStudioEditorClipboardInsertionController'],
      ['clipboardApi', 'SlideNextStudioEditorClipboard'],
      ['mutationApi', 'SlideNextStudioEditorClipboardMutation'],
      ['transactionApi', 'SlideNextStudioEditorTransaction'],
      ['clipboardTransactionApi', 'SlideNextStudioEditorClipboardTransaction']
    ];
    for (const [optionName, globalName] of dependencies) {
      runtimeOptions[optionName] = resolveApi(
        options,
        optionName,
        globalName,
        runtimeOptions
      );
    }

    const accessors = accessorsApi.createStudioEditorClipboardInsertionRuntimeAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorClipboardInsertionShellRuntime'
      ),
      insertionRuntimeApi: resolveApi(
        options,
        'insertionRuntimeApi',
        'SlideNextStudioEditorClipboardInsertionRuntime'
      ),
      runtimeOptions
    });
    const runtime = accessors && accessors.runtime ? accessors.runtime : null;

    return {
      accessors,
      runtime,
      controller: runtime && runtime.insertionController
        ? runtime.insertionController
        : null
    };
  }

  return {
    createStudioEditorClipboardInsertionShellComposition
  };
});

(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardShellComposition = api;
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

  function createStudioEditorClipboardShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorClipboardRuntimeAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorClipboardRuntimeAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null,
        controller: null
      };
    }

    const runtimeOptions = { ...(options.runtimeOptions || {}) };
    const dependencies = [
      ['controllerApi', 'SlideNextStudioEditorClipboardController'],
      ['clipboardApi', 'SlideNextStudioEditorClipboard'],
      ['canonicalDeckApi', 'SlideNextCanonicalDeck'],
      ['canonicalInsertionApi', 'SlideNextStudioEditorCanonicalInsertion'],
      ['deckImportApi', 'SlideNextDeckImport']
    ];
    for (const [optionName, globalName] of dependencies) {
      runtimeOptions[optionName] = resolveApi(
        options,
        optionName,
        globalName,
        runtimeOptions
      );
    }

    const accessors = accessorsApi.createStudioEditorClipboardRuntimeAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorClipboardShellRuntime'
      ),
      clipboardRuntimeApi: resolveApi(
        options,
        'clipboardRuntimeApi',
        'SlideNextStudioEditorClipboardRuntime'
      ),
      runtimeOptions
    });
    const runtime = accessors && accessors.runtime ? accessors.runtime : null;

    return {
      accessors,
      runtime,
      controller: runtime && runtime.clipboardController
        ? runtime.clipboardController
        : null
    };
  }

  return {
    createStudioEditorClipboardShellComposition
  };
});

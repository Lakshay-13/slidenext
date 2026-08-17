(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorDeckViewShellComposition = api;
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

  function createStudioEditorDeckViewShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorDeckViewRuntimeAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorDeckViewRuntimeAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null
      };
    }

    const runtimeOptions = { ...(options.runtimeOptions || {}) };
    const dependencies = [
      ['exportApi', 'SlideNextStudioEditorExportController'],
      ['snapshotControllerApi', 'SlideNextStudioEditorDeckSnapshotController'],
      ['previewControllerApi', 'SlideNextStudioEditorPreviewController'],
      ['sourceControllerApi', 'SlideNextStudioEditorSourceController'],
      ['exportActions', 'SlideNextStudioEditorExportActions']
    ];
    for (const [optionName, globalName] of dependencies) {
      runtimeOptions[optionName] = resolveApi(
        options,
        optionName,
        globalName,
        runtimeOptions
      );
    }

    const accessors = accessorsApi.createStudioEditorDeckViewRuntimeAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorDeckViewShellRuntime'
      ),
      deckViewRuntimeApi: resolveApi(
        options,
        'deckViewRuntimeApi',
        'SlideNextStudioEditorDeckViewRuntime'
      ),
      runtimeOptions
    });

    return {
      accessors,
      runtime: accessors && accessors.runtime ? accessors.runtime : null
    };
  }

  return {
    createStudioEditorDeckViewShellComposition
  };
});

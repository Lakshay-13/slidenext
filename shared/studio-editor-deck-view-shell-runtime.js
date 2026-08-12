(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorDeckViewShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorDeckViewShellRuntime(options = {}) {
    const deckViewRuntimeApi = resolveApi(
      options,
      'deckViewRuntimeApi',
      'SlideNextStudioEditorDeckViewRuntime'
    );
    if (!deckViewRuntimeApi || typeof deckViewRuntimeApi.createStudioEditorDeckViewRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.deckViewRuntimeApi;
    runtimeOptions.exportApi = resolveApi(
      options,
      'exportApi',
      'SlideNextStudioEditorExportController'
    );
    runtimeOptions.snapshotControllerApi = resolveApi(
      options,
      'snapshotControllerApi',
      'SlideNextStudioEditorDeckSnapshotController'
    );
    runtimeOptions.previewControllerApi = resolveApi(
      options,
      'previewControllerApi',
      'SlideNextStudioEditorPreviewController'
    );
    runtimeOptions.sourceControllerApi = resolveApi(
      options,
      'sourceControllerApi',
      'SlideNextStudioEditorSourceController'
    );
    runtimeOptions.exportActions = resolveApi(
      options,
      'exportActions',
      'SlideNextStudioEditorExportActions'
    );

    return deckViewRuntimeApi.createStudioEditorDeckViewRuntime(runtimeOptions);
  }

  return {
    createStudioEditorDeckViewShellRuntime
  };
});

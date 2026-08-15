(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayoutShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorLayoutShellRuntime(options = {}) {
    const layoutRuntimeApi = resolveApi(
      options,
      'layoutRuntimeApi',
      'SlideNextStudioEditorLayoutRuntime'
    );
    if (!layoutRuntimeApi
      || typeof layoutRuntimeApi.createStudioEditorLayoutRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.layoutRuntimeApi;
    runtimeOptions.nudgeApi = resolveApi(
      options,
      'nudgeApi',
      'SlideNextStudioEditorNudgeController'
    );
    runtimeOptions.layoutModeControllerApi = resolveApi(
      options,
      'layoutModeControllerApi',
      'SlideNextStudioEditorLayoutModeController'
    );
    runtimeOptions.alignmentApi = resolveApi(
      options,
      'alignmentApi',
      'SlideNextStudioEditorAlignmentController'
    );
    runtimeOptions.groupApi = resolveApi(
      options,
      'groupApi',
      'SlideNextStudioEditorGroupController'
    );
    runtimeOptions.conversionApi = resolveApi(
      options,
      'conversionApi',
      'SlideNextStudioEditorLayoutConversionController'
    );
    runtimeOptions.nudgeEngineApi = resolveApi(
      options,
      'nudgeEngineApi',
      'SlideNextStudioEditorNudge'
    );
    runtimeOptions.conversionEngineApi = resolveApi(
      options,
      'conversionEngineApi',
      'SlideNextStudioEditorLayoutConversion'
    );
    runtimeOptions.alignmentEngineApi = resolveApi(
      options,
      'alignmentEngineApi',
      'SlideNextStudioEditorAlignment'
    );
    runtimeOptions.canonicalLayoutApi = resolveApi(
      options,
      'canonicalLayoutApi',
      'SlideNextStudioEditorCanonicalLayout'
    );
    runtimeOptions.canonicalDeckApi = resolveApi(
      options,
      'canonicalDeckApi',
      'SlideNextCanonicalDeck'
    );
    runtimeOptions.canonicalGroupApi = resolveApi(
      options,
      'canonicalGroupApi',
      'SlideNextStudioEditorCanonicalGroup'
    );
    runtimeOptions.deckImportApi = resolveApi(
      options,
      'deckImportApi',
      'SlideNextDeckImport'
    );
    runtimeOptions.transactionApi = resolveApi(
      options,
      'transactionApi',
      'SlideNextStudioEditorTransaction'
    );
    runtimeOptions.groupTransactionApi = resolveApi(
      options,
      'groupTransactionApi',
      'SlideNextStudioEditorGroupTransaction'
    );
    runtimeOptions.ungroupTransactionApi = resolveApi(
      options,
      'ungroupTransactionApi',
      'SlideNextStudioEditorUngroupTransaction'
    );
    runtimeOptions.groupMutationApi = resolveApi(
      options,
      'groupMutationApi',
      'SlideNextStudioEditorGroupMutation'
    );
    runtimeOptions.ungroupMutationApi = resolveApi(
      options,
      'ungroupMutationApi',
      'SlideNextStudioEditorGroupMutation'
    );
    runtimeOptions.groupEngineApi = resolveApi(
      options,
      'groupEngineApi',
      'SlideNextStudioEditorGroup'
    );

    return layoutRuntimeApi.createStudioEditorLayoutRuntime(runtimeOptions);
  }

  return {
    createStudioEditorLayoutShellRuntime
  };
});

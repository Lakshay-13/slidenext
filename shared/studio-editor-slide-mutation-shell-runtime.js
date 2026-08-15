(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideMutationShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorSlideMutationShellRuntime(options = {}) {
    const mutationRuntimeApi = resolveApi(
      options,
      'mutationRuntimeApi',
      'SlideNextStudioEditorSlideMutationRuntime'
    );
    if (!mutationRuntimeApi
      || typeof mutationRuntimeApi.createStudioEditorSlideMutationRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.mutationRuntimeApi;
    runtimeOptions.reorderApi = resolveApi(
      options,
      'reorderApi',
      'SlideNextStudioEditorSlideReorderController'
    );
    runtimeOptions.insertionApi = resolveApi(
      options,
      'insertionApi',
      'SlideNextStudioEditorSlideInsertionController'
    );
    runtimeOptions.deletionApi = resolveApi(
      options,
      'deletionApi',
      'SlideNextStudioEditorSlideDeletionController'
    );
    runtimeOptions.duplicationApi = resolveApi(
      options,
      'duplicationApi',
      'SlideNextStudioEditorSlideDuplicationController'
    );
    runtimeOptions.slideCommandsApi = resolveApi(
      options,
      'slideCommandsApi',
      'SlideNextStudioEditorSlideCommands'
    );
    runtimeOptions.canonicalSlideApi = resolveApi(
      options,
      'canonicalSlideApi',
      'SlideNextStudioEditorCanonicalSlide'
    );
    runtimeOptions.canonicalDeckApi = resolveApi(
      options,
      'canonicalDeckApi',
      'SlideNextCanonicalDeck'
    );
    runtimeOptions.deckImportApi = resolveApi(
      options,
      'deckImportApi',
      'SlideNextDeckImport'
    );
    runtimeOptions.reorderMutationApi = resolveApi(
      options,
      'reorderMutationApi',
      'SlideNextStudioEditorSlideReorderMutation'
    );
    runtimeOptions.reorderTransactionApi = resolveApi(
      options,
      'reorderTransactionApi',
      'SlideNextStudioEditorSlideReorderTransaction'
    );
    runtimeOptions.deckViewApi = resolveApi(
      options,
      'deckViewApi',
      'SlideNextStudioDeckView'
    );

    return mutationRuntimeApi.createStudioEditorSlideMutationRuntime(runtimeOptions);
  }

  return {
    createStudioEditorSlideMutationShellRuntime
  };
});

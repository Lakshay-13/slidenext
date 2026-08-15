(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionCompositionShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorSelectionCompositionShellRuntime(options = {}) {
    const compositionApi = resolveApi(
      options,
      'compositionApi',
      'SlideNextStudioEditorSelectionComposition'
    );
    const controller = compositionApi
      && typeof compositionApi.createStudioEditorSelectionCompositionController === 'function'
      ? compositionApi.createStudioEditorSelectionCompositionController({
          selectionApi: resolveApi(options, 'selectionApi', 'SlideNextStudioEditorSelection'),
          selectionStateAdapter: resolveApi(
            options,
            'selectionStateAdapter',
            'SlideNextStudioEditorSelectionStateAdapter'
          ),
          selectionCommitAdapter: resolveApi(
            options,
            'selectionCommitAdapter',
            'SlideNextStudioEditorSelectionCommitAdapter'
          ),
          selectionClassAdapter: resolveApi(
            options,
            'selectionClassAdapter',
            'SlideNextStudioEditorSelectionClassAdapter'
          ),
          getDocument: options.getDocument,
          getSelectedElements: options.getSelectedElements,
          getSelectionOptions: options.getSelectionOptions,
          getRefreshSelectionOptions: options.getRefreshSelectionOptions,
          setSelectionState: options.setSelectionState,
          clearSelectionState: options.clearSelectionState,
          syncSelectionOverlay: options.syncSelectionOverlay,
          syncInspectorForSelection: options.syncInspectorForSelection,
          updateLayersList: options.updateLayersList
        })
      : null;

    return {
      isAvailable: !!controller,
      selectionCompositionController: controller
    };
  }

  return {
    createStudioEditorSelectionCompositionShellRuntime
  };
});

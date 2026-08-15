(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorInspectorSelectionShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorInspectorSelectionShellRuntime(options = {}) {
    const inspectorApi = resolveApi(
      options,
      'inspectorApi',
      'SlideNextStudioEditorInspectorController'
    );
    const liveSelectionApi = resolveApi(
      options,
      'liveSelectionApi',
      'SlideNextStudioEditorLiveSelection'
    );
    const inspectorView = resolveApi(
      options,
      'inspectorView',
      'SlideNextStudioEditorInspectorView'
    );
    const synchronizer = inspectorApi
      && typeof inspectorApi.createStudioInspectorSelectionSynchronizer === 'function'
      ? inspectorApi.createStudioInspectorSelectionSynchronizer({
          liveSelectionApi,
          inspectorApi,
          inspectorView,
          documentRef: options.documentRef,
          getSelectedElements: options.getSelectedElements,
          getCurrentDocument: options.getCurrentDocument,
          buildCanonicalDeck: options.buildCanonicalDeck,
          resolveCanonicalNode: options.resolveCanonicalNode,
          rgbToHex: options.rgbToHex,
          highlightAlignButton: options.highlightAlignButton,
          updateAssetLibraryState: options.updateAssetLibraryState,
          updateClipboardActionState: options.updateClipboardActionState,
          updateRemovalActionState: options.updateRemovalActionState,
          updateLockActionState: options.updateLockActionState,
          updateVisibilityActionState: options.updateVisibilityActionState,
          updateMotionActionState: options.updateMotionActionState,
          updateAlignmentActionState: options.updateAlignmentActionState,
          updateGroupActionState: options.updateGroupActionState,
          updateStyleActionState: options.updateStyleActionState,
          updateLayerOrderActionState: options.updateLayerOrderActionState
        })
      : null;

    return {
      sync: (doc) => typeof synchronizer === 'function' ? synchronizer(doc) : false
    };
  }

  return {
    createStudioEditorInspectorSelectionShellRuntime
  };
});

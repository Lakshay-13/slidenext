(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorInspectorSelectionAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const RUNTIME_OPTION_NAMES = [
    'inspectorApi',
    'liveSelectionApi',
    'inspectorView',
    'documentRef',
    'getSelectedElements',
    'getCurrentDocument',
    'buildCanonicalDeck',
    'resolveCanonicalNode',
    'rgbToHex',
    'highlightAlignButton',
    'updateAssetLibraryState',
    'updateClipboardActionState',
    'updateRemovalActionState',
    'updateLockActionState',
    'updateVisibilityActionState',
    'updateMotionActionState',
    'updateAlignmentActionState',
    'updateGroupActionState',
    'updateStyleActionState',
    'updateLayerOrderActionState'
  ];

  function createStudioEditorInspectorSelectionAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorInspectorSelectionShellRuntime;
    const runtimeOptions = {};
    RUNTIME_OPTION_NAMES.forEach((name) => {
      if (Object.prototype.hasOwnProperty.call(options, name)) {
        runtimeOptions[name] = options[name];
      }
    });
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorInspectorSelectionShellRuntime === 'function'
      ? runtimeApi.createStudioEditorInspectorSelectionShellRuntime(runtimeOptions)
      : null;

    return {
      runtime,
      sync: (doc) => runtime && typeof runtime.sync === 'function'
        ? runtime.sync(doc)
        : false
    };
  }

  return { createStudioEditorInspectorSelectionAccessors };
});

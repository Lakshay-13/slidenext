(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorInspectorController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function syncStudioInspectorActionStates(options = {}) {
    const invoke = (name) => {
      if (typeof options[name] === 'function') options[name]();
    };

    invoke('updateClipboardActionState');
    invoke('updateRemovalActionState');
    invoke('updateLockActionState');
    invoke('updateVisibilityActionState');
    invoke('updateMotionActionState');
    invoke('updateAlignmentActionState');
    invoke('updateGroupActionState');
    invoke('updateStyleActionState');
    invoke('updateLayerOrderActionState');
    return true;
  }

  return { syncStudioInspectorActionStates };
});

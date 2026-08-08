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

    invoke('updateAssetLibraryState');
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

  function syncStudioInspectorSelection(options = {}) {
    const documentRef = options.documentRef;
    const selectionState = options.selectionState || {};
    const inspectorView = options.inspectorView;
    if (!inspectorView) return false;
    if (typeof inspectorView.syncStudioInspectorSelection === 'function') {
      return inspectorView.syncStudioInspectorSelection({
        documentRef,
        selectionState,
        rgbToHex: options.rgbToHex,
        highlightAlignButton: options.highlightAlignButton
      });
    }
    if (typeof inspectorView.renderStudioInspectorSelectionSummary !== 'function') return false;
    const selectionSummary = inspectorView.renderStudioInspectorSelectionSummary({
      documentRef,
      selectionState
    });
    if (!selectionSummary.hasSelection) return false;

    const primaryElement = selectionSummary.primaryElement;
    const computedStyles = primaryElement.ownerDocument.defaultView.getComputedStyle(primaryElement);
    inspectorView.syncStudioInspectorContentControls({
      documentRef,
      primaryElement,
      isMulti: selectionSummary.isMulti
    });
    inspectorView.syncStudioInspectorTypographyControls({
      documentRef,
      primaryElement,
      computedStyles,
      rgbToHex: options.rgbToHex,
      highlightAlignButton: options.highlightAlignButton
    });
    inspectorView.syncStudioInspectorBorderControls({
      documentRef,
      selection: selectionState.selection,
      computedStyles,
      rgbToHex: options.rgbToHex
    });
    return true;
  }

  function syncStudioInspectorForSelection(options = {}) {
    syncStudioInspectorActionStates(options);
    return syncStudioInspectorSelection(options);
  }

  return {
    syncStudioInspectorActionStates,
    syncStudioInspectorSelection,
    syncStudioInspectorForSelection
  };
});

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
        canonicalNode: options.canonicalNode,
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
      isMulti: selectionSummary.isMulti,
      canonicalNode: options.canonicalNode
    });
    inspectorView.syncStudioInspectorTypographyControls({
      documentRef,
      primaryElement,
      computedStyles,
      canonicalNode: options.canonicalNode,
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

  function createStudioInspectorSelectionSynchronizer(options = {}) {
    const liveSelectionApi = options.liveSelectionApi
      && typeof options.liveSelectionApi.buildStudioLiveSelectionState === 'function'
      ? options.liveSelectionApi
      : null;
    const inspectorApi = options.inspectorApi
      && typeof options.inspectorApi.syncStudioInspectorForSelection === 'function'
      ? options.inspectorApi
      : { syncStudioInspectorForSelection };
    const inspectorView = options.inspectorView || null;
    const documentRef = options.documentRef || null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getCurrentDocument = typeof options.getCurrentDocument === 'function'
      ? options.getCurrentDocument
      : () => null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const resolveCanonicalNode = typeof options.resolveCanonicalNode === 'function'
      ? options.resolveCanonicalNode
      : null;

    return function syncStudioInspectorSelectionFromEditor(documentOverride = null) {
      if (!liveSelectionApi) return false;

      let currentDocument = null;
      let liveSelectionState;
      try {
        currentDocument = documentOverride || getCurrentDocument();
        liveSelectionState = liveSelectionApi.buildStudioLiveSelectionState(
          getSelectedElements(currentDocument)
        );
      } catch (error) {
        return false;
      }
      if (!inspectorView) return false;

      const primaryElement = liveSelectionState && liveSelectionState.primaryElement;
      const primaryElementId = primaryElement && primaryElement.dataset
        ? primaryElement.dataset.editorId
        : '';
      let canonicalDeck = null;
      if (primaryElementId && buildCanonicalDeck) {
        try {
          canonicalDeck = buildCanonicalDeck(currentDocument);
        } catch (error) {
          canonicalDeck = null;
        }
      }
      let canonicalNode = null;
      if (resolveCanonicalNode) {
        try {
          canonicalNode = resolveCanonicalNode(primaryElement, canonicalDeck);
        } catch (error) {
          canonicalNode = null;
        }
      }

      return inspectorApi.syncStudioInspectorForSelection({
        documentRef,
        selectionState: liveSelectionState,
        inspectorView,
        canonicalNode,
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
      });
    };
  }

  return {
    syncStudioInspectorActionStates,
    syncStudioInspectorSelection,
    syncStudioInspectorForSelection,
    createStudioInspectorSelectionSynchronizer
  };
});

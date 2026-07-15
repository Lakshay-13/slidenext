(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioDeckReady = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STUDIO_DECK_RESET_CONTROL_IDS = [
    'launchPreviewBtn',
    'exportPdfBtn',
    'exportPptxBtn',
    'studioSaveBtn',
    'studioVersionBtn',
    'addSlideBtn',
    'duplicateSlideBtn',
    'zoomOutBtn',
    'zoomSelect',
    'zoomInBtn',
    'toolbarInsertHeadingBtn',
    'toolbarInsertParagraphBtn',
    'toolbarInsertImageBtn',
    'toolbarInsertShapeBtn',
    'insertHeadingBtn',
    'insertParagraphBtn',
    'insertImageBtn',
    'insertShapeBtn',
    'insertTableBtn',
    'insertCodeBtn',
    'openSourceViewBtn',
    'wpTabSolid',
    'wpTabPresets',
    'wpTabCustom',
    'wallpaperCustomColor',
    'cgLinearBtn',
    'cgRadialBtn',
    'cgColor1',
    'cgColor2',
    'cgAngle',
    'applyWallpaperToAllSlidesBtn',
    'studioUndoBtn',
    'studioRedoBtn',
    'slidePasteClipboardBtn',
    'copySelectionBtn',
    'pasteClipboardBtn',
    'toggleLockSelectionBtn',
    'toggleVisibilitySelectionBtn',
    'removeSelectionBtn',
    'nudgeSelectionUpBtn',
    'nudgeSelectionLeftBtn',
    'nudgeSelectionRightBtn',
    'nudgeSelectionDownBtn',
    'alignSelectionLeftBtn',
    'alignSelectionCenterBtn',
    'alignSelectionRightBtn',
    'alignSelectionTopBtn',
    'alignSelectionMiddleBtn',
    'alignSelectionBottomBtn',
    'distributeSelectionHorizontalBtn',
    'distributeSelectionVerticalBtn',
    'groupSelectionBtn',
    'ungroupSelectionBtn',
    'toggleGridSnapBtn',
    'arrangeLayerFrontBtn',
    'arrangeLayerBackBtn',
    'arrangeLayerForwardBtn',
    'arrangeLayerBackwardBtn',
    'elZIndex',
    'elTextContent',
    'elImageSrc',
    'elFontSize',
    'elFontFamily',
    'elFontWeight',
    'alignLeftBtn',
    'alignCenterBtn',
    'alignRightBtn',
    'alignJustifyBtn',
    'elTextColor',
    'elOpacity',
    'elBorderStyle',
    'elBorderWidth',
    'elBorderRadius',
    'elBorderColor'
  ];

  function resolveStudioDeckReadyActionState(options = {}) {
    const hasDeckDocument = !!(options.doc && options.doc.documentElement);
    const hasPresentationSession = typeof options.presentationUrl === 'string' && !!options.presentationUrl;
    const hasPersistedDeckContent = !!options.persistedDeckStateWithContent;
    const hasStoredCanonicalDeck = !!options.storedCanonicalDeck;
    const isSaveVersionInProgress = options.saveButtonState === 'saving-version';
    const hasDeckContent = hasDeckDocument || hasPersistedDeckContent || hasStoredCanonicalDeck;

    return {
      hasDeckDocument,
      hasPresentationSession,
      hasPersistedDeckContent,
      hasStoredCanonicalDeck,
      isSaveVersionInProgress,
      hasDeckContent,
      canUseSaveButton: hasPresentationSession && hasDeckContent && !isSaveVersionInProgress,
      canUseDeckActions: hasPresentationSession && hasDeckContent,
      canLaunchPreview: hasPresentationSession
    };
  }

  function renderStudioDeckReadyToolbarActionState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const actionState = options.actionState || {};
    const setDisabled = (id, disabled) => {
      const button = documentRef.getElementById(id);
      if (button) button.disabled = !!disabled;
    };

    setDisabled('studioSaveBtn', !actionState.canUseSaveButton);
    setDisabled('openSourceViewBtn', !actionState.canUseDeckActions);
    setDisabled('studioVersionBtn', !actionState.canUseDeckActions);
    setDisabled('launchPreviewBtn', !actionState.canLaunchPreview);
    setDisabled('exportPdfBtn', !actionState.canUseDeckActions);
    setDisabled('exportPptxBtn', !actionState.canUseDeckActions);
    return true;
  }

  function resetStudioDeckControlState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;

    STUDIO_DECK_RESET_CONTROL_IDS.forEach((id) => {
      const control = documentRef.getElementById(id);
      if (control) control.disabled = true;
    });
    ['wallpaperSolidsList', 'wallpaperGradientsList'].forEach((id) => {
      const container = documentRef.getElementById(id);
      if (!container || typeof container.querySelectorAll !== 'function') return;
      container.querySelectorAll('button').forEach((button) => {
        button.disabled = true;
      });
    });
    return true;
  }

  function syncStudioDeckReadyToolbarActionState(options = {}) {
    const actionState = options.actionState || resolveStudioDeckReadyActionState(options);
    return renderStudioDeckReadyToolbarActionState({
      documentRef: options.documentRef,
      actionState
    });
  }

  return {
    resolveStudioDeckReadyActionState,
    renderStudioDeckReadyToolbarActionState,
    resetStudioDeckControlState,
    syncStudioDeckReadyToolbarActionState
  };
});

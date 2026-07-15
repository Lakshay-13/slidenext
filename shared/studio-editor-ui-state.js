(function (root, factory) {
  const deckView = typeof module === 'object' && module.exports
    ? require('./studio-deck-view')
    : root && root.SlideNextStudioDeckView;
  const inspectorView = typeof module === 'object' && module.exports
    ? require('./studio-editor-inspector-view')
    : root && root.SlideNextStudioEditorInspectorView;
  const wallpaperView = typeof module === 'object' && module.exports
    ? require('./studio-editor-wallpaper-view')
    : root && root.SlideNextStudioEditorWallpaperView;
  const deckReadyView = typeof module === 'object' && module.exports
    ? require('./studio-deck-ready')
    : root && root.SlideNextStudioDeckReady;
  const api = factory(deckView, inspectorView, wallpaperView, deckReadyView);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorUiState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  deckView,
  inspectorView,
  wallpaperView,
  deckReadyView
) {
  function resetStudioDeckUiState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;

    if (typeof options.resetLocalState === 'function') {
      options.resetLocalState();
    }

    const isLoading = !!options.isLoading;
    if (deckView && typeof deckView.resetStudioDeckSidebarUiState === 'function') {
      deckView.resetStudioDeckSidebarUiState({
        documentRef,
        isLoading
      });
    }

    if (inspectorView && typeof inspectorView.resetStudioInspectorUiState === 'function') {
      inspectorView.resetStudioInspectorUiState({
        documentRef
      });
    }

    if (wallpaperView && typeof wallpaperView.resetStudioWallpaperUiState === 'function') {
      wallpaperView.resetStudioWallpaperUiState({
        documentRef
      });
    }

    if (deckReadyView && typeof deckReadyView.resetStudioDeckControlState === 'function') {
      deckReadyView.resetStudioDeckControlState({
        documentRef
      });
    }

    return true;
  }

  return { resetStudioDeckUiState };
});

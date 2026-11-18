(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorBootstrap = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorBootstrap(options = {}) {
    const documentRef = options.documentRef || (root && root.document) || null;
    const windowRef = options.windowRef || (root && root.window) || root || null;
    const savedTheme = options.savedTheme || 'dark';
    const invoke = (name) => typeof options[name] === 'function'
      ? options[name]
      : () => {};
    const loadPresentations = invoke('loadPresentations');
    const renderWallpaperPresets = invoke('renderWallpaperPresets');
    const renderThemeTokenPresets = invoke('renderThemeTokenPresets');
    const updateWallpaperActionState = invoke('updateWallpaperActionState');
    const updateThemeTokenActionState = invoke('updateThemeTokenActionState');
    const updateGridSnapActionState = invoke('updateGridSnapActionState');
    const updateDeckReadyToolbarActionState = invoke('updateDeckReadyToolbarActionState');
    const updateBlockActionState = invoke('updateBlockActionState');
    const updateTemplateActionState = invoke('updateTemplateActionState');
    const updateMasterSlideActionState = invoke('updateMasterSlideActionState');
    const updateAssetLibraryState = invoke('updateAssetLibraryState');
    const bindStudioGlobalKeydownHandler = invoke('bindStudioGlobalKeydownHandler');
    const applyZoom = invoke('applyZoom');
    const syncCanvasRulers = invoke('syncCanvasRulers');
    let didInitialize = false;
    let didBindDomReady = false;

    function initialize() {
      if (didInitialize) return true;
      didInitialize = true;

      loadPresentations();
      renderWallpaperPresets();
      renderThemeTokenPresets();
      updateWallpaperActionState();
      updateThemeTokenActionState();
      updateGridSnapActionState();
      updateDeckReadyToolbarActionState();
      updateBlockActionState();
      updateTemplateActionState();
      updateMasterSlideActionState();
      updateAssetLibraryState();

      const themeIcon = documentRef && typeof documentRef.getElementById === 'function'
        ? documentRef.getElementById('themeIcon')
        : null;
      const themeIconEditor = documentRef && typeof documentRef.getElementById === 'function'
        ? documentRef.getElementById('themeIconEditor')
        : null;
      const nextIcon = savedTheme === 'dark' ? 'light_mode' : 'dark_mode';
      if (themeIcon) themeIcon.textContent = nextIcon;
      if (themeIconEditor) themeIconEditor.textContent = nextIcon;

      bindStudioGlobalKeydownHandler();

      if (windowRef && typeof windowRef.addEventListener === 'function') {
        windowRef.addEventListener('resize', () => {
          const zoomSelect = documentRef && typeof documentRef.getElementById === 'function'
            ? documentRef.getElementById('zoomSelect')
            : null;
          if (zoomSelect && zoomSelect.value === 'fit') {
            applyZoom('fit');
          }
          syncCanvasRulers();
        });
      }

      const canvasStage = documentRef && typeof documentRef.getElementById === 'function'
        ? documentRef.getElementById('canvasStage')
        : null;
      if (canvasStage && typeof canvasStage.addEventListener === 'function') {
        canvasStage.addEventListener('scroll', syncCanvasRulers);
      }
      syncCanvasRulers();
      return true;
    }

    function bindDomReady() {
      if (!documentRef || typeof documentRef.addEventListener !== 'function') return false;
      if (didBindDomReady) return true;
      didBindDomReady = true;
      if (documentRef.readyState && documentRef.readyState !== 'loading') {
        initialize();
        return true;
      }
      documentRef.addEventListener('DOMContentLoaded', initialize, { once: true });
      return true;
    }

    return { bindDomReady, initialize };
  }

  return {
    createStudioEditorBootstrap
  };
});

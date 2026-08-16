(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorWallpaperAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorWallpaperAccessors(options = {}) {
    const resolveActionState = typeof options.resolveActionState === 'function'
      ? options.resolveActionState
      : () => ({ canUseWallpaperControls: false });
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getWallpaperView = typeof options.getWallpaperView === 'function'
      ? options.getWallpaperView
      : () => options.wallpaperView || null;
    const setWallpaperTabState = typeof options.setWallpaperTabState === 'function'
      ? options.setWallpaperTabState
      : null;
    const getWallpaperPresetData = typeof options.getWallpaperPresetData === 'function'
      ? options.getWallpaperPresetData
      : () => options.wallpaperPresetData || {};
    const getApplyPresetWallpaper = typeof options.getApplyPresetWallpaper === 'function'
      ? options.getApplyPresetWallpaper
      : () => options.applyPresetWallpaper || null;

    function setWallpaperTab(tab) {
      const actionState = resolveActionState();
      if (!actionState || !actionState.canUseWallpaperControls) return false;

      const wallpaperView = getWallpaperView();
      if (!wallpaperView || typeof wallpaperView.setStudioWallpaperTab !== 'function') {
        return false;
      }
      const didApply = wallpaperView.setStudioWallpaperTab({
        documentRef: getDocument(),
        tab
      });
      if (didApply && setWallpaperTabState) setWallpaperTabState(tab);
      return didApply;
    }

    function renderWallpaperPresets() {
      const wallpaperView = getWallpaperView();
      if (!wallpaperView || typeof wallpaperView.renderStudioWallpaperPresets !== 'function') {
        return false;
      }
      const didRender = wallpaperView.renderStudioWallpaperPresets({
        documentRef: getDocument(),
        presetData: getWallpaperPresetData()
      });
      if (typeof wallpaperView.bindStudioWallpaperPresetActions === 'function') {
        wallpaperView.bindStudioWallpaperPresetActions({
          documentRef: getDocument(),
          applyPresetWallpaper: getApplyPresetWallpaper()
        });
      }
      return didRender;
    }

    return { setWallpaperTab, renderWallpaperPresets };
  }

  return { createStudioEditorWallpaperAccessors };
});

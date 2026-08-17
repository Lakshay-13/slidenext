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
    const getWallpaperController = typeof options.getWallpaperController === 'function'
      ? options.getWallpaperController
      : () => options.wallpaperController || null;
    const getIframeDocument = typeof options.getIframeDocument === 'function'
      ? options.getIframeDocument
      : () => null;
    const applyMutation = typeof options.applyMutation === 'function'
      ? options.applyMutation
      : null;
    const applySlidesMutation = typeof options.applySlidesMutation === 'function'
      ? options.applySlidesMutation
      : null;
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : () => '';
    const getSlides = typeof options.getSlides === 'function'
      ? options.getSlides
      : null;
    const setPendingCustomWallpaperVersion = typeof options.setPendingCustomWallpaperVersion === 'function'
      ? options.setPendingCustomWallpaperVersion
      : null;
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    const rollbackMutation = typeof options.rollbackMutation === 'function'
      ? options.rollbackMutation
      : null;
    const getAlert = typeof options.getAlert === 'function'
      ? options.getAlert
      : () => options.alertRef || null;

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

    function applyPresetWallpaper(background, isCustomInput = false) {
      const wallpaperController = getWallpaperController();
      if (!wallpaperController
        || typeof wallpaperController.applyStudioPresetWallpaper !== 'function') {
        return false;
      }
      return wallpaperController.applyStudioPresetWallpaper({
        background,
        isCustomInput,
        resolveActionState,
        getIframeDocument,
        wallpaperView: getWallpaperView(),
        applyMutation,
        getSlideId,
        setPendingCustomWallpaperVersion,
        finalizeMutation,
        rollbackMutation
      });
    }

    function applyWallpaperToAllSlides() {
      const wallpaperController = getWallpaperController();
      if (!wallpaperController
        || typeof wallpaperController.applyStudioWallpaperToAllSlides !== 'function') {
        return false;
      }
      return wallpaperController.applyStudioWallpaperToAllSlides({
        resolveActionState,
        getIframeDocument,
        wallpaperView: getWallpaperView(),
        getSlides,
        applyMutation: applySlidesMutation,
        getSlideId,
        finalizeMutation,
        rollbackMutation,
        alertRef: getAlert()
      });
    }

    return {
      setWallpaperTab,
      renderWallpaperPresets,
      applyPresetWallpaper,
      applyWallpaperToAllSlides
    };
  }

  return { createStudioEditorWallpaperAccessors };
});

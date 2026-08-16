(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorThemeToolbarState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorThemeToolbarStateController(options = {}) {
    const themeView = options.themeView && typeof options.themeView === 'object'
      ? options.themeView
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getActionState = typeof options.getActionState === 'function'
      ? options.getActionState
      : () => ({ canUseThemeTokenControls: false });
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    let stateSync = null;

    function sync(doc = getDocument()) {
      if (!themeView
        || typeof themeView.syncStudioThemeTokenPresetActionState !== 'function') {
        return false;
      }
      if (typeof themeView.createStudioThemeTokenPresetActionStateSync === 'function') {
        if (!stateSync) {
          stateSync = themeView.createStudioThemeTokenPresetActionStateSync({
            getDocument,
            getActionState,
            getDocumentRef: () => documentRef
          });
        }
        if (typeof stateSync === 'function') return stateSync(doc);
      }

      let actionState = null;
      try {
        actionState = getActionState(doc);
      } catch (error) {
        return false;
      }
      return themeView.syncStudioThemeTokenPresetActionState({
        documentRef,
        canUseThemeTokenControls: !!(actionState && actionState.canUseThemeTokenControls)
      });
    }

    return { sync };
  }

  return {
    createStudioEditorThemeToolbarStateController
  };
});

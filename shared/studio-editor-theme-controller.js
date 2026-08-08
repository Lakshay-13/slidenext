(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorThemeController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorThemeController(options = {}) {
    const themeViewApi = options.themeViewApi
      || (root && root.SlideNextStudioThemeView)
      || null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    const localStorageRef = options.localStorageRef || null;
    const getIframeDocument = typeof options.getIframeDocument === 'function'
      ? options.getIframeDocument
      : () => null;
    const resolveDarkMode = typeof options.resolveDarkMode === 'function'
      ? options.resolveDarkMode
      : () => !!(
          documentRef
          && documentRef.documentElement
          && documentRef.documentElement.classList
          && typeof documentRef.documentElement.classList.contains === 'function'
          && documentRef.documentElement.classList.contains('dark')
        );

    function syncIframeTheme() {
      if (!themeViewApi || typeof themeViewApi.syncStudioIframeTheme !== 'function') return false;
      return themeViewApi.syncStudioIframeTheme({
        iframeDoc: getIframeDocument(),
        isDark: resolveDarkMode()
      });
    }

    function toggleGlobalTheme() {
      if (!themeViewApi || typeof themeViewApi.toggleStudioGlobalTheme !== 'function') return false;
      const result = themeViewApi.toggleStudioGlobalTheme({
        documentRef,
        localStorageRef,
        syncIframeTheme
      });
      return !!(result && result.didApply);
    }

    return {
      toggleGlobalTheme,
      syncIframeTheme
    };
  }

  return {
    createStudioEditorThemeController
  };
});

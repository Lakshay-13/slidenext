(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGlobalShortcutsController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorGlobalShortcutsController(options = {}) {
    const shortcutsApi = Object.prototype.hasOwnProperty.call(options, 'shortcutsApi')
      ? options.shortcutsApi
      : root && root.SlideNextStudioEditorGlobalShortcuts;
    const eventsApi = Object.prototype.hasOwnProperty.call(options, 'eventsApi')
      ? options.eventsApi
      : root && root.SlideNextStudioEditorEvents;
    const documentRef = Object.prototype.hasOwnProperty.call(options, 'documentRef')
      ? options.documentRef
      : root && root.document;

    function bind() {
      if (!shortcutsApi
        || typeof shortcutsApi.bindStudioGlobalKeydownHandler !== 'function') {
        return false;
      }

      const handlerOptions = { ...options };
      delete handlerOptions.shortcutsApi;
      delete handlerOptions.eventsApi;
      delete handlerOptions.documentRef;
      return shortcutsApi.bindStudioGlobalKeydownHandler({
        documentRef,
        eventsApi,
        ...handlerOptions
      });
    }

    return { bind };
  }

  return {
    createStudioEditorGlobalShortcutsController
  };
});

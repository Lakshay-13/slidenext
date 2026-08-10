(function (root, factory) {
  const api = factory(
    root,
    root && root.SlideNextStudioEditorEvents
  );
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGlobalShortcuts = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root, defaultEventsApi) {
  function bindStudioGlobalKeydownHandler(options = {}) {
    const eventsApi = options.eventsApi || defaultEventsApi;
    const documentRef = options.documentRef
      || (root && root.document ? root.document : null);
    if (!eventsApi
      || typeof eventsApi.createStudioGlobalKeydownHandler !== 'function'
      || !documentRef
      || typeof documentRef.addEventListener !== 'function') {
      return false;
    }

    const handlerOptions = { ...options };
    delete handlerOptions.eventsApi;
    delete handlerOptions.documentRef;
    const keydownHandler = eventsApi.createStudioGlobalKeydownHandler(handlerOptions);
    if (typeof keydownHandler !== 'function') {
      return false;
    }

    documentRef.addEventListener('keydown', keydownHandler);
    return true;
  }

  return {
    bindStudioGlobalKeydownHandler
  };
});

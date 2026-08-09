(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorHistoryRuntime(options = {}) {
    const historyStore = options.historyStore
      || (root && root.SlideNextStudioEditorHistoryStore)
      || null;
    const historyStateController = historyStore
      && typeof historyStore.createStudioEditorHistoryStateController === 'function'
      ? historyStore.createStudioEditorHistoryStateController({})
      : null;

    return {
      historyStateController
    };
  }

  return {
    createStudioEditorHistoryRuntime
  };
});

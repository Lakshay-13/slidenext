(function initStudioEditorHistoryFrameAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorHistoryFrameAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorHistoryFrameAction(options = {}) {
    const getHistoryController = typeof options.getHistoryController === 'function'
      ? options.getHistoryController
      : () => options.historyController || null;
    const historyStateApi = options.historyStateApi || null;
    const historyApi = options.historyApi || null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getHistoryOptions = typeof options.getHistoryOptions === 'function'
      ? options.getHistoryOptions
      : () => ({});
    const buildPersistableDeckHtml = typeof options.buildPersistableDeckHtml === 'function'
      ? options.buildPersistableDeckHtml
      : () => '';
    let frameHtmlBuilder = null;

    function buildHistoryFrameHtml(doc = getDocument(), buildOptions = {}) {
      const historyController = getHistoryController();
      if (historyController && typeof historyController.buildFrameHtml === 'function') {
        return historyController.buildFrameHtml(doc, buildOptions);
      }
      if (typeof frameHtmlBuilder !== 'function') {
        const createFrameHtmlBuilder = historyStateApi
          && typeof historyStateApi.createStudioEditorHistoryFrameHtmlStateAdapter === 'function'
          ? historyStateApi.createStudioEditorHistoryFrameHtmlStateAdapter
          : null;
        frameHtmlBuilder = createFrameHtmlBuilder
          ? createFrameHtmlBuilder({
              historyStateApi,
              historyApi,
              getHistoryOptions,
              buildPersistableDeckHtml
            })
          : null;
      }
      return typeof frameHtmlBuilder === 'function'
        ? frameHtmlBuilder(doc, buildOptions)
        : '';
    }

    return buildHistoryFrameHtml;
  }

  function createStudioEditorHistoryFrameGlobalApi(options = {}) {
    const buildHistoryFrameHtml = typeof options.buildHistoryFrameHtml === 'function'
      ? options.buildHistoryFrameHtml
      : null;
    return {
      buildHistoryFrameHtml: (...args) => buildHistoryFrameHtml
        ? buildHistoryFrameHtml(...args)
        : ''
    };
  }

  return {
    createStudioEditorHistoryFrameAction,
    createStudioEditorHistoryFrameGlobalApi
  };
}));

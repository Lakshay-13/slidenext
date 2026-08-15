(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVersionHistoryController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorVersionHistoryController(options = {}) {
    const hasOption = (name) => Object.prototype.hasOwnProperty.call(options, name);
    const versionHistoryApi = hasOption('versionHistoryApi')
      ? options.versionHistoryApi
      : (root && root.SlideNextStudioVersionHistory) || null;
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => '';
    const getSessionToken = typeof options.getSessionToken === 'function'
      ? options.getSessionToken
      : () => null;
    const createLoadOptions = typeof options.createLoadOptions === 'function'
      ? options.createLoadOptions
      : () => ({});
    const loadVersionHistory = typeof options.loadVersionHistory === 'function'
      ? options.loadVersionHistory
      : versionHistoryApi
        && typeof versionHistoryApi.loadStudioVersionHistory === 'function'
        ? versionHistoryApi.loadStudioVersionHistory
        : null;
    const beforeLoad = typeof options.beforeLoad === 'function'
      ? options.beforeLoad
      : () => {};
    const reportLoadError = typeof options.reportLoadError === 'function'
      ? options.reportLoadError
      : () => {};

    const sharedLoader = versionHistoryApi
      && typeof versionHistoryApi.createStudioVersionHistoryLoader === 'function'
      ? versionHistoryApi.createStudioVersionHistoryLoader({
          getPresentationUrl,
          getSessionToken,
          createLoadOptions,
          loadVersionHistory,
          beforeLoad,
          reportLoadError
        })
      : null;

    async function load(presentationUrl = getPresentationUrl(), sessionToken = getSessionToken()) {
      if (sharedLoader && typeof sharedLoader === 'function') {
        return sharedLoader(presentationUrl, sessionToken);
      }
      if (!presentationUrl || typeof loadVersionHistory !== 'function') return undefined;
      beforeLoad(presentationUrl, sessionToken);
      try {
        await loadVersionHistory(
          presentationUrl,
          createLoadOptions(presentationUrl, sessionToken)
        );
      } catch (error) {
        reportLoadError(error, presentationUrl, sessionToken);
      }
      return undefined;
    }

    return { load };
  }

  return {
    createStudioEditorVersionHistoryController
  };
});

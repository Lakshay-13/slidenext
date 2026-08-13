(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorChromeNodePrunerAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function pruneStudioEditorChromeNodes(doc, options = {}) {
    const domApi = options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
    const pruneChromeNodes = typeof options.chromeNodePruner === 'function'
      ? options.chromeNodePruner
      : domApi
        && typeof domApi.pruneStudioChromeNodes === 'function'
        ? domApi.pruneStudioChromeNodes
        : null;
    if (!pruneChromeNodes) {
      return null;
    }
    return pruneChromeNodes(doc, options.chromeOptions || {});
  }

  return {
    pruneStudioEditorChromeNodes
  };
});

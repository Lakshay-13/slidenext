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

  function createStudioEditorChromeNodePruner(options = {}) {
    const chromeNodeIds = Array.isArray(options.chromeNodeIds)
      ? [...options.chromeNodeIds]
      : [];
    const chromeNodePruner = typeof options.chromeNodePruner === 'function'
      ? options.chromeNodePruner
      : null;

    return (doc, activeSlide) => {
      const result = pruneStudioEditorChromeNodes(doc, {
        chromeNodePruner,
        chromeOptions: {
          activeSlide,
          chromeNodeIds
        }
      });
      return result === null ? null : true;
    };
  }

  return {
    pruneStudioEditorChromeNodes,
    createStudioEditorChromeNodePruner
  };
});

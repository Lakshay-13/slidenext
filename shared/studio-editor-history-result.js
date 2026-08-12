(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryResult = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isStudioHistoryCaptureFailure(value) {
    return value === false
      || (!!value && typeof value === 'object' && value.didCapture === false);
  }

  function captureStudioHistoryState(saveHistoryState, ...args) {
    if (typeof saveHistoryState !== 'function') return false;
    try {
      return saveHistoryState(...args);
    } catch (error) {
      return false;
    }
  }

  return {
    isStudioHistoryCaptureFailure,
    captureStudioHistoryState
  };
});

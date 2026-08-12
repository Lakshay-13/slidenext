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

  return {
    isStudioHistoryCaptureFailure
  };
});

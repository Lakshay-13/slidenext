(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPresentationUrlStateController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizePresentationUrl(value) {
    return typeof value === 'string' ? value : '';
  }

  function createStudioEditorPresentationUrlStateController(options = {}) {
    let presentationUrl = normalizePresentationUrl(options.presentationUrl);

    function getPresentationUrl() {
      return presentationUrl;
    }

    function setPresentationUrl(nextUrl) {
      presentationUrl = normalizePresentationUrl(nextUrl);
      return presentationUrl;
    }

    function reset() {
      return setPresentationUrl('');
    }

    return {
      getPresentationUrl,
      setPresentationUrl,
      reset
    };
  }

  return {
    normalizePresentationUrl,
    createStudioEditorPresentationUrlStateController
  };
});

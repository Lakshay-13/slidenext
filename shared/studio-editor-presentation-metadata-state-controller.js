(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPresentationMetadataStateController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizePresentationMetadata(value) {
    return value || null;
  }

  function createStudioEditorPresentationMetadataStateController(options = {}) {
    let presentationMetadata = normalizePresentationMetadata(options.presentationMetadata);

    function getPresentationMetadata() {
      return presentationMetadata;
    }

    function setPresentationMetadata(nextMetadata) {
      presentationMetadata = normalizePresentationMetadata(nextMetadata);
      return presentationMetadata;
    }

    function reset() {
      return setPresentationMetadata(null);
    }

    return {
      getPresentationMetadata,
      setPresentationMetadata,
      reset
    };
  }

  return {
    normalizePresentationMetadata,
    createStudioEditorPresentationMetadataStateController
  };
});

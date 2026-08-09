(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideIndexController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorSlideIndexController(options = {}) {
    let slideIndex = Number.isInteger(options.initialSlideIndex)
      ? options.initialSlideIndex
      : 0;

    return {
      getSlideIndex: () => slideIndex,
      setSlideIndex: (nextValue) => {
        slideIndex = nextValue;
        return slideIndex;
      }
    };
  }

  return { createStudioEditorSlideIndexController };
});

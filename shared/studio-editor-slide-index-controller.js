(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideIndexController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeSlideIndex(value, fallback = 0) {
    return Number.isInteger(value) && value >= 0 ? value : fallback;
  }

  function createStudioEditorSlideIndexController(options = {}) {
    let slideIndex = normalizeSlideIndex(options.initialSlideIndex);

    return {
      getSlideIndex: () => slideIndex,
      setSlideIndex: (nextValue) => {
        slideIndex = normalizeSlideIndex(nextValue, slideIndex);
        return slideIndex;
      }
    };
  }

  return { createStudioEditorSlideIndexController };
});

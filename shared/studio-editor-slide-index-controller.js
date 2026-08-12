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

  function normalizeSlideId(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function createStudioEditorSlideIndexController(options = {}) {
    let slideIndex = normalizeSlideIndex(options.initialSlideIndex);
    let slideId = normalizeSlideId(options.initialSlideId);

    return {
      getSlideIndex: () => slideIndex,
      setSlideIndex: (nextValue) => {
        slideIndex = normalizeSlideIndex(nextValue, slideIndex);
        return slideIndex;
      },
      getSlideId: () => slideId,
      setSlideId: (nextValue) => {
        slideId = normalizeSlideId(nextValue);
        return slideId;
      }
    };
  }

  return { createStudioEditorSlideIndexController };
});

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideCommands = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function prepareStudioSlideDuplication(sourceSlide, options = {}) {
    if (!sourceSlide || typeof sourceSlide.cloneNode !== 'function') {
      return null;
    }

    const sanitizeDuplicatedSubtree = typeof options.sanitizeDuplicatedSubtree === 'function'
      ? options.sanitizeDuplicatedSubtree
      : () => {};
    const assignSlideId = typeof options.assignSlideId === 'function'
      ? options.assignSlideId
      : null;
    if (!assignSlideId) return null;

    const duplicateSlide = sourceSlide.cloneNode(true);
    if (!duplicateSlide) return null;
    sanitizeDuplicatedSubtree(duplicateSlide);
    if (duplicateSlide.classList && typeof duplicateSlide.classList.remove === 'function') {
      duplicateSlide.classList.remove(options.activeClassName || 'slide-active');
    }

    const slideId = assignSlideId(duplicateSlide, { forceNew: true });
    if (typeof slideId !== 'string' || !slideId.trim()) return null;

    if (typeof options.makeElementsHoverable === 'function') {
      options.makeElementsHoverable(duplicateSlide);
    }

    return {
      slide: duplicateSlide,
      slideId
    };
  }

  return {
    prepareStudioSlideDuplication
  };
});

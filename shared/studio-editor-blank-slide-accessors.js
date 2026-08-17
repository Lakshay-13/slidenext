(function (root, factory) {
  let defaultBlankSlideAdapter = root && root.SlideNextStudioEditorBlankSlideAdapter;
  if (typeof module === 'object' && module.exports) {
    defaultBlankSlideAdapter = require('./studio-editor-blank-slide-adapter.js');
  }
  const api = factory(defaultBlankSlideAdapter);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorBlankSlideAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (defaultBlankSlideAdapter) {
  function resolveAdapter(options) {
    return Object.prototype.hasOwnProperty.call(options, 'blankSlideAdapter')
      ? options.blankSlideAdapter
      : defaultBlankSlideAdapter;
  }

  function createStudioEditorBlankSlideAccessors(options = {}) {
    const blankSlideAdapter = resolveAdapter(options);
    const domApi = options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
    const getDomOptions = typeof options.getDomOptions === 'function'
      ? options.getDomOptions
      : (overrides = {}) => overrides;

    return {
      createBlankSlide(doc, options = {}) {
        return blankSlideAdapter
          && typeof blankSlideAdapter.createStudioEditorBlankSlide === 'function'
          ? blankSlideAdapter.createStudioEditorBlankSlide(doc, {
              domApi,
              domOptions: getDomOptions(options)
            })
          : null;
      }
    };
  }

  return { createStudioEditorBlankSlideAccessors };
});

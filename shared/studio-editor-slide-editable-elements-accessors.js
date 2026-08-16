(function (root, factory) {
  let defaultSlideEditableElementsAdapter =
    root && root.SlideNextStudioEditorSlideEditableElementsAdapter;
  if (typeof module === 'object' && module.exports) {
    defaultSlideEditableElementsAdapter = require('./studio-editor-slide-editable-elements-adapter.js');
  }
  const api = factory(defaultSlideEditableElementsAdapter);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideEditableElementsAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  defaultSlideEditableElementsAdapter
) {
  function resolveAdapter(options) {
    return Object.prototype.hasOwnProperty.call(options, 'slideEditableElementsAdapter')
      ? options.slideEditableElementsAdapter
      : defaultSlideEditableElementsAdapter;
  }

  function createStudioEditorSlideEditableElementsAccessors(options = {}) {
    const slideEditableElementsAdapter = resolveAdapter(options);
    const domApi = options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
    const getDomOptions = typeof options.getDomOptions === 'function'
      ? options.getDomOptions
      : (overrides = {}) => overrides;

    return {
      getSlideEditableElements(slide, options = {}) {
        return slideEditableElementsAdapter
          && typeof slideEditableElementsAdapter
            .getStudioEditorSlideEditableElements === 'function'
          ? slideEditableElementsAdapter.getStudioEditorSlideEditableElements(slide, {
              domApi,
              domOptions: getDomOptions(options)
            })
          : [];
      }
    };
  }

  return { createStudioEditorSlideEditableElementsAccessors };
});

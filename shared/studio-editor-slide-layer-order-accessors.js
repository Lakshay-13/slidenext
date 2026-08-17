(function (root, factory) {
  let defaultSlideLayerOrderAdapter = root && root.SlideNextStudioEditorSlideLayerOrderAdapter;
  if (typeof module === 'object' && module.exports) {
    defaultSlideLayerOrderAdapter = require('./studio-editor-slide-layer-order-adapter.js');
  }
  const api = factory(defaultSlideLayerOrderAdapter);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideLayerOrderAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  defaultSlideLayerOrderAdapter
) {
  function resolveAdapter(options) {
    return Object.prototype.hasOwnProperty.call(options, 'slideLayerOrderAdapter')
      ? options.slideLayerOrderAdapter
      : defaultSlideLayerOrderAdapter;
  }

  function createStudioEditorSlideLayerOrderAccessors(options = {}) {
    const slideLayerOrderAdapter = resolveAdapter(options);
    const domApi = options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
    const getDomOptions = typeof options.getDomOptions === 'function'
      ? options.getDomOptions
      : (overrides = {}) => overrides;

    return {
      getNormalizedSlideLayerOrder(slide, options = {}) {
        return slideLayerOrderAdapter
          && typeof slideLayerOrderAdapter
            .getStudioEditorNormalizedSlideLayerOrder === 'function'
          ? slideLayerOrderAdapter.getStudioEditorNormalizedSlideLayerOrder(slide, {
              domApi,
              domOptions: getDomOptions(options)
            })
          : [];
      },
      applySlideLayerOrder(slide, orderedElements) {
        return slideLayerOrderAdapter
          && typeof slideLayerOrderAdapter.applyStudioEditorSlideLayerOrder === 'function'
          ? slideLayerOrderAdapter.applyStudioEditorSlideLayerOrder(slide, orderedElements, {
              domApi
            })
          : [];
      }
    };
  }

  return { createStudioEditorSlideLayerOrderAccessors };
});

(function (root, factory) {
  let defaultSlideMetricsAdapter = root && root.SlideNextStudioEditorSlideMetricsAdapter;
  let defaultRectOnSlideAdapter = root && root.SlideNextStudioEditorRectOnSlideAdapter;
  let defaultPointerOnSlideAdapter = root && root.SlideNextStudioEditorPointerOnSlideAdapter;
  if (typeof module === 'object' && module.exports) {
    defaultSlideMetricsAdapter = require('./studio-editor-slide-metrics-adapter.js');
    defaultRectOnSlideAdapter = require('./studio-editor-rect-on-slide-adapter.js');
    defaultPointerOnSlideAdapter = require('./studio-editor-pointer-on-slide-adapter.js');
  }
  const api = factory(
    defaultSlideMetricsAdapter,
    defaultRectOnSlideAdapter,
    defaultPointerOnSlideAdapter
  );
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGeometryAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  defaultSlideMetricsAdapter,
  defaultRectOnSlideAdapter,
  defaultPointerOnSlideAdapter
) {
  function resolveAdapter(options, key, fallback) {
    return Object.prototype.hasOwnProperty.call(options, key)
      ? options[key]
      : fallback;
  }

  function createStudioEditorGeometryAccessors(options = {}) {
    const slideMetricsAdapter = resolveAdapter(
      options,
      'slideMetricsAdapter',
      defaultSlideMetricsAdapter
    );
    const rectOnSlideAdapter = resolveAdapter(
      options,
      'rectOnSlideAdapter',
      defaultRectOnSlideAdapter
    );
    const pointerOnSlideAdapter = resolveAdapter(
      options,
      'pointerOnSlideAdapter',
      defaultPointerOnSlideAdapter
    );
    const transformApi = options.transformApi && typeof options.transformApi === 'object'
      ? options.transformApi
      : null;

    return {
      getSlideMetrics(slide) {
        return slideMetricsAdapter
          && typeof slideMetricsAdapter.getStudioEditorSlideMetrics === 'function'
          ? slideMetricsAdapter.getStudioEditorSlideMetrics(slide, { transformApi })
          : null;
      },
      getRectOnSlide(rect, slideMetrics) {
        return rectOnSlideAdapter
          && typeof rectOnSlideAdapter.getStudioEditorRectOnSlide === 'function'
          ? rectOnSlideAdapter.getStudioEditorRectOnSlide(rect, slideMetrics, { transformApi })
          : null;
      },
      getPointerOnSlide(event, slideMetrics) {
        return pointerOnSlideAdapter
          && typeof pointerOnSlideAdapter.getStudioEditorPointerOnSlide === 'function'
          ? pointerOnSlideAdapter.getStudioEditorPointerOnSlide(event, slideMetrics, { transformApi })
          : null;
      }
    };
  }

  return { createStudioEditorGeometryAccessors };
});

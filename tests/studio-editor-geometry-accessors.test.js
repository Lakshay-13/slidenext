const test = require('node:test');
const assert = require('node:assert/strict');

const geometryAccessors = require('../shared/studio-editor-geometry-accessors.js');

test('geometry accessors preserve adapter boundaries for slide reads', () => {
  const calls = [];
  const transformApi = { id: 'transform-api' };
  const slide = { id: 'slide-1' };
  const rect = { left: 10 };
  const event = { clientX: 20 };
  const metrics = { width: 1280 };
  const accessors = geometryAccessors.createStudioEditorGeometryAccessors({
    slideMetricsAdapter: {
      getStudioEditorSlideMetrics(slideValue, options) {
        calls.push(['metrics', slideValue, options]);
        return metrics;
      }
    },
    rectOnSlideAdapter: {
      getStudioEditorRectOnSlide(rectValue, metricsValue, options) {
        calls.push(['rect', rectValue, metricsValue, options]);
        return { left: 5 };
      }
    },
    pointerOnSlideAdapter: {
      getStudioEditorPointerOnSlide(eventValue, metricsValue, options) {
        calls.push(['pointer', eventValue, metricsValue, options]);
        return { x: 4, y: 6 };
      }
    },
    transformApi
  });

  assert.equal(accessors.getSlideMetrics(slide), metrics);
  assert.deepEqual(accessors.getRectOnSlide(rect, metrics), { left: 5 });
  assert.deepEqual(accessors.getPointerOnSlide(event, metrics), { x: 4, y: 6 });
  assert.deepEqual(calls, [
    ['metrics', slide, { transformApi }],
    ['rect', rect, metrics, { transformApi }],
    ['pointer', event, metrics, { transformApi }]
  ]);
});

test('geometry accessors fail closed when individual adapters are unavailable', () => {
  const accessors = geometryAccessors.createStudioEditorGeometryAccessors({
    slideMetricsAdapter: null,
    rectOnSlideAdapter: null,
    pointerOnSlideAdapter: null
  });

  assert.equal(accessors.getSlideMetrics({}), null);
  assert.equal(accessors.getRectOnSlide({}, {}), null);
  assert.equal(accessors.getPointerOnSlide({}, {}), null);
});

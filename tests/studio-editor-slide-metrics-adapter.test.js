const test = require('node:test');
const assert = require('node:assert/strict');

const slideMetricsAdapter = require('../shared/studio-editor-slide-metrics-adapter.js');

test('getStudioEditorSlideMetrics delegates slide metrics reading', () => {
  const slide = { id: 'slide-1' };
  const metrics = { logicalWidth: 1280, logicalHeight: 720 };
  let delegatedSlide = null;

  const result = slideMetricsAdapter.getStudioEditorSlideMetrics(slide, {
    transformApi: {
      getStudioSlideMetrics(currentSlide) {
        delegatedSlide = currentSlide;
        return metrics;
      }
    }
  });

  assert.equal(result, metrics);
  assert.equal(delegatedSlide, slide);
});

test('getStudioEditorSlideMetrics prefers an explicit reader', () => {
  const metrics = { logicalWidth: 1920, logicalHeight: 1080 };
  assert.equal(
    slideMetricsAdapter.getStudioEditorSlideMetrics({}, {
      transformApi: {
        getStudioSlideMetrics() {
          throw new Error('transform API fallback should not run');
        }
      },
      slideMetricsReader: () => metrics
    }),
    metrics
  );
});

test('getStudioEditorSlideMetrics fails closed without a reader', () => {
  assert.equal(slideMetricsAdapter.getStudioEditorSlideMetrics({}, {}), null);
});

const test = require('node:test');
const assert = require('node:assert/strict');

const rectOnSlideAdapter = require('../shared/studio-editor-rect-on-slide-adapter.js');

test('getStudioEditorRectOnSlide delegates rectangle and metrics', () => {
  const rect = { left: 10, top: 20, width: 40, height: 30 };
  const slideMetrics = { scaleX: 2, scaleY: 3 };
  const converted = { left: 5, top: 7, width: 20, height: 10 };
  let delegated = null;

  const result = rectOnSlideAdapter.getStudioEditorRectOnSlide(rect, slideMetrics, {
    transformApi: {
      getStudioRectOnSlide(rectValue, metricsValue) {
        delegated = { rectValue, metricsValue };
        return converted;
      }
    }
  });

  assert.equal(result, converted);
  assert.equal(delegated.rectValue, rect);
  assert.equal(delegated.metricsValue, slideMetrics);
});

test('getStudioEditorRectOnSlide prefers an explicit reader', () => {
  const converted = { left: 1, top: 2, width: 3, height: 4 };

  assert.equal(
    rectOnSlideAdapter.getStudioEditorRectOnSlide({}, {}, {
      transformApi: {
        getStudioRectOnSlide() {
          throw new Error('transform API fallback should not run');
        }
      },
      rectOnSlideReader: () => converted
    }),
    converted
  );
});

test('getStudioEditorRectOnSlide fails closed without a reader', () => {
  assert.equal(
    rectOnSlideAdapter.getStudioEditorRectOnSlide({}, {}),
    null
  );
});

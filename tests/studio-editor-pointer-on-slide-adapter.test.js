const test = require('node:test');
const assert = require('node:assert/strict');

const pointerOnSlideAdapter = require('../shared/studio-editor-pointer-on-slide-adapter.js');

test('getStudioEditorPointerOnSlide delegates event and metrics', () => {
  const event = { clientX: 110, clientY: 220 };
  const slideMetrics = { scaleX: 2, scaleY: 3 };
  const pointer = { x: 55, y: 73 };
  let delegated = null;

  const result = pointerOnSlideAdapter.getStudioEditorPointerOnSlide(event, slideMetrics, {
    transformApi: {
      getStudioPointerOnSlide(eventValue, metricsValue) {
        delegated = { eventValue, metricsValue };
        return pointer;
      }
    }
  });

  assert.equal(result, pointer);
  assert.equal(delegated.eventValue, event);
  assert.equal(delegated.metricsValue, slideMetrics);
});

test('getStudioEditorPointerOnSlide prefers an explicit reader', () => {
  const pointer = { x: 1, y: 2 };

  assert.equal(
    pointerOnSlideAdapter.getStudioEditorPointerOnSlide({}, {}, {
      transformApi: {
        getStudioPointerOnSlide() {
          throw new Error('transform API fallback should not run');
        }
      },
      pointerOnSlideReader: () => pointer
    }),
    pointer
  );
});

test('getStudioEditorPointerOnSlide fails closed without a reader', () => {
  assert.equal(
    pointerOnSlideAdapter.getStudioEditorPointerOnSlide({}, {}),
    null
  );
});

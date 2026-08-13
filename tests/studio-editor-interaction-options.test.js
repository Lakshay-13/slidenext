const test = require('node:test');
const assert = require('node:assert/strict');

const interactionOptions = require('../shared/studio-editor-interaction-options.js');

test('interaction defaults provide one stable source for editor geometry thresholds', () => {
  assert.equal(interactionOptions.DEFAULT_DRAG_START_THRESHOLD_PX, 4);
  assert.equal(interactionOptions.DEFAULT_SNAP_THRESHOLD_PX, 12);
  assert.equal(interactionOptions.DEFAULT_MIN_ELEMENT_SIZE_PX, 24);
  assert.equal(interactionOptions.DEFAULT_DRAG_OVERFLOW_MARGIN_PX, 280);
});

test('buildStudioTransformInteractionOptions delegates snap targets and preserves overrides', () => {
  const slide = { id: 'slide-1' };
  const snapCalls = [];
  const snapTargets = [{ left: 10, top: 20, right: 30, bottom: 40 }];
  const options = interactionOptions.buildStudioTransformInteractionOptions({
    transformApi: {
      buildStudioTransformSnapTargets(...args) {
        snapCalls.push(args);
        return snapTargets;
      }
    },
    getSlideEditableElements() {
      return [];
    },
    isHidden() {
      return false;
    },
    getRectOnSlide() {},
    getGridSizePx() {
      return 12;
    },
    snapEnabled: false,
    onSessionFinalize() {}
  }, {
    marker: 'override'
  });

  assert.deepEqual(options.getSnapTargets(slide, ['element'], { scaleX: 1 }), snapTargets);
  assert.deepEqual(snapCalls, [[slide, ['element'], {
    slideMetrics: { scaleX: 1 },
    getSlideEditableElements: options.getSnapTargets ? snapCalls[0][2].getSlideEditableElements : null,
    isHidden: snapCalls[0][2].isHidden,
    getRectOnSlide: snapCalls[0][2].getRectOnSlide
  }]]);
  assert.equal(options.getGridSizePx(), 12);
  assert.equal(options.snapEnabled, false);
  assert.equal(options.onSessionFinalize instanceof Function, true);
  assert.equal(options.marker, 'override');
});

test('buildStudioTransformInteractionOptions keeps the legacy snap fallback', () => {
  const selected = { id: 'selected' };
  const visible = {
    getBoundingClientRect() {
      return { left: 1, top: 2, right: 31, bottom: 42 };
    }
  };
  const hidden = {
    getBoundingClientRect() {
      throw new Error('hidden elements must not be measured');
    }
  };
  const options = interactionOptions.buildStudioTransformInteractionOptions({
    getSlideEditableElements() {
      return [selected, visible, hidden];
    },
    isHidden(element) {
      return element === hidden;
    },
    getRectOnSlide(rect, slideMetrics) {
      return { ...rect, slideMetrics };
    }
  });

  assert.deepEqual(options.getSnapTargets({}, [selected], { scaleX: 2 }), [{
    left: 1,
    top: 2,
    right: 31,
    bottom: 42,
    slideMetrics: { scaleX: 2 }
  }]);
});

test('buildStudioMarqueeInteractionOptions delegates selection bounds and applies overrides', () => {
  const selected = ['existing'];
  const selectionCalls = [];
  const options = interactionOptions.buildStudioMarqueeInteractionOptions({
    selectionBoundsApi: {
      getStudioMarqueeSelection(...args) {
        selectionCalls.push(args);
        return ['marquee'];
      }
    },
    getMarqueeElements() {
      return ['element'];
    },
    isHidden() {
      return false;
    },
    getRectOnSlide(rect, slideMetrics) {
      return { rect, slideMetrics };
    },
    getSelectedElements() {
      return selected;
    }
  }, {
    marker: 'override'
  });
  const session = { slideMetrics: { scaleX: 1 } };
  const element = {
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 10, bottom: 10 };
    }
  };

  assert.deepEqual(options.getMarqueeSelection([element], { left: 0 }, session), ['marquee']);
  assert.deepEqual(selectionCalls[0][0], [element]);
  assert.deepEqual(selectionCalls[0][1], { left: 0 });
  assert.deepEqual(options.getSelectedElements(), selected);
  assert.equal(options.marker, 'override');
});

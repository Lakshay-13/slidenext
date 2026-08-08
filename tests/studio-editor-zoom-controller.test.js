const test = require('node:test');
const assert = require('node:assert/strict');

const zoomController = require('../shared/studio-editor-zoom-controller.js');

test('zoom controller applies zoom and syncs rulers', () => {
  const calls = [];
  const controls = {
    zoomSelect: { value: '1.0' },
    canvasStage: { clientWidth: 1400, clientHeight: 900 },
    canvasScrollContainer: { style: {} },
    canvasWrapper: { style: {} }
  };
  const documentRef = {
    getElementById(id) {
      return controls[id] || null;
    }
  };
  let zoomFactor = 1;
  const controller = zoomController.createStudioEditorZoomController({
    zoomApi: {
      applyStudioZoom(options) {
        calls.push(['apply', options.scaleVal, options.zoomFactor]);
        return { didApply: true, zoomFactor: 1.2 };
      }
    },
    rulerViewApi: {
      syncStudioCanvasRulers(options) {
        calls.push(['rulers', options.zoomFactor]);
        return true;
      }
    },
    documentRef,
    localStorageRef: {
      setItem(key, value) {
        calls.push(['storage', key, value]);
      }
    },
    getZoomFactor: () => zoomFactor,
    setZoomFactor: (nextZoomFactor) => {
      zoomFactor = nextZoomFactor;
    }
  });

  const result = controller.apply('1.2');

  assert.deepEqual(result, { didApply: true, zoomFactor: 1.2 });
  assert.equal(zoomFactor, 1.2);
  assert.deepEqual(calls, [
    ['apply', '1.2', 1],
    ['rulers', 1.2]
  ]);
});

test('zoom controller gates controls and delegates deterministic steps', () => {
  const select = { value: '1.0' };
  const applied = [];
  const controller = zoomController.createStudioEditorZoomController({
    zoomApi: {
      resolveStudioZoomControlStep(options) {
        return options.direction === 'in' ? 1.05 : 0.95;
      }
    },
    documentRef: {
      getElementById(id) {
        return id === 'zoomSelect' ? select : null;
      }
    },
    resolveActionState: () => ({ canUseZoomControls: true }),
    applyZoom: (value) => applied.push(value)
  });

  assert.equal(controller.zoomIn(), true);
  assert.equal(controller.zoomOut(), true);
  assert.equal(controller.zoomSelectChange('1.2'), true);
  assert.deepEqual(applied, ['1.05', '0.95', '1.2']);
});

test('zoom controller fails closed when controls are unavailable', () => {
  const controller = zoomController.createStudioEditorZoomController({
    resolveActionState: () => ({ canUseZoomControls: false })
  });

  assert.equal(controller.zoomIn(), false);
  assert.equal(controller.zoomOut(), false);
  assert.equal(controller.zoomSelectChange('1.2'), false);
  assert.equal(controller.syncRulers(), false);
  assert.deepEqual(controller.apply('fit'), { didApply: false, zoomFactor: 1 });
});

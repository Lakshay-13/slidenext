const test = require('node:test');
const assert = require('node:assert/strict');

const zoom = require('../shared/studio-editor-zoom.js');

test('applyStudioZoom applies fit dimensions and persists the requested mode', () => {
  const nodes = {
    canvasStage: { clientWidth: 1400, clientHeight: 900 },
    canvasScrollContainer: { style: {} },
    canvasWrapper: { style: {} },
    zoomSelect: { value: '' }
  };
  const storageCalls = [];
  const result = zoom.applyStudioZoom({
    documentRef: { getElementById: id => nodes[id] || null },
    localStorageRef: {
      setItem(...args) {
        storageCalls.push(args);
      }
    },
    scaleVal: 'fit',
    zoomFactor: 1
  });

  assert.equal(result.didApply, true);
  assert.ok(result.zoomFactor >= 0.15 && result.zoomFactor <= 1.5);
  assert.equal(nodes.zoomSelect.value, 'fit');
  assert.equal(nodes.canvasScrollContainer.style.width, `${1920 * result.zoomFactor}px`);
  assert.equal(nodes.canvasScrollContainer.style.height, `${1080 * result.zoomFactor}px`);
  assert.match(nodes.canvasWrapper.style.transform, /scale\(/);
  assert.deepEqual(storageCalls, [['presentationZoom', 'fit']]);
});

test('applyStudioZoom rejects invalid values and missing canvas nodes safely', () => {
  assert.deepEqual(zoom.applyStudioZoom({
    documentRef: { getElementById: () => null },
    scaleVal: '1'
  }), { didApply: false, zoomFactor: undefined });

  const nodes = {
    canvasStage: { clientWidth: 100, clientHeight: 100 },
    canvasScrollContainer: { style: {} },
    canvasWrapper: { style: {} },
    zoomSelect: { value: '' }
  };
  assert.deepEqual(zoom.applyStudioZoom({
    documentRef: { getElementById: id => nodes[id] || null },
    scaleVal: 'not-a-number',
    zoomFactor: 0.5
  }), { didApply: false, zoomFactor: 0.5 });
});

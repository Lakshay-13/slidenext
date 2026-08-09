const test = require('node:test');
const assert = require('node:assert/strict');

const gridSnapController = require('../shared/studio-editor-grid-snap-controller.js');

test('grid snap controller owns state, renders it, and exposes the active grid size', () => {
  const calls = [];
  const documentRef = {};
  const controller = gridSnapController.createStudioEditorGridSnapController({
    documentRef,
    gridSizePx: 24,
    gridSnapView: {
      syncStudioGridSnapState(options) {
        calls.push(options);
        return true;
      }
    }
  });

  assert.equal(controller.isEnabled(), false);
  assert.equal(controller.getGridSizePx(), null);
  assert.equal(controller.sync(), true);
  assert.equal(controller.toggle(), true);
  assert.equal(controller.isEnabled(), true);
  assert.equal(controller.getGridSizePx(), 24);
  assert.deepEqual(calls, [
    { documentRef, isEnabled: false },
    { documentRef, isEnabled: true }
  ]);
});

test('grid snap controller preserves state changes when the view is unavailable', () => {
  const controller = gridSnapController.createStudioEditorGridSnapController({
    gridSizePx: 16,
    gridSnapView: null
  });

  assert.equal(controller.sync(), false);
  assert.equal(controller.toggle(), true);
  assert.equal(controller.getGridSizePx(), 16);
});

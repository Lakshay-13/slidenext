const test = require('node:test');
const assert = require('node:assert/strict');

const runtimeOptions = require('../shared/studio-editor-zoom-runtime-options.js');

test('zoom runtime options preserves injected dependencies and callbacks', () => {
  const dependencies = {
    controllerApi: {},
    zoomApi: {},
    rulerViewApi: {}
  };
  const callbacks = {
    documentRef: {},
    localStorageRef: {},
    initialZoomFactor: 1,
    resolveActionState() {},
    getZoomFactor() {},
    setZoomFactor() {},
    applyZoom() {}
  };

  const result = runtimeOptions.createStudioEditorZoomRuntimeOptions({
    ...dependencies,
    ...callbacks
  });

  assert.deepEqual(result, {
    ...dependencies,
    ...callbacks
  });
});

test('zoom runtime options keeps explicit null dependencies as fail-closed overrides', () => {
  const result = runtimeOptions.createStudioEditorZoomRuntimeOptions({
    controllerApi: null,
    zoomApi: null,
    rulerViewApi: null
  });

  assert.equal(result.controllerApi, null);
  assert.equal(result.zoomApi, null);
  assert.equal(result.rulerViewApi, null);
});

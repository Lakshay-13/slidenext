const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const layerOrderStateShellRuntime = require('../shared/studio-editor-layer-order-state-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('layer-order state shell runtime forwards z-order state callbacks', () => {
  let receivedOptions = null;
  const controller = { buildActionState() {} };
  const layerOrderStateApi = {
    createStudioEditorLayerOrderStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const options = {
    layerOrderStateApi,
    layerOrderApi: { name: 'layer-order' },
    getDocument: () => null,
    getSelectedElements: () => [],
    getActiveSlide: () => null,
    getNormalizedSlideLayerOrder: () => [],
    getLockedState: () => () => false
  };

  const runtime = layerOrderStateShellRuntime
    .createStudioEditorLayerOrderStateShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.layerOrderStateController, controller);
  assert.equal(receivedOptions.layerOrderApi, options.layerOrderApi);
  assert.equal(receivedOptions.getDocument, options.getDocument);
  assert.equal(receivedOptions.getSelectedElements, options.getSelectedElements);
  assert.equal(receivedOptions.getActiveSlide, options.getActiveSlide);
  assert.equal(
    receivedOptions.getNormalizedSlideLayerOrder,
    options.getNormalizedSlideLayerOrder
  );
  assert.equal(receivedOptions.getLockedState, options.getLockedState);
});

test('layer-order state shell runtime fails closed when the shared state API is unavailable', () => {
  const runtime = layerOrderStateShellRuntime
    .createStudioEditorLayerOrderStateShellRuntime({ layerOrderStateApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.layerOrderStateController, null);
});

test('index routes layer-order state construction through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-layer-order-state-shell-runtime\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorLayerOrderStateShellRuntimeApi/);
  assert.match(fileContent, /createStudioEditorLayerOrderStateShellRuntime/);
  assert.match(
    fileContent,
    /studioEditorLayerOrderStateController = studioEditorLayerOrderStateShellRuntime/
  );
});

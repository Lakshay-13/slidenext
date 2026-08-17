const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const accessors = require('../shared/studio-editor-layer-order-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('layer order runtime accessors delegate shell composition without mutating options', () => {
  let receivedOptions = null;
  const runtimeValue = { name: 'layer-order-runtime' };
  const runtimeApi = {
    createStudioEditorLayerOrderShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const layerOrderRuntimeApi = { name: 'layer-order-runtime-api' };
  const runtimeOptions = {
    controllerApi: { name: 'controller' },
    getActiveSlide: () => null
  };

  const result = accessors.createStudioEditorLayerOrderRuntimeAccessors({
    runtimeApi,
    layerOrderRuntimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.deepEqual(receivedOptions, {
    ...runtimeOptions,
    layerOrderRuntimeApi
  });
  assert.deepEqual(runtimeOptions, {
    controllerApi: { name: 'controller' },
    getActiveSlide: runtimeOptions.getActiveSlide
  });
});

test('layer order runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorLayerOrderRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorLayerOrderRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});

test('index wires layer order runtime through the accessor module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-layer-order-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-layer-order-shell-composition\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorLayerOrderShellCompositionApi\s*\.\s*createStudioEditorLayerOrderShellComposition\(/
  );
  assert.match(
    fileContent,
    /studioEditorLayerOrderRuntime = studioEditorLayerOrderShellComposition/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorLayerOrderShellRuntime\.createStudioEditorLayerOrderShellRuntime\(/
  );
});

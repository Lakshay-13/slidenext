const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const composition = require('../shared/studio-editor-zoom-shell-composition.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('zoom shell composition wires runtime, controls, and global API', () => {
  const runtimeOptions = { kind: 'runtime-options' };
  const runtime = { zoomController: { id: 'zoom-controller' } };
  const runtimeAccessors = { runtime };
  const accessors = {
    bindStudioEditorZoomControls(options) {
      this.bindingOptions = options;
    }
  };
  const globalApi = { zoomIn() {} };
  let runtimeOptionsInput = null;
  let runtimeAccessorsInput = null;
  let accessorsInput = null;
  let globalInput = null;
  const documentRef = { id: 'document' };

  const result = composition.createStudioEditorZoomShellComposition({
    runtimeOptionsApi: {
      createStudioEditorZoomRuntimeOptions(options) {
        runtimeOptionsInput = options;
        return runtimeOptions;
      }
    },
    runtimeAccessorsApi: {
      createStudioEditorZoomRuntimeAccessors(options) {
        runtimeAccessorsInput = options;
        return runtimeAccessors;
      }
    },
    runtimeApi: { id: 'shell-runtime' },
    zoomRuntimeApi: { id: 'zoom-runtime' },
    accessorsApi: {
      createStudioEditorZoomAccessors(options) {
        accessorsInput = options;
        return accessors;
      },
      createStudioEditorZoomGlobalApi(options) {
        globalInput = options;
        return globalApi;
      }
    },
    documentRef,
    localStorageRef: { id: 'storage' },
    initialZoomFactor: 1,
    resolveActionState: () => ({ ready: true })
  });

  assert.equal(result.runtimeOptions, runtimeOptions);
  assert.equal(result.runtimeAccessors, runtimeAccessors);
  assert.equal(result.runtime, runtime);
  assert.equal(result.zoomController, runtime.zoomController);
  assert.equal(result.accessors, accessors);
  assert.equal(result.globalApi, globalApi);
  assert.equal(runtimeOptionsInput.documentRef, documentRef);
  assert.equal(runtimeOptionsInput.initialZoomFactor, 1);
  assert.equal(runtimeAccessorsInput.runtimeApi.id, 'shell-runtime');
  assert.equal(runtimeAccessorsInput.zoomRuntimeApi.id, 'zoom-runtime');
  assert.equal(runtimeAccessorsInput.runtimeOptions, runtimeOptions);
  assert.equal(accessorsInput.zoomController, runtime.zoomController);
  assert.equal(accessors.bindingOptions.documentRef, documentRef);
  assert.equal(globalInput.accessors, accessors);
});

test('zoom shell composition fails closed when shared factories are unavailable', () => {
  const result = composition.createStudioEditorZoomShellComposition({
    runtimeOptionsApi: null,
    runtimeAccessorsApi: null,
    accessorsApi: null
  });

  assert.deepEqual(result, {
    runtimeOptions: null,
    runtimeAccessors: null,
    runtime: null,
    zoomController: null,
    accessors: null,
    globalApi: {}
  });
});

test('index routes zoom assembly through the shell composition', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const accessorsScriptIndex = source.indexOf(
    '<script src="/shared/studio-editor-zoom-accessors.js"></script>'
  );
  const compositionScriptIndex = source.indexOf(
    '<script src="/shared/studio-editor-zoom-shell-composition.js"></script>'
  );

  assert.ok(accessorsScriptIndex >= 0);
  assert.ok(compositionScriptIndex > accessorsScriptIndex);
  assert.match(source, /studioEditorZoomShellCompositionApi/);
  assert.match(source, /createStudioEditorZoomShellComposition/);
  assert.doesNotMatch(
    source,
    /studioEditorZoomRuntimeOptionsApi\.createStudioEditorZoomRuntimeOptions\(/
  );
  assert.doesNotMatch(
    source,
    /studioEditorZoomRuntimeAccessorsApi\s*\.\s*createStudioEditorZoomRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    source,
    /SlideNextStudioEditorZoomAccessors\.createStudioEditorZoomAccessors\(/
  );
  assert.doesNotMatch(
    source,
    /SlideNextStudioEditorZoomAccessors\.createStudioEditorZoomGlobalApi\(/
  );
});

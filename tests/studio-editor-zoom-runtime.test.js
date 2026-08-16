const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const zoomRuntime = require('../shared/studio-editor-zoom-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('zoom runtime composes zoom and ruler dependencies without changing them', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorZoomController(options) {
      calls.push(options);
      return { name: 'zoom' };
    }
  };
  const options = {
    controllerApi,
    zoomApi: {},
    rulerViewApi: {},
    documentRef: {},
    localStorageRef: {},
    initialZoomFactor: 1,
    resolveActionState: () => ({ canUseZoomControls: true }),
    getZoomFactor: () => 1,
    setZoomFactor: () => {},
    applyZoom: () => {}
  };

  assert.deepEqual(
    zoomRuntime.createStudioEditorZoomRuntime(options),
    { zoomController: { name: 'zoom' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].zoomApi, options.zoomApi);
  assert.equal(calls[0].rulerViewApi, options.rulerViewApi);
  assert.equal(calls[0].documentRef, options.documentRef);
  assert.equal(calls[0].localStorageRef, options.localStorageRef);
  assert.equal(calls[0].resolveActionState, options.resolveActionState);
});

test('index wires zoom behavior through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-zoom-runtime-options\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorZoomRuntimeOptionsApi\.createStudioEditorZoomRuntimeOptions\(/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-zoom-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-zoom-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-zoom-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /createStudioEditorZoomRuntimeAccessors\(/
  );
  assert.match(
    fileContent,
    /studioEditorZoomRuntime = studioEditorZoomRuntimeAccessors/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorZoomShellRuntime\.createStudioEditorZoomShellRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorZoomController\.createStudioEditorZoomController\(/
  );
});

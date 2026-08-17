const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const gridSnapRuntime = require('../shared/studio-editor-grid-snap-runtime.js');
const gridSnapRuntimeAccessors = require('../shared/studio-editor-grid-snap-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('grid snap runtime accessors delegate to the shell runtime', () => {
  const runtime = { name: 'grid-snap-shell' };
  let receivedOptions = null;
  const shellRuntimeApi = {
    createStudioEditorGridSnapShellRuntime(options) {
      receivedOptions = options;
      return runtime;
    }
  };
  const gridSnapRuntimeApi = { name: 'grid-snap-runtime' };
  const gridSnapView = { name: 'grid-snap-view' };

  const result = gridSnapRuntimeAccessors.createStudioEditorGridSnapRuntimeAccessors({
    runtimeApi: shellRuntimeApi,
    gridSnapRuntimeApi,
    runtimeOptions: { gridSnapView }
  });

  assert.deepEqual(result, { runtime });
  assert.equal(receivedOptions.gridSnapRuntimeApi, gridSnapRuntimeApi);
  assert.equal(receivedOptions.gridSnapView, gridSnapView);
});

test('grid snap runtime accessors fail closed without a shell runtime', () => {
  assert.deepEqual(
    gridSnapRuntimeAccessors.createStudioEditorGridSnapRuntimeAccessors({
      runtimeApi: null
    }),
    { runtime: null }
  );
});

test('grid snap runtime composes controller dependencies without changing them', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorGridSnapController(options) {
      calls.push(options);
      return { name: 'grid-snap' };
    }
  };
  const options = {
    controllerApi,
    gridSnapView: {},
    documentRef: {},
    gridSizePx: 24,
    initiallyEnabled: true
  };

  assert.deepEqual(
    gridSnapRuntime.createStudioEditorGridSnapRuntime(options),
    { gridSnapController: { name: 'grid-snap' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].gridSnapView, options.gridSnapView);
  assert.equal(calls[0].documentRef, options.documentRef);
  assert.equal(calls[0].gridSizePx, options.gridSizePx);
  assert.equal(calls[0].initiallyEnabled, options.initiallyEnabled);
});

test('index wires grid snap state through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-grid-snap-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-grid-snap-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-grid-snap-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorGridSnapShellCompositionApi\s*\.\s*createStudioEditorGridSnapShellComposition\(/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-grid-snap-shell-composition\.js"><\/script>/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorGridSnapShellRuntime\.createStudioEditorGridSnapShellRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorGridSnapController\.createStudioEditorGridSnapController\(/
  );
});

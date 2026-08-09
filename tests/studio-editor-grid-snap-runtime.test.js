const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const gridSnapRuntime = require('../shared/studio-editor-grid-snap-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

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
    /SlideNextStudioEditorGridSnapRuntime\.createStudioEditorGridSnapRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorGridSnapController\.createStudioEditorGridSnapController\(/
  );
});

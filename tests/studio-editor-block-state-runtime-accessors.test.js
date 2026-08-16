const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const accessors = require('../shared/studio-editor-block-state-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('block state accessors delegate construction and preserve runtime options', () => {
  let receivedOptions = null;
  const controller = { sync() {} };
  const runtimeApi = {
    createStudioEditorBlockStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const runtimeOptions = {
    blockView: { name: 'block-view' },
    getDocument: () => null
  };

  const result = accessors.createStudioEditorBlockStateRuntimeAccessors({ runtimeApi });

  assert.equal(
    result.createStudioEditorBlockStateController(runtimeOptions),
    controller
  );
  assert.equal(receivedOptions, runtimeOptions);
});

test('block state accessors fail closed without a controller factory', () => {
  const result = accessors.createStudioEditorBlockStateRuntimeAccessors({ runtimeApi: {} });

  assert.equal(result.createStudioEditorBlockStateController(), null);
});

test('index routes block state construction through the accessor module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-block-state-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /blockStateRuntimeAccessors\s*\.\s*createStudioEditorBlockStateController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorBlockState\.createStudioEditorBlockStateController\(/
  );
});

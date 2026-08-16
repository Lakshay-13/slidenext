const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const accessors = require('../shared/studio-editor-asset-state-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('asset state accessors delegate construction and preserve runtime options', () => {
  let receivedOptions = null;
  const controller = { sync() {} };
  const runtimeApi = {
    createStudioEditorAssetStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const runtimeOptions = {
    assetView: { name: 'asset-view' },
    getDocument: () => null
  };

  const result = accessors.createStudioEditorAssetStateRuntimeAccessors({ runtimeApi });

  assert.equal(
    result.createStudioEditorAssetStateController(runtimeOptions),
    controller
  );
  assert.equal(receivedOptions, runtimeOptions);
});

test('asset state accessors fail closed without a controller factory', () => {
  const result = accessors.createStudioEditorAssetStateRuntimeAccessors({ runtimeApi: {} });

  assert.equal(result.createStudioEditorAssetStateController(), null);
});

test('index routes asset state construction through the accessor module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-asset-state-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /assetStateRuntimeAccessors\s*\.\s*createStudioEditorAssetStateController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorAssetState\.createStudioEditorAssetStateController\(/
  );
});

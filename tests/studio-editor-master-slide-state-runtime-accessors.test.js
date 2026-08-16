const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const accessors = require('../shared/studio-editor-master-slide-state-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('master slide state accessors delegate construction and preserve runtime options', () => {
  let receivedOptions = null;
  const controller = { sync() {} };
  const runtimeApi = {
    createStudioEditorMasterSlideStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const runtimeOptions = {
    masterSlideView: { name: 'master-slide-view' },
    getDocument: () => null
  };

  const result = accessors.createStudioEditorMasterSlideStateRuntimeAccessors({ runtimeApi });

  assert.equal(
    result.createStudioEditorMasterSlideStateController(runtimeOptions),
    controller
  );
  assert.equal(receivedOptions, runtimeOptions);
});

test('master slide state accessors fail closed without a controller factory', () => {
  const result = accessors.createStudioEditorMasterSlideStateRuntimeAccessors({ runtimeApi: {} });

  assert.equal(result.createStudioEditorMasterSlideStateController(), null);
});

test('index routes master slide state construction through the accessor module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-master-slide-state-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /masterSlideStateRuntimeAccessors\s*\.\s*createStudioEditorMasterSlideStateController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorMasterSlideState\.createStudioEditorMasterSlideStateController\(/
  );
});

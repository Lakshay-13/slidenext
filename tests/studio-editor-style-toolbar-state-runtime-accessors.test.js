const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const accessors = require('../shared/studio-editor-style-toolbar-state-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('style toolbar state accessors delegate construction and preserve runtime options', () => {
  let receivedOptions = null;
  const controller = { sync() {} };
  const runtimeApi = {
    createStudioEditorStyleToolbarStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const runtimeOptions = {
    styleView: { name: 'style-view' },
    getDocument: () => null
  };

  const result = accessors.createStudioEditorStyleToolbarStateRuntimeAccessors({ runtimeApi });

  assert.equal(
    result.createStudioEditorStyleToolbarStateController(runtimeOptions),
    controller
  );
  assert.equal(receivedOptions, runtimeOptions);
});

test('style toolbar state accessors fail closed without a controller factory', () => {
  const result = accessors.createStudioEditorStyleToolbarStateRuntimeAccessors({ runtimeApi: {} });

  assert.equal(result.createStudioEditorStyleToolbarStateController(), null);
});

test('index routes style toolbar state construction through the accessor module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-style-toolbar-state-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /styleToolbarStateRuntimeAccessors\s*\.\s*createStudioEditorStyleToolbarStateController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorStyleToolbarState\.createStudioEditorStyleToolbarStateController\(/
  );
});

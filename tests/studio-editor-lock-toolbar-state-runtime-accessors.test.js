const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const accessors = require('../shared/studio-editor-lock-toolbar-state-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('lock toolbar state accessors delegate construction and preserve runtime options', () => {
  let receivedOptions = null;
  const controller = { sync() {} };
  const runtimeApi = {
    createStudioEditorLockToolbarStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const runtimeOptions = {
    lockView: { name: 'lock-view' },
    getDocument: () => null
  };

  const result = accessors.createStudioEditorLockToolbarStateRuntimeAccessors({ runtimeApi });

  assert.equal(
    result.createStudioEditorLockToolbarStateController(runtimeOptions),
    controller
  );
  assert.equal(receivedOptions, runtimeOptions);
});

test('lock toolbar state accessors fail closed without a controller factory', () => {
  const result = accessors.createStudioEditorLockToolbarStateRuntimeAccessors({ runtimeApi: {} });

  assert.equal(result.createStudioEditorLockToolbarStateController(), null);
});

test('index routes lock toolbar state construction through the accessor module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-lock-toolbar-state-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorLockToolbarStateRuntimeAccessors\s*\.\s*createStudioEditorLockToolbarStateController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorLockToolbarState\.createStudioEditorLockToolbarStateController\(/
  );
});

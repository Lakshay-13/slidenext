const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const accessors = require('../shared/studio-editor-clipboard-state-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('clipboard state accessors delegate construction and preserve runtime options', () => {
  let receivedOptions = null;
  const controller = { sync() {} };
  const runtimeApi = {
    createStudioEditorClipboardStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const runtimeOptions = {
    clipboardView: { name: 'clipboard-view' },
    getDocument: () => null
  };

  const result = accessors.createStudioEditorClipboardStateRuntimeAccessors({ runtimeApi });

  assert.equal(
    result.createStudioEditorClipboardStateController(runtimeOptions),
    controller
  );
  assert.equal(receivedOptions, runtimeOptions);
});

test('clipboard state accessors fail closed without a controller factory', () => {
  const result = accessors.createStudioEditorClipboardStateRuntimeAccessors({ runtimeApi: {} });

  assert.equal(result.createStudioEditorClipboardStateController(), null);
});

test('index routes clipboard state construction through the accessor module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-clipboard-state-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /clipboardStateRuntimeAccessors\s*\.\s*createStudioEditorClipboardStateController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorClipboardState\.createStudioEditorClipboardStateController\(/
  );
});

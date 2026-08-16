const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const accessors = require('../shared/studio-editor-visibility-toolbar-state-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('visibility toolbar state accessors delegate construction and preserve runtime options', () => {
  let receivedOptions = null;
  const controller = { sync() {} };
  const runtimeApi = {
    createStudioEditorVisibilityToolbarStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const runtimeOptions = {
    visibilityView: { name: 'visibility-view' },
    getDocument: () => null
  };

  const result = accessors.createStudioEditorVisibilityToolbarStateRuntimeAccessors({ runtimeApi });

  assert.equal(
    result.createStudioEditorVisibilityToolbarStateController(runtimeOptions),
    controller
  );
  assert.equal(receivedOptions, runtimeOptions);
});

test('visibility toolbar state accessors fail closed without a controller factory', () => {
  const result = accessors.createStudioEditorVisibilityToolbarStateRuntimeAccessors({ runtimeApi: {} });

  assert.equal(result.createStudioEditorVisibilityToolbarStateController(), null);
});

test('index routes visibility toolbar state construction through the accessor module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-visibility-toolbar-state-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /visibilityToolbarStateRuntimeAccessors\s*\.\s*createStudioEditorVisibilityToolbarStateController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorVisibilityToolbarState\.createStudioEditorVisibilityToolbarStateController\(/
  );
});

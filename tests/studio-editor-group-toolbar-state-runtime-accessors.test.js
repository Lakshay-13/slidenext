const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const accessors = require('../shared/studio-editor-group-toolbar-state-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('group toolbar state accessors delegate construction and preserve runtime options', () => {
  let receivedOptions = null;
  const controller = { sync() {} };
  const runtimeApi = {
    createStudioEditorGroupToolbarStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const runtimeOptions = { groupView: { name: 'group-view' } };
  const result = accessors.createStudioEditorGroupToolbarStateRuntimeAccessors({ runtimeApi });

  assert.equal(
    result.createStudioEditorGroupToolbarStateController(runtimeOptions),
    controller
  );
  assert.equal(receivedOptions, runtimeOptions);
});

test('index routes group toolbar state construction through the accessor module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-group-toolbar-state-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /groupToolbarStateRuntimeAccessors\s*\.\s*createStudioEditorGroupToolbarStateController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorGroupToolbarState\.createStudioEditorGroupToolbarStateController\(/
  );
});

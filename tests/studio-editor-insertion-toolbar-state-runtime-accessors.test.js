const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const accessors = require('../shared/studio-editor-insertion-toolbar-state-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('insertion toolbar state accessors delegate construction and preserve runtime options', () => {
  let receivedOptions = null;
  const controller = { sync() {} };
  const runtimeApi = {
    createStudioEditorInsertionToolbarStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const runtimeOptions = { deckView: { name: 'deck-view' } };
  const result = accessors.createStudioEditorInsertionToolbarStateRuntimeAccessors({ runtimeApi });

  assert.equal(
    result.createStudioEditorInsertionToolbarStateController(runtimeOptions),
    controller
  );
  assert.equal(receivedOptions, runtimeOptions);
});

test('index routes insertion toolbar state construction through the accessor module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-insertion-toolbar-state-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /insertionToolbarStateRuntimeAccessors\s*\.\s*createStudioEditorInsertionToolbarStateController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorInsertionToolbarState\.createStudioEditorInsertionToolbarStateController\(/
  );
});

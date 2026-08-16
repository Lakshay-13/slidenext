const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const accessors = require('../shared/studio-editor-zoom-toolbar-state-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('zoom toolbar state accessors delegate construction and preserve runtime options', () => {
  let receivedOptions = null;
  const controller = { sync() {} };
  const runtimeApi = {
    createStudioEditorZoomToolbarStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const runtimeOptions = { deckView: { name: 'deck-view' } };
  const result = accessors.createStudioEditorZoomToolbarStateRuntimeAccessors({ runtimeApi });

  assert.equal(
    result.createStudioEditorZoomToolbarStateController(runtimeOptions),
    controller
  );
  assert.equal(receivedOptions, runtimeOptions);
});

test('index routes zoom toolbar state construction through the accessor module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-zoom-toolbar-state-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /zoomToolbarStateRuntimeAccessors\s*\.\s*createStudioEditorZoomToolbarStateController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorZoomToolbarState\.createStudioEditorZoomToolbarStateController\(/
  );
});

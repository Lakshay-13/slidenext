const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const selectionRuntime = require('../shared/studio-editor-clipboard-selection-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('clipboard selection runtime composes lock and payload dependencies', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorClipboardSelectionController(options) {
      calls.push(options);
      return { name: 'clipboard-selection' };
    }
  };
  const options = {
    controllerApi,
    clipboardApi: {},
    getIframeDoc: () => null,
    getActiveSlide: () => null,
    getSelectedElements: () => [],
    getClipboard: () => null,
    isElementLocked: () => false,
    getCanonicalVisibilityReader: () => null,
    buildPayload: () => []
  };

  assert.deepEqual(
    selectionRuntime.createStudioEditorClipboardSelectionRuntime(options),
    { selectionController: { name: 'clipboard-selection' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].getSelectedElements, options.getSelectedElements);
  assert.equal(calls[0].getClipboard, options.getClipboard);
  assert.equal(calls[0].getCanonicalVisibilityReader, options.getCanonicalVisibilityReader);
  assert.equal(calls[0].buildPayload, options.buildPayload);
});

test('index wires clipboard selection through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-clipboard-selection-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-clipboard-selection-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorClipboardSelectionShellRuntime\.createStudioEditorClipboardSelectionShellRuntime\(/
  );
  assert.match(
    fileContent,
    /getSelectedElements: \(doc\) => getStudioSelectedElements\(doc\),/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorClipboardSelectionController\.createStudioEditorClipboardSelectionController\(/
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const clipboardRuntime = require('../shared/studio-editor-clipboard-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('clipboard runtime composes clipboard and canonical insertion dependencies', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorClipboardController(options) {
      calls.push(options);
      return { name: 'clipboard' };
    }
  };
  const options = {
    controllerApi,
    clipboardApi: {},
    canonicalDeckApi: {},
    canonicalInsertionApi: {},
    deckImportApi: {},
    buildClipboardSelectionMutationPlan: () => ({}),
    finalizeClipboardActionResult: () => {},
    getIframeDoc: () => null,
    getActiveSlide: () => null,
    getEditorSlideId: () => '',
    assignElementId: () => '',
    buildCanonicalDeckBaseline: () => ({}),
    getCanonicalDeckBaseline: () => ({}),
    insertClipboardPayload: () => [],
    finalizeInsertedElements: () => false
  };

  assert.deepEqual(
    clipboardRuntime.createStudioEditorClipboardRuntime(options),
    { clipboardController: { name: 'clipboard' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].canonicalInsertionApi, options.canonicalInsertionApi);
  assert.equal(calls[0].deckImportApi, options.deckImportApi);
  assert.equal(calls[0].buildClipboardSelectionMutationPlan, options.buildClipboardSelectionMutationPlan);
  assert.equal(calls[0].buildCanonicalDeckBaseline, options.buildCanonicalDeckBaseline);
  assert.equal(calls[0].insertClipboardPayload, options.insertClipboardPayload);
});

test('index wires the primary clipboard controller through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-clipboard-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-clipboard-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorClipboardShellRuntime\.createStudioEditorClipboardShellRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorClipboardController\.createStudioEditorClipboardController\(/
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const blockRuntime = require('../shared/studio-editor-block-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('block runtime composes canonical and persistence dependencies', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorBlockController(options) {
      calls.push(options);
      return { name: 'block' };
    }
  };
  const options = {
    controllerApi,
    canonicalDeckApi: {},
    canonicalStateApi: {},
    renderApi: {},
    getCanonicalDeck: () => null,
    getCanonicalDeckBaseline: () => null,
    getActiveSlideId: () => '',
    getSelectedNodeIds: () => [],
    getDocument: () => null,
    getActiveSlide: () => null,
    prepareElement: () => {},
    createMarkupTransactionCapture: () => null,
    getElementId: () => '',
    finalizeInsertedElements: () => false,
    finalizeMutation: () => false,
    saveHistoryState: () => {},
    triggerAutoSave: () => {},
    triggerAutoVersion: () => {},
    onBlocksChanged: () => {}
  };

  assert.deepEqual(
    blockRuntime.createStudioEditorBlockRuntime(options),
    { blockController: { name: 'block' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].canonicalStateApi, options.canonicalStateApi);
  assert.equal(calls[0].renderApi, options.renderApi);
  assert.equal(calls[0].getSelectedNodeIds, options.getSelectedNodeIds);
  assert.equal(calls[0].finalizeMutation, options.finalizeMutation);
  assert.equal(calls[0].saveHistoryState, options.saveHistoryState);
  assert.equal(calls[0].onBlocksChanged, options.onBlocksChanged);
});

test('index wires block persistence through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-block-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-block-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorBlockShellRuntime\.createStudioEditorBlockShellRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorBlockController\.createStudioEditorBlockController\(/
  );
});

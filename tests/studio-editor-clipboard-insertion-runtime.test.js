const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const insertionRuntime = require('../shared/studio-editor-clipboard-insertion-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('clipboard insertion runtime composes mutation and geometry dependencies', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorClipboardInsertionController(options) {
      calls.push(options);
      return { name: 'clipboard-insertion' };
    }
  };
  const options = {
    controllerApi,
    clipboardApi: {},
    mutationApi: {},
    transactionApi: {},
    clipboardTransactionApi: {},
    getIframeDoc: () => null,
    getActiveSlide: () => null,
    getEditorSlideId: () => 'slide-1',
    getSlideMetrics: () => null,
    makeElementsHoverable: () => {},
    getRectOnSlide: () => null,
    getOffsetPx: () => 24,
    getElementId: () => ''
  };

  assert.deepEqual(
    insertionRuntime.createStudioEditorClipboardInsertionRuntime(options),
    { insertionController: { name: 'clipboard-insertion' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].mutationApi, options.mutationApi);
  assert.equal(calls[0].transactionApi, options.transactionApi);
  assert.equal(calls[0].clipboardTransactionApi, options.clipboardTransactionApi);
  assert.equal(calls[0].getEditorSlideId, options.getEditorSlideId);
  assert.equal(calls[0].getSlideMetrics, options.getSlideMetrics);
  assert.equal(calls[0].getOffsetPx, options.getOffsetPx);
});

test('index wires clipboard insertion through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-clipboard-insertion-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-clipboard-insertion-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorClipboardInsertionShellRuntime\.createStudioEditorClipboardInsertionShellRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorClipboardInsertionController\.createStudioEditorClipboardInsertionController\(/
  );
});

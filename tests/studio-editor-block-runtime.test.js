const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const blockRuntime = require('../shared/studio-editor-block-runtime.js');
const blockRuntimeAccessors = require('../shared/studio-editor-block-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('block runtime accessors delegate to the shell runtime', () => {
  const runtime = { name: 'block-shell' };
  let receivedOptions = null;
  const shellRuntimeApi = {
    createStudioEditorBlockShellRuntime(options) {
      receivedOptions = options;
      return runtime;
    }
  };
  const blockRuntimeApi = { name: 'block-runtime' };
  const callback = () => {};

  const result = blockRuntimeAccessors.createStudioEditorBlockRuntimeAccessors({
    runtimeApi: shellRuntimeApi,
    blockRuntimeApi,
    runtimeOptions: {
      getCanonicalDeck: callback
    }
  });

  assert.deepEqual(result, { runtime });
  assert.equal(receivedOptions.blockRuntimeApi, blockRuntimeApi);
  assert.equal(receivedOptions.getCanonicalDeck, callback);
});

test('block runtime accessors fail closed without a shell runtime', () => {
  assert.deepEqual(
    blockRuntimeAccessors.createStudioEditorBlockRuntimeAccessors({
      runtimeApi: null
    }),
    { runtime: null }
  );
});

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
    getPendingCanonicalDeck: () => null,
    getCanonicalDeckBaseline: () => null,
    getActiveSlideId: () => '',
    getSelectedNodeIds: () => [],
    getDocument: () => null,
    getActiveSlide: () => null,
    prepareElement: () => {},
    createMarkupTransactionCapture: () => null,
    transactionApi: {
      createStudioElementPresenceTransaction: () => null
    },
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
  assert.equal(calls[0].getPendingCanonicalDeck, options.getPendingCanonicalDeck);
  assert.equal(
    calls[0].createElementPresenceTransaction,
    options.transactionApi.createStudioElementPresenceTransaction
  );
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
    /<script src="\/shared\/studio-editor-block-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorBlockShellCompositionApi\s*\.\s*createStudioEditorBlockShellComposition\(/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-block-shell-composition\.js"><\/script>/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorBlockShellRuntime\.createStudioEditorBlockShellRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorBlockController\.createStudioEditorBlockController\(/
  );
  assert.match(
    fileContent,
    /getCanonicalDeckBaseline: \(\) => resolveEditorLiveCanonicalDeck\([\s\S]*?getPendingCanonicalDeck: getStudioPendingEditorCanonicalDeck,/
  );
});

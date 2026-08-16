const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const insertionRuntime = require('../shared/studio-editor-element-insertion-runtime.js');
const insertionRuntimeAccessors = require('../shared/studio-editor-element-insertion-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('element insertion runtime accessors delegate to the shell runtime', () => {
  const runtime = { name: 'element-insertion-shell' };
  let receivedOptions = null;
  const shellRuntimeApi = {
    createStudioEditorElementInsertionShellRuntime(options) {
      receivedOptions = options;
      return runtime;
    }
  };
  const insertionRuntimeApi = { name: 'insertion-runtime' };
  const callback = () => {};

  const result = insertionRuntimeAccessors.createStudioEditorElementInsertionRuntimeAccessors({
    runtimeApi: shellRuntimeApi,
    insertionRuntimeApi,
    runtimeOptions: {
      getIframeDoc: callback
    }
  });

  assert.deepEqual(result, { runtime });
  assert.equal(receivedOptions.insertionRuntimeApi, insertionRuntimeApi);
  assert.equal(receivedOptions.getIframeDoc, callback);
});

test('element insertion runtime accessors fail closed without a shell runtime', () => {
  assert.deepEqual(
    insertionRuntimeAccessors.createStudioEditorElementInsertionRuntimeAccessors({
      runtimeApi: null
    }),
    { runtime: null }
  );
});

test('element insertion runtime composes canonical and persistence dependencies', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorElementInsertionController(options) {
      calls.push(options);
      return { name: 'element-insertion' };
    }
  };
  const options = {
    controllerApi,
    canonicalDeckApi: {},
    canonicalInsertionApi: {},
    deckImportApi: {},
    insertionTransactionApi: {},
    elementInsertionMutationApi: {},
    insertionApi: {},
    transactionApi: {},
    getIframeDoc: () => null,
    getActiveSlide: () => null,
    getEditorSlideId: () => '',
    buildCanonicalDeckBaseline: () => ({}),
    getPendingCanonicalDeck: () => ({}),
    getCanonicalDeckBaseline: () => ({}),
    applyElementInsertion: () => ({}),
    makeElementsHoverable: () => {},
    assignElementId: () => '',
    finalizeInsertedElements: () => false,
    selectElement: () => {},
    generateThumbnails: () => {},
    saveHistoryState: () => {},
    triggerAutoSave: () => {},
    triggerAutoVersion: () => {},
    updateInsertionActionState: () => {}
  };

  assert.deepEqual(
    insertionRuntime.createStudioEditorElementInsertionRuntime(options),
    { elementInsertionController: { name: 'element-insertion' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].canonicalInsertionApi, options.canonicalInsertionApi);
  assert.equal(calls[0].deckImportApi, options.deckImportApi);
  assert.equal(calls[0].insertionTransactionApi, options.insertionTransactionApi);
  assert.equal(calls[0].elementInsertionMutationApi, options.elementInsertionMutationApi);
  assert.equal(calls[0].insertionApi, options.insertionApi);
  assert.equal(calls[0].transactionApi, options.transactionApi);
  assert.equal(calls[0].buildCanonicalDeckBaseline, options.buildCanonicalDeckBaseline);
  assert.equal(calls[0].getPendingCanonicalDeck, options.getPendingCanonicalDeck);
  assert.equal(calls[0].applyElementInsertion, options.applyElementInsertion);
  assert.equal(calls[0].triggerAutoVersion, options.triggerAutoVersion);
});

test('index wires element insertion through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-element-insertion-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-element-insertion-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-element-insertion-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorElementInsertionRuntimeAccessorsApi\s*\.\s*createStudioEditorElementInsertionRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorElementInsertionShellRuntime\.createStudioEditorElementInsertionShellRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorElementInsertionController\.createStudioEditorElementInsertionController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorElementInsertionController\.createStudioEditorElementInsertionController\(/
  );
});

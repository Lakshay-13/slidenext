const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const templateRuntime = require('../shared/studio-editor-template-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('template runtime composes controller dependencies without changing them', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorTemplateController(options) {
      calls.push(options);
      return { name: 'template' };
    }
  };
  const options = {
    controllerApi,
    canonicalDeckApi: {},
    canonicalStateApi: {},
    renderApi: {},
    insertionMutationApi: {},
    insertionTransactionApi: {},
    slideCommandsApi: {},
    deckViewApi: {},
    transactionApi: {},
    getCanonicalDeck: () => null,
    getPendingCanonicalDeck: () => null,
    getCanonicalDeckBaseline: () => null,
    getDocument: () => null,
    getSlideContainer: () => null,
    getSlides: () => [],
    getActiveSlideId: () => '',
    prepareSlide: () => {},
    getElementId: () => '',
    applyInsertion: () => null,
    generateThumbnails: () => {},
    setActiveSlide: () => {},
    saveHistoryState: () => {},
    triggerAutoSave: () => {},
    triggerAutoVersion: () => {},
    finalizeMutation: () => {},
    rollbackMutation: () => {},
    onTemplatesChanged: () => {}
  };

  assert.deepEqual(
    templateRuntime.createStudioEditorTemplateRuntime(options),
    { templateController: { name: 'template' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].canonicalDeckApi, options.canonicalDeckApi);
  assert.equal(calls[0].canonicalStateApi, options.canonicalStateApi);
  assert.equal(calls[0].insertionMutationApi, options.insertionMutationApi);
  assert.equal(calls[0].insertionTransactionApi, options.insertionTransactionApi);
  assert.equal(calls[0].slideCommandsApi, options.slideCommandsApi);
  assert.equal(calls[0].deckViewApi, options.deckViewApi);
  assert.equal(calls[0].transactionApi, options.transactionApi);
  assert.equal(calls[0].getPendingCanonicalDeck, options.getPendingCanonicalDeck);
  assert.equal(calls[0].getDocument, options.getDocument);
  assert.equal(calls[0].getSlideContainer, options.getSlideContainer);
  assert.equal(calls[0].applyInsertion, options.applyInsertion);
  assert.equal(calls[0].finalizeMutation, options.finalizeMutation);
  assert.equal(calls[0].rollbackMutation, options.rollbackMutation);
  assert.equal(calls[0].onTemplatesChanged, options.onTemplatesChanged);
});

test('index wires template persistence through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-template-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-template-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorTemplateShellRuntime\.createStudioEditorTemplateShellRuntime\(/
  );
  assert.match(
    fileContent,
    /getActiveSlideId: \(doc\) => getActiveSlideId\(doc \|\| getIframeDoc\(\)\),/
  );
  assert.match(
    fileContent,
    /getCanonicalDeckBaseline: \(\) => resolveEditorLiveCanonicalDeck\([\s\S]*?getPendingCanonicalDeck: getStudioPendingEditorCanonicalDeck,/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorTemplateController\.createStudioEditorTemplateController\(/
  );
});

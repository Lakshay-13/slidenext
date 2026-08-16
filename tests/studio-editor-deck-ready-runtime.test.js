const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const deckReadyRuntime = require('../shared/studio-editor-deck-ready-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('deck-ready runtime composes readiness dependencies without changing them', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorDeckReadyController(options) {
      calls.push(options);
      return { name: 'deck-ready' };
    }
  };
  const options = {
    controllerApi,
    deckReadyApi: {},
    getDocumentRef: () => null,
    getDocument: () => null,
    getPresentationUrl: () => '',
    getPersistedDeckState: () => null,
    resolvePersistedDeckStateWithContent: () => null,
    getStoredCanonicalDeck: () => null,
    getSaveButtonState: () => 'idle'
  };

  assert.deepEqual(
    deckReadyRuntime.createStudioEditorDeckReadyRuntime(options),
    { deckReadyController: { name: 'deck-ready' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].deckReadyApi, options.deckReadyApi);
  assert.equal(calls[0].getDocumentRef, options.getDocumentRef);
  assert.equal(calls[0].getDocument, options.getDocument);
  assert.equal(calls[0].getPresentationUrl, options.getPresentationUrl);
  assert.equal(calls[0].getPersistedDeckState, options.getPersistedDeckState);
  assert.equal(calls[0].resolvePersistedDeckStateWithContent, options.resolvePersistedDeckStateWithContent);
  assert.equal(calls[0].getStoredCanonicalDeck, options.getStoredCanonicalDeck);
  assert.equal(calls[0].getSaveButtonState, options.getSaveButtonState);
});

test('index wires deck readiness through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-deck-ready-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-deck-ready-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-deck-ready-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /createStudioEditorDeckReadyRuntimeAccessors\(/
  );
  assert.match(
    fileContent,
    /studioEditorDeckReadyRuntime = studioEditorDeckReadyRuntimeAccessors/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorDeckReadyShellRuntime\.createStudioEditorDeckReadyShellRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorDeckReadyController\.createStudioEditorDeckReadyController\(/
  );
});

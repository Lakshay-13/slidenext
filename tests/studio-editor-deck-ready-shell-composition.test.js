const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const composition = require('../shared/studio-editor-deck-ready-shell-composition.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('deck-ready shell composition wires runtime dependencies and callbacks', () => {
  const runtime = { deckReadyController: { id: 'deck-ready-controller' } };
  const runtimeAccessors = { runtime };
  let receivedOptions = null;

  const result = composition.createStudioEditorDeckReadyShellComposition({
    runtimeAccessorsApi: {
      createStudioEditorDeckReadyRuntimeAccessors(options) {
        receivedOptions = options;
        return runtimeAccessors;
      }
    },
    runtimeApi: { id: 'shell-runtime' },
    deckReadyRuntimeApi: { id: 'runtime' },
    controllerApi: { id: 'controller' },
    deckReadyApi: { id: 'deck-ready' },
    getDocumentRef: () => ({ id: 'document' }),
    getDocument: () => ({ id: 'iframe-document' }),
    getPresentationUrl: () => '/presentations/demo',
    getPersistedDeckState: () => ({ html: '<html></html>' }),
    resolvePersistedDeckStateWithContent: (state) => state,
    getStoredCanonicalDeck: () => ({ slides: [] }),
    getSaveButtonState: () => 'idle'
  });

  assert.equal(result.runtimeAccessors, runtimeAccessors);
  assert.equal(result.runtime, runtime);
  assert.equal(result.deckReadyController, runtime.deckReadyController);
  assert.equal(receivedOptions.runtimeApi.id, 'shell-runtime');
  assert.equal(receivedOptions.deckReadyRuntimeApi.id, 'runtime');
  assert.equal(receivedOptions.runtimeOptions.controllerApi.id, 'controller');
  assert.equal(receivedOptions.runtimeOptions.deckReadyApi.id, 'deck-ready');
  assert.equal(typeof receivedOptions.runtimeOptions.getDocument, 'function');
  assert.equal(typeof receivedOptions.runtimeOptions.getSaveButtonState, 'function');
});

test('deck-ready shell composition fails closed without runtime accessors', () => {
  assert.deepEqual(
    composition.createStudioEditorDeckReadyShellComposition({ runtimeAccessorsApi: null }),
    { runtimeAccessors: null, runtime: null, deckReadyController: null }
  );
});

test('index routes deck-ready assembly through the shell composition', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const runtimeAccessorsIndex = source.indexOf(
    '<script src="/shared/studio-editor-deck-ready-runtime-accessors.js"></script>'
  );
  const compositionIndex = source.indexOf(
    '<script src="/shared/studio-editor-deck-ready-shell-composition.js"></script>'
  );

  assert.ok(runtimeAccessorsIndex >= 0);
  assert.ok(compositionIndex > runtimeAccessorsIndex);
  assert.match(source, /studioEditorDeckReadyShellCompositionApi/);
  assert.match(source, /createStudioEditorDeckReadyShellComposition/);
  assert.doesNotMatch(
    source,
    /studioEditorDeckReadyRuntimeAccessorsApi\s*\.\s*createStudioEditorDeckReadyRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    source,
    /SlideNextStudioEditorDeckReadyController\.createStudioEditorDeckReadyController\(/
  );
});

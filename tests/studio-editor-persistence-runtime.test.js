const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const persistenceRuntime = require('../shared/studio-editor-persistence-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('persistence runtime preserves the save and version dependency bundle', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorPersistenceController(options) {
      calls.push(options);
      return { name: 'persistence' };
    }
  };
  const options = {
    controllerApi,
    persistenceApi: null,
    persistenceStateApi: {},
    resolveCanonicalDeck: () => null,
    normalizePlaybackState: () => null,
    setPersistedDeckHtml: () => {},
    setPersistedCanonicalDeck: () => {},
    setPersistedPlaybackState: () => {},
    getCurrentPresentationUrl: () => '',
    getCurrentSessionToken: () => 0,
    getCurrentPresentationMetadata: () => ({}),
    resolveMergedPresentationPersistenceOptions: () => ({}),
    resolvePresentationPersistenceOptions: () => ({}),
    mergePresentationPersistenceOptions: () => ({}),
    createSessionReaderOptions: () => ({}),
    applyPersistedDeckState: () => ({}),
    createHandlerOptions: () => ({}),
    createVersionHandlerOptions: () => ({}),
    setCurrentPresentationCanonicalDeck: () => {},
    isCanonicalDeck: () => true,
    getPersistedDeckHtml: () => '',
    getPersistedCanonicalDeck: () => null,
    getPersistedPlaybackState: () => null,
    deckPersistenceApi: {},
    getSlides: () => [],
    slideIdAttr: 'data-slide-id',
    resolveFallbackActiveSlideId: () => ''
  };

  assert.deepEqual(
    persistenceRuntime.createStudioEditorPersistenceRuntime(options),
    { persistenceController: { name: 'persistence' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].persistenceApi, null);
  assert.equal(calls[0].persistenceStateApi, options.persistenceStateApi);
  assert.equal(calls[0].resolveCanonicalDeck, options.resolveCanonicalDeck);
  assert.equal(calls[0].createSessionReaderOptions, options.createSessionReaderOptions);
  assert.equal(calls[0].createHandlerOptions, options.createHandlerOptions);
  assert.equal(calls[0].createVersionHandlerOptions, options.createVersionHandlerOptions);
  assert.equal(calls[0].deckPersistenceApi, options.deckPersistenceApi);
  assert.equal(calls[0].resolveFallbackActiveSlideId, options.resolveFallbackActiveSlideId);
});

test('index wires persistence through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persistence-runtime-options\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorPersistenceRuntimeOptionsApi\.createStudioEditorPersistenceRuntimeOptions\(/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persistence-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persistence-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persistence-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persistence-shell-composition\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /createStudioEditorPersistenceShellComposition\(/
  );
  assert.match(
    fileContent,
    /studioEditorPersistenceRuntime = studioEditorPersistenceShellComposition/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorPersistenceRuntimeAccessorsApi\s*\.\s*createStudioEditorPersistenceRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorPersistenceShellRuntime\.createStudioEditorPersistenceShellRuntime\(/
  );
  assert.match(
    fileContent,
    /deckPersistenceApi: typeof SlideNextDeckPersistence !== 'undefined' \? SlideNextDeckPersistence : null/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorPersistenceController\.createStudioEditorPersistenceController\(/
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const persistenceShellRuntime = require('../shared/studio-editor-canonical-persistence-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('canonical persistence shell runtime forwards canonical fallback dependencies', () => {
  let receivedOptions = null;
  const adapter = { resolveCanonicalDeckOverride() {} };
  const canonicalPersistenceApi = {
    createStudioEditorCanonicalPersistenceAdapter(options) {
      receivedOptions = options;
      return adapter;
    }
  };
  const options = {
    canonicalPersistenceApi,
    getPersistenceController: () => null,
    persistenceApi: { name: 'persistence' },
    persistenceStateApi: { name: 'persistence-state' },
    isCanonicalDeck: () => true,
    getPendingCanonicalDeck: () => null,
    buildCanonicalDeckForDocument: () => null
  };

  const runtime = persistenceShellRuntime
    .createStudioEditorCanonicalPersistenceShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.canonicalPersistenceAdapter, adapter);
  assert.equal(receivedOptions.getPersistenceController, options.getPersistenceController);
  assert.equal(receivedOptions.persistenceApi, options.persistenceApi);
  assert.equal(receivedOptions.persistenceStateApi, options.persistenceStateApi);
  assert.equal(receivedOptions.isCanonicalDeck, options.isCanonicalDeck);
  assert.equal(receivedOptions.getPendingCanonicalDeck, options.getPendingCanonicalDeck);
  assert.equal(
    receivedOptions.buildCanonicalDeckForDocument,
    options.buildCanonicalDeckForDocument
  );
});

test('canonical persistence shell runtime fails closed when the adapter API is unavailable', () => {
  const runtime = persistenceShellRuntime
    .createStudioEditorCanonicalPersistenceShellRuntime({ canonicalPersistenceApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.canonicalPersistenceAdapter, null);
});

test('index routes canonical persistence construction through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-canonical-persistence-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-canonical-persistence-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-canonical-persistence-shell-composition\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /createStudioEditorCanonicalPersistenceShellComposition\(/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorCanonicalPersistenceRuntimeAccessorsApi\s*\.\s*createStudioEditorCanonicalPersistenceRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorCanonicalPersistenceShellRuntimeApi\s*\.createStudioEditorCanonicalPersistenceShellRuntime\(/
  );
  assert.match(
    fileContent,
    /studioEditorCanonicalPersistenceAdapter = studioEditorCanonicalPersistenceShellRuntime/
  );
});

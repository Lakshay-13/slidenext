const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const metadataAction = require('../shared/studio-editor-metadata-persistence-action.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('metadata persistence action prefers the persistence controller', () => {
  const calls = [];
  const resolveEditorMetadataPersistenceOptions = metadataAction.createStudioEditorMetadataPersistenceAction({
    getPersistenceController: () => ({
      resolveMetadataPersistenceOptions(...args) {
        calls.push(args);
        return { source: 'controller' };
      }
    })
  });

  assert.deepEqual(resolveEditorMetadataPersistenceOptions({ id: 1 }), { source: 'controller' });
  assert.deepEqual(calls, [[{ id: 1 }]]);
});

test('metadata persistence action caches the shared state adapter', () => {
  let createCalls = 0;
  const resolveEditorMetadataPersistenceOptions = metadataAction.createStudioEditorMetadataPersistenceAction({
    persistenceApi: { id: 'persistence-api' },
    persistenceStateApi: {
      createStudioEditorMetadataPersistenceOptionsAdapter(options) {
        createCalls += 1;
        assert.equal(options.persistenceApi.id, 'persistence-api');
        return (nextOptions) => ({ source: 'adapter', nextOptions });
      }
    }
  });

  assert.deepEqual(resolveEditorMetadataPersistenceOptions({ id: 1 }), {
    source: 'adapter',
    nextOptions: { id: 1 }
  });
  assert.deepEqual(resolveEditorMetadataPersistenceOptions({ id: 2 }), {
    source: 'adapter',
    nextOptions: { id: 2 }
  });
  assert.equal(createCalls, 1);
});

test('metadata persistence action preserves resolver-builder callbacks', () => {
  let capturedOptions = null;
  const persistenceApi = {
    createStudioMetadataPersistenceOptionsResolver(options) {
      capturedOptions = options;
      return (nextOptions) => ({ source: 'builder', nextOptions });
    },
    resolveStudioMetadataPersistenceOptions() {}
  };
  const resolveEditorMetadataPersistenceOptions = metadataAction.createStudioEditorMetadataPersistenceAction({
    persistenceApi,
    getCurrentPresentationMetadata: () => ({ id: 'deck-1' })
  });

  assert.deepEqual(resolveEditorMetadataPersistenceOptions({ persistenceOptions: { theme: 'dark' } }), {
    source: 'builder',
    nextOptions: { persistenceOptions: { theme: 'dark' } }
  });
  assert.equal(typeof capturedOptions.getCurrentPresentationMetadata, 'function');
  assert.equal(typeof capturedOptions.resolveMetadataPersistenceOptions, 'function');
});

test('metadata persistence action returns an empty object without a shared runtime', () => {
  const resolveEditorMetadataPersistenceOptions = metadataAction.createStudioEditorMetadataPersistenceAction({});

  assert.deepEqual(resolveEditorMetadataPersistenceOptions({}), {});
});

test('index loads and installs the shared metadata persistence action', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(fileContent, /<script src="\/shared\/studio-editor-metadata-persistence-action\.js"><\/script>/);
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-metadata-persistence-shell-runtime\.js"><\/script>/
  );
  assert.match(fileContent, /createStudioEditorMetadataPersistenceShellRuntime/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorMetadataPersistenceGlobalApi\);/);
  assert.doesNotMatch(fileContent, /function resolveEditorMetadataPersistenceOptions\(options = \{\}\) \{/);
});

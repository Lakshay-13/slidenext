const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const metadataShellRuntime = require('../shared/studio-editor-metadata-persistence-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('metadata persistence shell runtime forwards metadata merge dependencies', () => {
  let receivedOptions = null;
  let globalOptions = null;
  const action = () => ({ persistence: true });
  const actionApi = {
    createStudioEditorMetadataPersistenceAction(options) {
      receivedOptions = options;
      return action;
    },
    createStudioEditorMetadataPersistenceGlobalApi(options) {
      globalOptions = options;
      return { resolveEditorMetadataPersistenceOptions: options.resolveEditorMetadataPersistenceOptions };
    }
  };
  const options = {
    actionApi,
    getPersistenceController: () => null,
    persistenceApi: { name: 'persistence' },
    persistenceStateApi: { name: 'persistence-state' },
    getCurrentPresentationMetadata: () => ({ id: 'deck-1' }),
    resolveMergedPresentationPersistenceOptions: () => ({}),
    resolvePresentationPersistenceOptions: () => ({}),
    mergePresentationPersistenceOptions: () => ({})
  };

  const runtime = metadataShellRuntime
    .createStudioEditorMetadataPersistenceShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.metadataPersistenceAction, action);
  assert.equal(receivedOptions.getPersistenceController, options.getPersistenceController);
  assert.equal(receivedOptions.persistenceApi, options.persistenceApi);
  assert.equal(receivedOptions.persistenceStateApi, options.persistenceStateApi);
  assert.equal(
    receivedOptions.getCurrentPresentationMetadata,
    options.getCurrentPresentationMetadata
  );
  assert.equal(
    receivedOptions.resolveMergedPresentationPersistenceOptions,
    options.resolveMergedPresentationPersistenceOptions
  );
  assert.equal(
    receivedOptions.resolvePresentationPersistenceOptions,
    options.resolvePresentationPersistenceOptions
  );
  assert.equal(
    receivedOptions.mergePresentationPersistenceOptions,
    options.mergePresentationPersistenceOptions
  );
  assert.equal(globalOptions.resolveEditorMetadataPersistenceOptions, action);
  assert.equal(
    runtime.metadataPersistenceGlobalApi.resolveEditorMetadataPersistenceOptions,
    action
  );
});

test('metadata persistence shell runtime fails closed when the action API is unavailable', () => {
  const runtime = metadataShellRuntime
    .createStudioEditorMetadataPersistenceShellRuntime({ actionApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.metadataPersistenceAction, null);
  assert.deepEqual(runtime.metadataPersistenceGlobalApi, {});
});

test('index routes metadata persistence installation through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-metadata-persistence-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-metadata-persistence-runtime-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorMetadataPersistenceShellRuntimeApi/);
  assert.match(
    fileContent,
    /studioEditorMetadataPersistenceRuntimeAccessorsApi\s*\.\s*createStudioEditorMetadataPersistenceRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorMetadataPersistenceShellRuntimeApi\s*\.\s*createStudioEditorMetadataPersistenceShellRuntime\(/
  );
  assert.match(
    fileContent,
    /studioEditorMetadataPersistenceGlobalApi = studioEditorMetadataPersistenceShellRuntime/
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sanitizerAction = require('../shared/studio-editor-persistable-deck-sanitizer-action.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('sanitizer action prefers the persistence controller', () => {
  const calls = [];
  const buildEditorPersistableDeckSanitizerOptions = sanitizerAction.createStudioEditorPersistableDeckSanitizerAction({
    getPersistenceController: () => ({
      buildPersistableDeckSanitizerOptions(...args) {
        calls.push(args);
        return { source: 'controller' };
      }
    })
  });

  assert.deepEqual(
    buildEditorPersistableDeckSanitizerOptions({ activeSlideIds: ['slide-1'] }, { id: 1 }),
    { source: 'controller' }
  );
  assert.equal(calls[0][0].activeSlideIds[0], 'slide-1');
  assert.equal(calls[0][1].id, 1);
  assert.equal(typeof calls[0][1].resolveMetadataPersistenceOptions, 'function');
});

test('sanitizer action caches the shared state adapter', () => {
  let createCalls = 0;
  const buildEditorPersistableDeckSanitizerOptions = sanitizerAction.createStudioEditorPersistableDeckSanitizerAction({
    persistenceApi: { id: 'persistence-api' },
    persistenceStateApi: {
      createStudioEditorPersistableDeckSanitizerOptionsAdapter(options) {
        createCalls += 1;
        assert.equal(options.persistenceApi.id, 'persistence-api');
        return (playbackState, nextOptions) => ({ playbackState, nextOptions });
      }
    }
  });

  assert.deepEqual(buildEditorPersistableDeckSanitizerOptions(null, { id: 1 }), {
    playbackState: null,
    nextOptions: { id: 1 }
  });
  assert.deepEqual(buildEditorPersistableDeckSanitizerOptions({ id: 2 }, { id: 3 }), {
    playbackState: { id: 2 },
    nextOptions: { id: 3 }
  });
  assert.equal(createCalls, 1);
});

test('sanitizer action preserves builder callbacks and fails closed without a builder', () => {
  let capturedCallbacks = null;
  const buildEditorPersistableDeckSanitizerOptions = sanitizerAction.createStudioEditorPersistableDeckSanitizerAction({
    persistenceApi: {
      createStudioPersistableDeckSanitizerOptionsBuilder(callbacks) {
        capturedCallbacks = callbacks;
        return (playbackState, nextOptions) => ({ playbackState, nextOptions });
      }
    }
  });

  assert.deepEqual(buildEditorPersistableDeckSanitizerOptions({ id: 1 }, { id: 2 }), {
    playbackState: { id: 1 },
    nextOptions: { id: 2 }
  });
  assert.equal(typeof capturedCallbacks.resolveMetadataPersistenceOptions, 'function');
  assert.equal(typeof capturedCallbacks.getDeckSanitizerOptions, 'function');

  const unavailable = sanitizerAction.createStudioEditorPersistableDeckSanitizerAction({});
  assert.deepEqual(unavailable({ id: 1 }), {});
});

test('sanitizer global API preserves the editor handler name', () => {
  const api = sanitizerAction.createStudioEditorPersistableDeckSanitizerGlobalApi({
    buildEditorPersistableDeckSanitizerOptions: () => 'sanitized'
  });

  assert.equal(api.buildEditorPersistableDeckSanitizerOptions(), 'sanitized');
});

test('index loads and installs the shared sanitizer action', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(fileContent, /<script src="\/shared\/studio-editor-persistable-deck-sanitizer-action\.js"><\/script>/);
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persistable-deck-sanitizer-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persistable-deck-sanitizer-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorPersistableDeckSanitizerRuntimeAccessorsApi\s*\.\s*createStudioEditorPersistableDeckSanitizerRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorPersistableDeckSanitizerShellRuntimeApi\s*\.\s*createStudioEditorPersistableDeckSanitizerShellRuntime\(/
  );
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorPersistableDeckSanitizerGlobalApi\);/);
  assert.doesNotMatch(fileContent, /function buildEditorPersistableDeckSanitizerOptions\(playbackState = null, options = \{\}\) \{/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const persistedDeckRuntime = require('../shared/studio-editor-persisted-deck-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('persisted deck runtime composes the persisted deck state store', () => {
  const calls = [];
  const stateStore = {
    createStudioEditorPersistedDeckStateStore(options) {
      calls.push(options);
      return { name: 'persisted-deck' };
    }
  };

  assert.deepEqual(
    persistedDeckRuntime.createStudioEditorPersistedDeckRuntime({ stateStore }),
    { persistedDeckStateStore: { name: 'persisted-deck' } }
  );
  assert.deepEqual(calls, [{}]);
});

test('index wires persisted deck state through the bridge module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persisted-deck-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persisted-deck-bridge\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorPersistedDeckBridge\.createStudioEditorPersistedDeckBridge\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorPersistedDeckStateStore\.createStudioEditorPersistedDeckStateStore\(\{\}/
  );
});

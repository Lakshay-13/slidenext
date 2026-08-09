const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const saveButtonStateRuntime = require('../shared/studio-editor-save-button-state-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('save button state runtime composes the save button state store', () => {
  const calls = [];
  const stateStore = {
    createStudioEditorSaveButtonStateStore(options) {
      calls.push(options);
      return { name: 'save-button-state' };
    }
  };

  assert.deepEqual(
    saveButtonStateRuntime.createStudioEditorSaveButtonStateRuntime({ stateStore }),
    { saveButtonStateStore: { name: 'save-button-state' } }
  );
  assert.deepEqual(calls, [{}]);
});

test('index wires save button state through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-save-button-state-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorSaveButtonStateRuntime\.createStudioEditorSaveButtonStateRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorSaveButtonStateStore\.createStudioEditorSaveButtonStateStore\(\{\}/
  );
});

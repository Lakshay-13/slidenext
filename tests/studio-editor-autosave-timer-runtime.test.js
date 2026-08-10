const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const autoSaveTimerRuntime = require('../shared/studio-editor-autosave-timer-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('autosave timer runtime composes the autosave timer store', () => {
  const calls = [];
  const stateStore = {
    createStudioEditorAutoSaveTimerStore(options) {
      calls.push(options);
      return { name: 'autosave-timer' };
    }
  };

  assert.deepEqual(
    autoSaveTimerRuntime.createStudioEditorAutoSaveTimerRuntime({ stateStore }),
    { autoSaveTimerStore: { name: 'autosave-timer' } }
  );
  assert.deepEqual(calls, [{}]);
});

test('index wires autosave timer state through the bridge module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-autosave-timer-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-timer-state-bridge\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorTimerStateBridge\.createStudioEditorTimerStateBridge\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorAutoSaveTimerStore\.createStudioEditorAutoSaveTimerStore\(\{\}/
  );
});

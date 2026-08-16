const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const autoVersionTimerRuntime = require('../shared/studio-editor-auto-version-timer-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('auto-version timer runtime composes the auto-version timer store', () => {
  const calls = [];
  const stateStore = {
    createStudioEditorAutoVersionTimerStore(options) {
      calls.push(options);
      return { name: 'auto-version-timer' };
    }
  };

  assert.deepEqual(
    autoVersionTimerRuntime.createStudioEditorAutoVersionTimerRuntime({ stateStore }),
    { autoVersionTimerStore: { name: 'auto-version-timer' } }
  );
  assert.deepEqual(calls, [{}]);
});

test('index wires auto-version timer state through the bridge module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-auto-version-timer-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-timer-state-bridge\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorShellStateRuntimeAccessorsApi\s*\.\s*createStudioEditorShellStateRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorAutoVersionTimerStore\.createStudioEditorAutoVersionTimerStore\(\{\}/
  );
});

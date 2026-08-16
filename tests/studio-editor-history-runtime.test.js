const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const historyRuntime = require('../shared/studio-editor-history-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('history runtime composes the history state controller', () => {
  const calls = [];
  const controller = { name: 'history-state' };
  const historyStore = {
    createStudioEditorHistoryStateController(options) {
      calls.push(options);
      return controller;
    }
  };

  assert.deepEqual(
    historyRuntime.createStudioEditorHistoryRuntime({ historyStore }),
    { historyStateController: controller }
  );
  assert.deepEqual(calls, [{}]);
});

test('index wires history state through the bridge module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-history-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-history-bridge\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorShellStateRuntimeAccessorsApi\s*\.\s*createStudioEditorShellStateRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorHistoryStore\.createStudioEditorHistoryStateController\(\{\}/
  );
});

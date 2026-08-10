const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sessionStateRuntime = require('../shared/studio-editor-session-state-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('session-state runtime composes the canonical identity store', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorSessionStateController(options) {
      calls.push(options);
      return { name: 'session-state' };
    }
  };
  const controllerOptions = { marker: 'identity' };

  assert.deepEqual(
    sessionStateRuntime.createStudioEditorSessionStateRuntime({
      controllerApi,
      controllerOptions
    }),
    { sessionStateController: { name: 'session-state' } }
  );
  assert.deepEqual(calls, [controllerOptions]);
});

test('index wires canonical session state through the bridge module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-session-state-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-session-state-bridge\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorSessionStateBridge\.createStudioEditorSessionStateBridge\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorSessionState\.createStudioEditorSessionStateController\(\{\}\)/
  );
});

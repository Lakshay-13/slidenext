const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const bridgeApi = require('../shared/studio-editor-session-state-bridge.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('session state bridge composes the runtime and delegates URL and token access', () => {
  const calls = [];
  const controllerApi = { name: 'session-controller-api' };
  const controller = {
    getPresentationUrl: () => '/presentations/demo',
    setPresentationUrl: (value) => value,
    getSessionToken: () => 4,
    advanceSessionToken: () => 5
  };
  const runtimeApi = {
    createStudioEditorSessionStateRuntime(options) {
      calls.push(options);
      return { sessionStateController: controller };
    }
  };

  const bridge = bridgeApi.createStudioEditorSessionStateBridge({
    runtimeApi,
    controllerApi
  });

  assert.equal(bridge.getPresentationUrl(), '/presentations/demo');
  assert.equal(bridge.setPresentationUrl('/presentations/next'), '/presentations/next');
  assert.equal(bridge.getSessionToken(), 4);
  assert.equal(bridge.advanceSessionToken(), 5);
  assert.equal(bridge.sessionStateController, controller);
  assert.deepEqual(calls, [{ controllerApi }]);
});

test('session state bridge preserves safe fallbacks when runtime is unavailable', () => {
  const bridge = bridgeApi.createStudioEditorSessionStateBridge({
    runtimeApi: null,
    controllerApi: null
  });

  assert.equal(bridge.runtime, null);
  assert.equal(bridge.sessionStateController, null);
  assert.equal(bridge.getPresentationUrl(), '');
  assert.equal(bridge.setPresentationUrl('/ignored'), '');
  assert.equal(bridge.getSessionToken(), 0);
  assert.equal(bridge.advanceSessionToken(), 0);
});

test('editor loads the session state bridge after its runtime dependency', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-session-state-bridge\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /createStudioEditorShellStateComposition\(/
  );
  assert.match(fileContent, /studioEditorSessionStateBridge/);
});

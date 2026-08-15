const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerApi = require('../shared/studio-editor-session-token-state-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('session token controller owns monotonic session invalidation state', () => {
  const controller = controllerApi.createStudioEditorSessionTokenStateController({
    sessionToken: 4
  });

  assert.equal(controller.getSessionToken(), 4);
  assert.equal(controller.advanceSessionToken(), 5);
  assert.equal(controller.getSessionToken(), 5);
  assert.equal(controller.setSessionToken(12), 12);
  assert.equal(controller.reset(), 0);
});

test('session token controller ignores malformed replacement values', () => {
  const controller = controllerApi.createStudioEditorSessionTokenStateController({
    sessionToken: 7
  });

  assert.equal(controller.setSessionToken('8'), 7);
  assert.equal(controllerApi.normalizeSessionToken('invalid', 3), 3);
  assert.equal(controllerApi.normalizeSessionToken(9), 9);
});

test('editor wires session token reads and invalidation through the controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-session-token-state-controller\.js/);
  assert.match(source, /getStudioEditorSessionToken\(\)/);
  assert.match(source, /advanceSessionToken:\s*advanceStudioEditorSessionToken/);
  assert.doesNotMatch(source, /\blet studioEditorSessionToken\b/);
  assert.doesNotMatch(source, /\+\+studioEditorSessionToken/);
});

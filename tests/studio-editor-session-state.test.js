const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sessionStateApi = require('../shared/studio-editor-session-state.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('session state composes presentation identity and session invalidation state', () => {
  const controller = sessionStateApi.createStudioEditorSessionStateController({
    presentationUrlController: {
      getPresentationUrl: () => '/presentations/demo/index.html',
      setPresentationUrl: (value) => value,
      reset: () => undefined
    },
    sessionTokenController: {
      getSessionToken: () => 4,
      advanceSessionToken: () => 5,
      reset: () => undefined
    }
  });

  assert.equal(controller.getPresentationUrl(), '/presentations/demo/index.html');
  assert.equal(controller.setPresentationUrl('/presentations/next/index.html'), '/presentations/next/index.html');
  assert.equal(controller.getSessionToken(), 4);
  assert.equal(controller.advanceSessionToken(), 5);
});

test('session state reset delegates to both identity controllers', () => {
  const calls = [];
  const controller = sessionStateApi.createStudioEditorSessionStateController({
    presentationUrlController: {
      getPresentationUrl: () => '',
      reset: () => calls.push('url')
    },
    sessionTokenController: {
      getSessionToken: () => 0,
      reset: () => calls.push('token')
    }
  });

  assert.deepEqual(controller.reset(), {
    presentationUrl: '',
    sessionToken: 0
  });
  assert.deepEqual(calls, ['url', 'token']);
});

test('editor wires session identity through the shared state adapter', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-session-state\.js/);
  assert.match(source, /studioEditorSessionStateController/);
  assert.match(source, /getStudioCurrentPresentationUrl\(\)/);
  assert.match(source, /getStudioEditorSessionToken\(\)/);
  assert.doesNotMatch(source, /const studioEditorPresentationUrlStateController =/);
  assert.doesNotMatch(source, /const studioEditorSessionTokenStateController =/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const accessorsApi = require('../shared/studio-editor-session-state-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const ACCESSORS_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-session-state-accessors.js');

test('session accessors delegate URL and token state', () => {
  const bridge = {
    getPresentationUrl: () => '/presentations/demo',
    setPresentationUrl: (value) => value,
    getSessionToken: () => 4,
    advanceSessionToken: () => 5
  };
  const accessors = accessorsApi.createStudioEditorSessionStateAccessors({ bridge });

  assert.equal(accessors.getPresentationUrl(), '/presentations/demo');
  assert.equal(accessors.setPresentationUrl('/presentations/next'), '/presentations/next');
  assert.equal(accessors.getSessionToken(), 4);
  assert.equal(accessors.advanceSessionToken(), 5);
});

test('session accessors preserve safe fallbacks without a bridge', () => {
  const accessors = accessorsApi.createStudioEditorSessionStateAccessors();

  assert.equal(accessors.getPresentationUrl(), '');
  assert.equal(accessors.setPresentationUrl('/ignored'), '');
  assert.equal(accessors.getSessionToken(), 0);
  assert.equal(accessors.advanceSessionToken(), 0);
});

test('session state global api preserves the editor shell function names', () => {
  const calls = [];
  const accessors = {
    getPresentationUrl: () => 'presentations/demo/index.html',
    setPresentationUrl: (value) => {
      calls.push(['set-url', value]);
      return value;
    },
    getSessionToken: () => 4,
    advanceSessionToken: () => 5
  };
  const globalApi = accessorsApi.createStudioEditorSessionStateGlobalApi({ accessors });

  assert.equal(globalApi.getStudioCurrentPresentationUrl(), 'presentations/demo/index.html');
  assert.equal(
    globalApi.setStudioCurrentPresentationUrl('presentations/next/index.html'),
    'presentations/next/index.html'
  );
  assert.equal(globalApi.getStudioEditorSessionToken(), 4);
  assert.equal(globalApi.advanceStudioEditorSessionToken(), 5);
  assert.deepEqual(calls, [['set-url', 'presentations/next/index.html']]);
});

test('session accessors publish the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(ACCESSORS_PATH, 'utf8'), context);

  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorSessionStateAccessors,
    'object'
  );
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorSessionStateAccessors
      .createStudioEditorSessionStateAccessors,
    'function'
  );
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorSessionStateAccessors
      .createStudioEditorSessionStateGlobalApi,
    'function'
  );
});

test('editor loads session accessors after the session state bridge', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-session-state-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorShellStateRuntime\.sessionStateAccessors/);
  assert.match(fileContent, /studioEditorSessionStateAccessors/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorSessionStateGlobalApi\)/);
  assert.doesNotMatch(fileContent, /function getStudioCurrentPresentationUrl\(\)/);
  assert.doesNotMatch(fileContent, /function getStudioEditorSessionToken\(\)/);
});

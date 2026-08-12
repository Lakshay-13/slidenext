const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const shellStateRuntime = require('../shared/studio-editor-shell-state-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const RUNTIME_PATH = path.join(
  __dirname,
  '..',
  'shared',
  'studio-editor-shell-state-runtime.js'
);

test('shell state runtime composes session and editor state bridges and accessors', () => {
  const calls = [];
  const bridge = (name, value) => ({
    [`createStudio${name}Bridge`](options) {
      calls.push([`${name}-bridge`, options]);
      return value;
    }
  });
  const accessors = (name, value) => ({
    [`createStudio${name}Accessors`](options) {
      calls.push([`${name}-accessors`, options]);
      return value;
    }
  });
  const options = {
    sessionStateBridgeApi: bridge('EditorSessionState', 'session-bridge'),
    sessionStateRuntimeApi: { name: 'session-runtime' },
    sessionStateControllerApi: { name: 'session-controller' },
    sessionStateAccessorsApi: accessors('EditorSessionState', 'session-accessors'),
    stateBridgeApi: bridge('EditorState', 'state-bridge'),
    stateRuntimeApi: { name: 'state-runtime' },
    presentationMetadataApi: { name: 'metadata-store' },
    presentationLabelApi: { name: 'label-store' },
    slideIndexApi: { name: 'slide-index-store' },
    selectionApi: { name: 'selection-store' },
    stateAccessorsApi: accessors('EditorState', 'state-accessors'),
    getElementId() {},
    getDocument() {},
    getActiveSlide() {},
    getElementById() {}
  };

  const result = shellStateRuntime.createStudioEditorShellStateRuntime(options);

  assert.deepEqual(result, {
    sessionStateBridge: 'session-bridge',
    sessionStateAccessors: 'session-accessors',
    stateBridge: 'state-bridge',
    stateAccessors: 'state-accessors'
  });
  assert.equal(calls[0][1].runtimeApi, options.sessionStateRuntimeApi);
  assert.equal(calls[1][1].bridge, 'session-bridge');
  assert.equal(calls[2][1].getElementId, options.getElementId);
  assert.equal(calls[3][1].getDocument, options.getDocument);
});

test('shell state runtime preserves safe fallbacks when dependencies are unavailable', () => {
  assert.deepEqual(shellStateRuntime.createStudioEditorShellStateRuntime(), {
    sessionStateBridge: null,
    sessionStateAccessors: null,
    stateBridge: null,
    stateAccessors: null
  });
});

test('editor loads the shell state runtime after its bridge dependencies', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-shell-state-runtime\.js"><\/script>/
  );
  assert.match(fileContent, /createStudioEditorShellStateRuntime\(/);
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorSessionStateBridge\.createStudioEditorSessionStateBridge\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorStateBridge\.createStudioEditorStateBridge\(/
  );
});

test('shell state runtime publishes its browser global', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(RUNTIME_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorShellStateRuntime, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorShellStateRuntime
      .createStudioEditorShellStateRuntime,
    'function'
  );
});

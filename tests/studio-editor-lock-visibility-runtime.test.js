const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lockVisibilityRuntime = require('../shared/studio-editor-lock-visibility-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('lock visibility runtime composes canonical and mutation dependencies', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorLockVisibilityController(options) {
      calls.push(options);
      return { name: 'lock-visibility' };
    }
  };
  const options = {
    controllerApi,
    lockStateApi: {},
    visibilityStateApi: {},
    canonicalDeckApi: {},
    canonicalVisibilityApi: {},
    canonicalStateApi: {},
    getSelectedElements: () => [],
    getIframeDoc: () => null,
    getActiveSlide: () => null,
    isLocked: () => false,
    isHidden: () => false,
    setLocked: () => {},
    setHidden: () => {},
    getVisibilityState: () => ({}),
    assignLockElementId: () => '',
    assignVisibilityElementId: () => '',
    buildCanonicalDeckBaseline: () => ({}),
    getCanonicalDeckBaseline: () => ({}),
    applyLockMutation: () => ({}),
    applyVisibilityMutation: () => ({}),
    finalizeSelectionToggleMutation: () => {},
    rollbackSelectionToggleMutation: () => {}
  };

  assert.deepEqual(
    lockVisibilityRuntime.createStudioEditorLockVisibilityRuntime(options),
    { lockVisibilityController: { name: 'lock-visibility' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].canonicalDeckApi, options.canonicalDeckApi);
  assert.equal(calls[0].getSelectedElements, options.getSelectedElements);
  assert.equal(calls[0].buildCanonicalDeckBaseline, options.buildCanonicalDeckBaseline);
  assert.equal(calls[0].applyLockMutation, options.applyLockMutation);
  assert.equal(calls[0].finalizeSelectionToggleMutation, options.finalizeSelectionToggleMutation);
  assert.equal(calls[0].rollbackSelectionToggleMutation, options.rollbackSelectionToggleMutation);
});

test('index wires lock and visibility through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-lock-visibility-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-lock-visibility-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorLockVisibilityShellRuntime\.createStudioEditorLockVisibilityShellRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorLockVisibilityController\.createStudioEditorLockVisibilityController\(/
  );
  assert.match(fileContent, /function rollbackEditorLockVisibilityMutation\(/);
  assert.match(
    fileContent,
    /rollbackSelectionToggleMutation: \(\.\.\.args\) => rollbackEditorLockVisibilityMutation\(\.\.\.args\)/
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const alignmentStateShellRuntime = require('../shared/studio-editor-alignment-state-shell-runtime.js');
const alignmentStateAccessors = require('../shared/studio-editor-alignment-state-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('alignment-state shell runtime forwards motion and lock callbacks', () => {
  let receivedOptions = null;
  const controller = { buildActionState() {}, sync() {} };
  const alignmentStateApi = {
    createStudioEditorAlignmentStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const options = {
    alignmentStateApi,
    alignmentApi: { name: 'alignment' },
    getDocument: () => null,
    buildMotionActionState: () => ({}),
    getLockedState: () => () => false,
    getActionState: () => ({}),
    documentRef: { id: 'editor' }
  };

  const runtime = alignmentStateShellRuntime
    .createStudioEditorAlignmentStateShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.alignmentStateController, controller);
  assert.equal(receivedOptions.alignmentApi, options.alignmentApi);
  assert.equal(receivedOptions.getDocument, options.getDocument);
  assert.equal(receivedOptions.buildMotionActionState, options.buildMotionActionState);
  assert.equal(receivedOptions.getLockedState, options.getLockedState);
  assert.equal(receivedOptions.getActionState, options.getActionState);
  assert.equal(receivedOptions.documentRef, options.documentRef);
});

test('alignment-state shell runtime fails closed when the shared state API is unavailable', () => {
  const runtime = alignmentStateShellRuntime
    .createStudioEditorAlignmentStateShellRuntime({ alignmentStateApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.alignmentStateController, null);
});

test('alignment-state accessors compose the shell runtime and preserve dependencies', () => {
  const runtime = { isAvailable: true, alignmentStateController: { name: 'alignment' } };
  const runtimeOptions = { getDocument: () => null };
  const calls = [];
  const runtimeApi = {
    createStudioEditorAlignmentStateShellRuntime(options) {
      calls.push(options);
      return runtime;
    }
  };
  const alignmentStateApi = { name: 'state' };
  const accessors = alignmentStateAccessors.createStudioEditorAlignmentStateAccessors({
    runtimeApi,
    alignmentStateApi,
    runtimeOptions
  });

  assert.equal(accessors.runtime, runtime);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].alignmentStateApi, alignmentStateApi);
  assert.equal(calls[0].getDocument, runtimeOptions.getDocument);
  assert.notEqual(calls[0], runtimeOptions);
});

test('alignment-state accessors fail closed when the shell runtime is unavailable', () => {
  const accessors = alignmentStateAccessors.createStudioEditorAlignmentStateAccessors({
    runtimeApi: null
  });

  assert.equal(accessors.runtime, null);
});

test('index routes alignment-state construction through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-alignment-state-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-alignment-state-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-alignment-state-shell-composition\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorAlignmentStateShellCompositionApi\s*\.\s*createStudioEditorAlignmentStateShellComposition\(/
  );
  assert.match(
    fileContent,
    /studioEditorAlignmentStateController = studioEditorAlignmentStateShellComposition/
  );
});

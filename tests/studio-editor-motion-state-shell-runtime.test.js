const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const motionStateShellRuntime = require('../shared/studio-editor-motion-state-shell-runtime.js');
const motionStateAccessors = require('../shared/studio-editor-motion-state-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('motion-state shell runtime forwards nudge and geometry callbacks', () => {
  let receivedOptions = null;
  const controller = { buildActionState() {}, sync() {} };
  const motionStateApi = {
    createStudioEditorMotionStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const options = {
    motionStateApi,
    nudgeApi: { name: 'nudge' },
    getDocument: () => null,
    getSelectedElements: () => [],
    getActiveSlide: () => null,
    getNudgeSelectionState: () => ({}),
    getSlideMetrics: () => null,
    buildPositionedLayoutItems: () => [],
    getClosestPositionedAncestor: () => null,
    getRectOnSlide: () => null,
    getActionState: () => ({}),
    documentRef: { id: 'editor' }
  };

  const runtime = motionStateShellRuntime
    .createStudioEditorMotionStateShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.motionStateController, controller);
  assert.equal(receivedOptions.nudgeApi, options.nudgeApi);
  assert.equal(receivedOptions.getDocument, options.getDocument);
  assert.equal(receivedOptions.getSelectedElements, options.getSelectedElements);
  assert.equal(receivedOptions.getActiveSlide, options.getActiveSlide);
  assert.equal(receivedOptions.getNudgeSelectionState, options.getNudgeSelectionState);
  assert.equal(receivedOptions.getSlideMetrics, options.getSlideMetrics);
  assert.equal(receivedOptions.buildPositionedLayoutItems, options.buildPositionedLayoutItems);
  assert.equal(receivedOptions.getClosestPositionedAncestor, options.getClosestPositionedAncestor);
  assert.equal(receivedOptions.getRectOnSlide, options.getRectOnSlide);
  assert.equal(receivedOptions.getActionState, options.getActionState);
  assert.equal(receivedOptions.documentRef, options.documentRef);
});

test('motion-state shell runtime fails closed when the shared state API is unavailable', () => {
  const runtime = motionStateShellRuntime
    .createStudioEditorMotionStateShellRuntime({ motionStateApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.motionStateController, null);
});

test('motion-state accessors compose the shell runtime and preserve dependencies', () => {
  const runtime = { isAvailable: true, motionStateController: { name: 'motion' } };
  const runtimeOptions = { getDocument: () => null };
  const calls = [];
  const runtimeApi = {
    createStudioEditorMotionStateShellRuntime(options) {
      calls.push(options);
      return runtime;
    }
  };
  const motionStateApi = { name: 'state' };
  const accessors = motionStateAccessors.createStudioEditorMotionStateAccessors({
    runtimeApi,
    motionStateApi,
    runtimeOptions
  });

  assert.equal(accessors.runtime, runtime);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].motionStateApi, motionStateApi);
  assert.equal(calls[0].getDocument, runtimeOptions.getDocument);
  assert.notEqual(calls[0], runtimeOptions);
});

test('motion-state accessors fail closed when the shell runtime is unavailable', () => {
  const accessors = motionStateAccessors.createStudioEditorMotionStateAccessors({
    runtimeApi: null
  });

  assert.equal(accessors.runtime, null);
});

test('index routes motion-state construction through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-motion-state-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-motion-state-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-motion-state-shell-composition\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorMotionStateShellCompositionApi\s*\.\s*createStudioEditorMotionStateShellComposition\(/
  );
  assert.match(
    fileContent,
    /studioEditorMotionStateController = studioEditorMotionStateShellComposition/
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-motion-state-shell-composition.js');

test('motion state shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { buildActionState() {}, sync() {} };
  const runtime = { isAvailable: true, motionStateController: controller };
  const accessorsApi = {
    createStudioEditorMotionStateAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const motionStateApi = { name: 'motion-state' };
  const nudgeApi = { name: 'nudge' };
  const getDocument = () => null;

  const result = composition.createStudioEditorMotionStateShellComposition({
    accessorsApi,
    runtimeApi,
    motionStateApi,
    nudgeApi,
    runtimeOptions: { getDocument }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.motionStateApi, motionStateApi);
  assert.equal(receivedOptions.runtimeOptions.nudgeApi, nudgeApi);
  assert.equal(receivedOptions.runtimeOptions.getDocument, getDocument);
});

test('motion state shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorMotionStateShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-alignment-state-shell-composition.js');

test('alignment state shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { buildActionState() {}, sync() {} };
  const runtime = { isAvailable: true, alignmentStateController: controller };
  const accessorsApi = {
    createStudioEditorAlignmentStateAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const alignmentStateApi = { name: 'alignment-state' };
  const alignmentApi = { name: 'alignment' };
  const getDocument = () => null;

  const result = composition.createStudioEditorAlignmentStateShellComposition({
    accessorsApi,
    runtimeApi,
    alignmentStateApi,
    alignmentApi,
    runtimeOptions: { getDocument }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.alignmentStateApi, alignmentStateApi);
  assert.equal(receivedOptions.runtimeOptions.alignmentApi, alignmentApi);
  assert.equal(receivedOptions.runtimeOptions.getDocument, getDocument);
});

test('alignment state shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorAlignmentStateShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-transform-shell-runtime.js');

test('transform shell runtime resolves the interaction dependency bundle', () => {
  let receivedOptions = null;
  const resultValue = { name: 'transform-runtime' };
  const transformRuntimeApi = {
    createStudioEditorTransformRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    controllerApi: { name: 'controller' },
    transformApi: { name: 'transform' },
    canonicalTransformApi: { name: 'canonical-transform' },
    canonicalDeckApi: { name: 'deck' },
    transactionApi: { name: 'transaction' },
    domApi: { name: 'dom' },
    interactionOptionsApi: { name: 'interaction-options' },
    interactionsApi: { name: 'interactions' },
    eventsApi: { name: 'events' },
    selectionBoundsApi: { name: 'selection-bounds' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorTransformShellRuntime({
    transformRuntimeApi,
    ...dependencies,
    getActiveSlide: callback
  });

  assert.equal(result, resultValue);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions[key], value);
  }
  assert.equal(receivedOptions.getActiveSlide, callback);
  assert.equal(receivedOptions.transformRuntimeApi, undefined);
});

test('transform shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const transformRuntimeApi = {
    createStudioEditorTransformRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorTransformShellRuntime({
    transformRuntimeApi,
    controllerApi: null,
    transformApi: null,
    canonicalTransformApi: null,
    canonicalDeckApi: null,
    transactionApi: null,
    domApi: null,
    interactionOptionsApi: null,
    interactionsApi: null,
    eventsApi: null,
    selectionBoundsApi: null
  });

  for (const key of [
    'controllerApi',
    'transformApi',
    'canonicalTransformApi',
    'canonicalDeckApi',
    'transactionApi',
    'domApi',
    'interactionOptionsApi',
    'interactionsApi',
    'eventsApi',
    'selectionBoundsApi'
  ]) {
    assert.equal(receivedOptions[key], null);
  }
});

test('transform shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorTransformShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorTransformShellRuntime({ transformRuntimeApi: {} }),
    null
  );
});

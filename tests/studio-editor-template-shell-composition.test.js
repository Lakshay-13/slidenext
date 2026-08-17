const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-template-shell-composition.js');

test('template shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { save() {} };
  const runtime = { templateController: controller };
  const accessorsApi = {
    createStudioEditorTemplateRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const templateRuntimeApi = { name: 'runtime' };
  const dependencies = {
    controllerApi: { name: 'controller-api' },
    canonicalDeckApi: { name: 'canonical-deck' },
    canonicalStateApi: { name: 'canonical-state' },
    renderApi: { name: 'render' },
    insertionMutationApi: { name: 'insertion-mutation' },
    insertionTransactionApi: { name: 'insertion-transaction' },
    slideCommandsApi: { name: 'slide-commands' },
    deckViewApi: { name: 'deck-view' },
    transactionApi: { name: 'transaction' }
  };
  const getCanonicalDeck = () => null;

  const result = composition.createStudioEditorTemplateShellComposition({
    accessorsApi,
    runtimeApi,
    templateRuntimeApi,
    ...dependencies,
    runtimeOptions: { getCanonicalDeck }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.templateRuntimeApi, templateRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions.getCanonicalDeck, getCanonicalDeck);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions.runtimeOptions[key], value);
  }
});

test('template shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorTemplateShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});

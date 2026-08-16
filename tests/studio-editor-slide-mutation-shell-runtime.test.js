const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-slide-mutation-shell-runtime.js');
const mutationAccessors = require('../shared/studio-editor-slide-mutation-accessors.js');

test('slide mutation shell runtime resolves mutation controllers and canonical dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'slide-mutation-runtime' };
  const mutationRuntimeApi = {
    createStudioEditorSlideMutationRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    reorderApi: { name: 'reorder' },
    insertionApi: { name: 'insertion' },
    deletionApi: { name: 'deletion' },
    duplicationApi: { name: 'duplication' },
    slideCommandsApi: { name: 'commands' },
    canonicalSlideApi: { name: 'slide' },
    canonicalDeckApi: { name: 'deck' },
    deckImportApi: { name: 'import' },
    insertionMutationApi: { name: 'insertion-mutation' },
    insertionTransactionApi: { name: 'insertion-transaction' },
    reorderMutationApi: { name: 'reorder-mutation' },
    reorderTransactionApi: { name: 'reorder-transaction' },
    deckViewApi: { name: 'deck-view' },
    deletionMutationApi: { name: 'deletion-mutation' },
    deletionTransactionApi: { name: 'deletion-transaction' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorSlideMutationShellRuntime({
    mutationRuntimeApi,
    ...dependencies,
    getIframeDoc: callback
  });

  assert.equal(result, resultValue);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions[key], value);
  }
  assert.equal(receivedOptions.getIframeDoc, callback);
  assert.equal(receivedOptions.mutationRuntimeApi, undefined);
});

test('slide mutation shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const mutationRuntimeApi = {
    createStudioEditorSlideMutationRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorSlideMutationShellRuntime({
    mutationRuntimeApi,
    reorderApi: null,
    insertionApi: null,
    deletionApi: null,
    duplicationApi: null,
    slideCommandsApi: null,
    canonicalSlideApi: null,
    canonicalDeckApi: null,
    deckImportApi: null,
    insertionMutationApi: null,
    insertionTransactionApi: null,
    reorderMutationApi: null,
    reorderTransactionApi: null,
    deckViewApi: null,
    deletionMutationApi: null,
    deletionTransactionApi: null
  });

  assert.equal(receivedOptions.reorderApi, null);
  assert.equal(receivedOptions.insertionApi, null);
  assert.equal(receivedOptions.deletionApi, null);
  assert.equal(receivedOptions.duplicationApi, null);
  assert.equal(receivedOptions.slideCommandsApi, null);
  assert.equal(receivedOptions.canonicalSlideApi, null);
  assert.equal(receivedOptions.canonicalDeckApi, null);
  assert.equal(receivedOptions.deckImportApi, null);
  assert.equal(receivedOptions.insertionMutationApi, null);
  assert.equal(receivedOptions.insertionTransactionApi, null);
  assert.equal(receivedOptions.reorderMutationApi, null);
  assert.equal(receivedOptions.reorderTransactionApi, null);
  assert.equal(receivedOptions.deckViewApi, null);
  assert.equal(receivedOptions.deletionMutationApi, null);
  assert.equal(receivedOptions.deletionTransactionApi, null);
});

test('slide mutation shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorSlideMutationShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorSlideMutationShellRuntime({ mutationRuntimeApi: {} }),
    null
  );
});

test('slide mutation accessors compose the shell runtime and preserve its result', () => {
  const runtime = { slideInsertionController: { name: 'insert' } };
  const calls = [];
  const runtimeApi = {
    createStudioEditorSlideMutationShellRuntime(options) {
      calls.push(options);
      return runtime;
    }
  };
  const insertionApi = { name: 'insertion-api' };
  const callbacks = {
    getIframeDoc: () => ({ id: 'document' }),
    getPendingCanonicalDeck: () => ({ kind: 'deck' })
  };
  const accessors = mutationAccessors.createStudioEditorSlideMutationAccessors({
    runtimeApi,
    mutationRuntimeApi: { name: 'mutation-runtime' },
    insertionApi,
    ...callbacks
  });

  assert.equal(accessors.runtime, runtime);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].mutationRuntimeApi.name, 'mutation-runtime');
  assert.equal(calls[0].insertionApi, insertionApi);
  assert.equal(calls[0].getIframeDoc, callbacks.getIframeDoc);
  assert.equal(calls[0].getPendingCanonicalDeck, callbacks.getPendingCanonicalDeck);
});

test('slide mutation accessors fail closed when the shell runtime is unavailable', () => {
  const accessors = mutationAccessors.createStudioEditorSlideMutationAccessors({
    runtimeApi: null
  });

  assert.equal(accessors.runtime, null);
});

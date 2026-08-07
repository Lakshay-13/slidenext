const test = require('node:test');
const assert = require('node:assert/strict');
const editorPersistenceState = require('../shared/studio-editor-persistence-state.js');

test('createStudioEditorPersistedDeckStateAdapter lazily reuses the shared updater', () => {
  let createCalls = 0;
  const delegatedStates = [];
  const persistenceApi = {
    createStudioPersistedDeckStateUpdater(options) {
      createCalls += 1;
      return (nextState) => {
        delegatedStates.push([nextState, options]);
        return { ...nextState, normalized: true };
      };
    }
  };
  const adapter = editorPersistenceState.createStudioEditorPersistedDeckStateAdapter({
    persistenceApi
  });

  assert.deepEqual(adapter({ cleanHtml: '<html>one</html>' }), {
    cleanHtml: '<html>one</html>',
    normalized: true
  });
  assert.deepEqual(adapter({ cleanHtml: '<html>two</html>' }), {
    cleanHtml: '<html>two</html>',
    normalized: true
  });
  assert.equal(createCalls, 1);
  assert.deepEqual(delegatedStates.map(([nextState]) => nextState), [
    { cleanHtml: '<html>one</html>' },
    { cleanHtml: '<html>two</html>' }
  ]);
});

test('createStudioEditorPersistedDeckStateAdapter fails closed without shared persistence', () => {
  const adapter = editorPersistenceState.createStudioEditorPersistedDeckStateAdapter();
  assert.deepEqual(adapter({ cleanHtml: '<html>ignored</html>' }), {});
});

test('createStudioEditorPersistedDeckStateApplierAdapter reuses the shared applier and preserves call options', () => {
  let createCalls = 0;
  let capturedOptions = null;
  const persistenceApi = {
    createStudioPersistedDeckStateApplier(options) {
      createCalls += 1;
      capturedOptions = options;
      return (nextState, nextOptions) => ({ nextState, nextOptions });
    }
  };
  const updatePersistedDeckState = () => {};
  const setCurrentPresentationCanonicalDeck = () => {};
  const adapter = editorPersistenceState.createStudioEditorPersistedDeckStateApplierAdapter({
    persistenceApi,
    currentPresentationUrl: '/presentations/deck/index.html',
    updatePersistedDeckState,
    setCurrentPresentationCanonicalDeck
  });
  const nextState = { canonicalDeck: { slides: [] } };
  const nextOptions = { presentationUrl: '/presentations/custom/index.html' };

  assert.deepEqual(adapter(nextState, nextOptions), { nextState, nextOptions });
  assert.deepEqual(adapter(nextState, nextOptions), { nextState, nextOptions });
  assert.equal(createCalls, 1);
  assert.equal(capturedOptions.currentPresentationUrl, '/presentations/deck/index.html');
  assert.equal(capturedOptions.updatePersistedDeckState, updatePersistedDeckState);
  assert.equal(capturedOptions.setCurrentPresentationCanonicalDeck, setCurrentPresentationCanonicalDeck);
});

test('createStudioEditorPersistedDeckStateApplierAdapter returns input state without shared persistence', () => {
  const adapter = editorPersistenceState.createStudioEditorPersistedDeckStateApplierAdapter();
  const nextState = { playbackState: null };
  assert.equal(adapter(nextState), nextState);
});

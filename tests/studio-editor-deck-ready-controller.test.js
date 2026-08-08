const test = require('node:test');
const assert = require('node:assert/strict');

const deckReadyController = require('../shared/studio-editor-deck-ready-controller.js');

test('resolves deck readiness from the current document, persisted content, canonical baseline, and save state', () => {
  const doc = { documentElement: {} };
  const calls = [];
  const controller = deckReadyController.createStudioEditorDeckReadyController({
    deckReadyApi: {
      resolveStudioDeckReadyActionState(options) {
        calls.push(options);
        return { canUseDeckActions: true };
      }
    },
    getDocument: () => doc,
    getPresentationUrl: () => '/presentations/deck/index.html',
    getPersistedDeckState: () => ({ cleanHtml: '<html>deck</html>' }),
    resolvePersistedDeckStateWithContent: (state) => ({ ...state, resolved: true }),
    getStoredCanonicalDeck: () => ({ kind: 'slidenext.deck' }),
    getSaveButtonState: () => 'saving-version'
  });

  assert.deepEqual(controller.resolve(), { canUseDeckActions: true });
  assert.deepEqual(calls, [{
    doc,
    presentationUrl: '/presentations/deck/index.html',
    persistedDeckStateWithContent: {
      cleanHtml: '<html>deck</html>',
      resolved: true
    },
    storedCanonicalDeck: { kind: 'slidenext.deck' },
    saveButtonState: 'saving-version'
  }]);
});

test('updates toolbar state with the same readiness inputs and live document reference', () => {
  const calls = [];
  const documentRef = { id: 'editor-document' };
  const doc = { id: 'iframe-document' };
  const controller = deckReadyController.createStudioEditorDeckReadyController({
    deckReadyApi: {
      syncStudioDeckReadyToolbarActionState(options) {
        calls.push(options);
        return 'updated';
      }
    },
    documentRef,
    getDocument: () => doc,
    getPresentationUrl: () => '/presentations/deck/index.html',
    getPersistedDeckState: () => ({ cleanHtml: '<html>deck</html>' }),
    getStoredCanonicalDeck: () => null,
    getSaveButtonState: () => 'idle'
  });

  assert.equal(controller.update(), 'updated');
  assert.equal(calls[0].documentRef, documentRef);
  assert.equal(calls[0].doc, doc);
  assert.equal(calls[0].presentationUrl, '/presentations/deck/index.html');
});

test('fails closed when the shared deck-ready API is unavailable', () => {
  const controller = deckReadyController.createStudioEditorDeckReadyController({ deckReadyApi: null });

  assert.deepEqual(controller.resolve(), {
    canUseSaveButton: false,
    canUseDeckActions: false,
    canLaunchPreview: false
  });
  assert.equal(controller.update(), false);
});

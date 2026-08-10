const test = require('node:test');
const assert = require('node:assert/strict');

const globalShortcuts = require('../shared/studio-editor-global-shortcuts.js');

test('global shortcut binding fails closed when the shared events runtime is unavailable', () => {
  const listeners = [];
  const documentRef = {
    addEventListener(type, handler) {
      listeners.push({ type, handler });
    }
  };

  assert.equal(globalShortcuts.bindStudioGlobalKeydownHandler({ documentRef }), false);
  assert.deepEqual(listeners, []);
});

test('global shortcut binding registers the shared keydown handler with its callbacks', () => {
  const listeners = [];
  const documentRef = {
    addEventListener(type, handler) {
      listeners.push({ type, handler });
    }
  };
  const callbacks = {
    editorUndo() {},
    editorRedo() {},
    getActiveElement() {},
    getSelectedElements() {},
    isEditorActive() {},
    canMutateDeck() {}
  };
  let receivedOptions = null;
  const eventsApi = {
    createStudioGlobalKeydownHandler(options) {
      receivedOptions = options;
      return () => {};
    }
  };

  assert.equal(globalShortcuts.bindStudioGlobalKeydownHandler({
    documentRef,
    eventsApi,
    ...callbacks
  }), true);
  assert.equal(listeners.length, 1);
  assert.equal(listeners[0].type, 'keydown');
  assert.equal(typeof listeners[0].handler, 'function');
  assert.equal(receivedOptions.documentRef, undefined);
  assert.equal(receivedOptions.eventsApi, undefined);
  assert.equal(receivedOptions.editorUndo, callbacks.editorUndo);
});

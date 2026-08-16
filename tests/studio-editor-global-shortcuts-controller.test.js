const test = require('node:test');
const assert = require('node:assert/strict');

const shortcutsController = require('../shared/studio-editor-global-shortcuts-controller.js');

test('global shortcuts controller binds the shared shortcut runtime with its callbacks', () => {
  const documentRef = { id: 'editor-document' };
  const eventsApi = { id: 'events-api' };
  const calls = [];
  const editorUndo = () => {};
  const shortcutsApi = {
    bindStudioGlobalKeydownHandler(options) {
      calls.push(options);
      return true;
    }
  };
  const isEditorActive = () => true;
  const controller = shortcutsController.createStudioEditorGlobalShortcutsController({
    documentRef,
    eventsApi,
    shortcutsApi,
    editorUndo,
    isEditorActive
  });

  assert.equal(controller.bind(), true);
  assert.deepEqual(calls[0], {
    documentRef,
    eventsApi,
    editorUndo,
    isEditorActive
  });
  assert.equal(calls[0].editorUndo, editorUndo);
  assert.equal(calls[0].shortcutsApi, undefined);
});

test('global shortcuts controller fails closed without a shared shortcut runtime', () => {
  const controller = shortcutsController.createStudioEditorGlobalShortcutsController({
    shortcutsApi: null,
    documentRef: { id: 'editor-document' }
  });

  assert.equal(controller.bind(), false);
});

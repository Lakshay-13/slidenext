const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const compositionShellRuntime = require('../shared/studio-editor-selection-composition-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('selection composition shell runtime forwards model, adapter, and chrome callbacks', () => {
  let receivedOptions = null;
  const controller = { apply() {}, refreshClasses() {}, commit() {} };
  const compositionApi = {
    createStudioEditorSelectionCompositionController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const options = {
    compositionApi,
    selectionApi: { name: 'selection' },
    selectionStateAdapter: { name: 'state' },
    selectionCommitAdapter: { name: 'commit' },
    selectionClassAdapter: { name: 'class' },
    getDocument: () => ({ id: 'document' }),
    getSelectedElements: () => [],
    getSelectionOptions: () => ({}),
    getRefreshSelectionOptions: () => ({}),
    setSelectionState: () => {},
    clearSelectionState: () => {},
    syncSelectionOverlay: () => {},
    syncInspectorForSelection: () => {},
    updateLayersList: () => {}
  };
  const runtime = compositionShellRuntime
    .createStudioEditorSelectionCompositionShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.selectionCompositionController, controller);
  assert.equal(receivedOptions.selectionApi, options.selectionApi);
  assert.equal(receivedOptions.selectionStateAdapter, options.selectionStateAdapter);
  assert.equal(receivedOptions.selectionCommitAdapter, options.selectionCommitAdapter);
  assert.equal(receivedOptions.selectionClassAdapter, options.selectionClassAdapter);
  assert.equal(receivedOptions.getDocument, options.getDocument);
  assert.equal(receivedOptions.getSelectedElements, options.getSelectedElements);
  assert.equal(receivedOptions.syncSelectionOverlay, options.syncSelectionOverlay);
  assert.equal(receivedOptions.syncInspectorForSelection, options.syncInspectorForSelection);
  assert.equal(receivedOptions.updateLayersList, options.updateLayersList);
});

test('selection composition shell runtime fails closed when the shared composition API is unavailable', () => {
  const runtime = compositionShellRuntime
    .createStudioEditorSelectionCompositionShellRuntime({ compositionApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.selectionCompositionController, null);
});

test('index routes selection composition through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-selection-composition-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-selection-composition-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorSelectionCompositionRuntimeAccessorsApi\s*\.\s*createStudioEditorSelectionCompositionRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorSelectionCompositionShellRuntimeApi\s*\.\s*createStudioEditorSelectionCompositionShellRuntime\(/
  );
  assert.match(
    fileContent,
    /studioEditorSelectionCompositionController = studioEditorSelectionCompositionShellRuntime/
  );
});

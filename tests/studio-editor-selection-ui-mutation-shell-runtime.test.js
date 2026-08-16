const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const selectionUiMutationShellRuntime = require('../shared/studio-editor-selection-ui-mutation-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('selection UI mutation shell runtime forwards selected elements and sync options', () => {
  const calls = [];
  const selectionApi = {
    syncStudioSelectionUiAfterMutation(selectedElements, options) {
      calls.push([selectedElements, options]);
      return 'synced';
    }
  };
  const selectedElements = [{ id: 'node-1' }];
  const syncOptions = { doc: { id: 'editor-document' } };
  const runtime = selectionUiMutationShellRuntime
    .createStudioEditorSelectionUiMutationShellRuntime({ selectionApi });

  assert.equal(runtime.sync(selectedElements, syncOptions), 'synced');
  assert.equal(runtime.isAvailable, true);
  assert.deepEqual(calls, [[selectedElements, syncOptions]]);
});

test('selection UI mutation shell runtime fails closed when the shared selection API is unavailable', () => {
  const runtime = selectionUiMutationShellRuntime
    .createStudioEditorSelectionUiMutationShellRuntime({ selectionApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.sync([], {}), false);
});

test('index routes selection UI mutation synchronization through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-selection-ui-mutation-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorSelectionUiMutationRuntimeAccessorsApi\s*\.\s*createStudioEditorSelectionUiMutationRuntimeAccessors\(/
  );
  assert.match(
    fileContent,
    /studioEditorSelectionUiMutationSynchronizer = studioEditorSelectionUiMutationShellRuntime/
  );
});

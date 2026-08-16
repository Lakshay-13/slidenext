const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-version-rename-modal-runtime-accessors.js');

test('version rename modal runtime accessors delegate shell construction', () => {
  let receivedOptions = null;
  const runtimeValue = { isAvailable: true };
  const runtimeApi = {
    createStudioEditorVersionRenameModalShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    modalControllerApi: { name: 'controller' },
    documentRef: { name: 'document' },
    showModal: () => true
  };

  const result = accessors.createStudioEditorVersionRenameModalRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.deepEqual(receivedOptions, runtimeOptions);
});

test('version rename modal runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorVersionRenameModalRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorVersionRenameModalRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});

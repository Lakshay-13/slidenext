const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-persistable-deck-html-runtime-accessors.js');

test('persistable deck html runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { isAvailable: true, persistableDeckHtmlAction: () => '' };
  const runtimeApi = {
    createStudioEditorPersistableDeckHtmlShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    actionApi: { name: 'action' },
    buildPersistableDeckHtml: () => '<html></html>'
  };

  const result = accessors.createStudioEditorPersistableDeckHtmlRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('persistable deck html runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorPersistableDeckHtmlRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorPersistableDeckHtmlRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});

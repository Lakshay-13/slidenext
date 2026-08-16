const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-reusable-persisted-html-sanitizer-runtime-accessors.js');

test('reusable persisted html sanitizer runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { isAvailable: true, reusablePersistedHtmlSanitizerAction: () => '' };
  const runtimeApi = {
    createStudioEditorReusablePersistedHtmlSanitizerShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    deckPersistenceApi: { name: 'deck-persistence' },
    buildEditorPersistableDeckSanitizerOptions: () => ({}),
    DOMParser: function DOMParser() {}
  };

  const result = accessors.createStudioEditorReusablePersistedHtmlSanitizerRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('reusable persisted html sanitizer runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorReusablePersistedHtmlSanitizerRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorReusablePersistedHtmlSanitizerRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-persistable-deck-html-shell-composition.js');

test('persistable deck html shell composition resolves the runtime and preserves callbacks', () => {
  let receivedOptions = null;
  const runtimeOptions = {
    getDocument: () => null,
    getBuildCanonicalDeck: () => null,
    buildPersistableDeckHtml: () => '<html></html>'
  };
  const runtime = {
    isAvailable: true,
    persistableDeckHtmlAction: () => '<html></html>'
  };
  const accessorsApi = {
    createStudioEditorPersistableDeckHtmlRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'persistable-html-shell-runtime' };

  const result = composition.createStudioEditorPersistableDeckHtmlShellComposition({
    accessorsApi,
    runtimeApi,
    runtimeOptions
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.runtimeOptions, runtimeOptions);
});

test('persistable deck html shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorPersistableDeckHtmlShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null }
  );
});

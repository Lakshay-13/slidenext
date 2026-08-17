const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const assetInsertionShellRuntime = require('../shared/studio-editor-asset-insertion-shell-runtime.js');
const assetInsertionRuntimeAccessors = require('../shared/studio-editor-asset-insertion-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('asset insertion runtime accessors delegate to the shell runtime', () => {
  const runtime = { isAvailable: true, assetInsertionController: { insert() {} } };
  let receivedOptions = null;
  const shellRuntimeApi = {
    createStudioEditorAssetInsertionShellRuntime(options) {
      receivedOptions = options;
      return runtime;
    }
  };
  const assetInsertionApi = { name: 'asset-insertion' };
  const getDocument = () => null;

  const result = assetInsertionRuntimeAccessors
    .createStudioEditorAssetInsertionRuntimeAccessors({
      runtimeApi: shellRuntimeApi,
      assetInsertionApi,
      runtimeOptions: { getDocument }
    });

  assert.deepEqual(result, { runtime });
  assert.equal(receivedOptions.assetInsertionApi, assetInsertionApi);
  assert.equal(receivedOptions.getDocument, getDocument);
});

test('asset insertion runtime accessors fail closed without a shell runtime', () => {
  assert.deepEqual(
    assetInsertionRuntimeAccessors.createStudioEditorAssetInsertionRuntimeAccessors({
      runtimeApi: null
    }),
    { runtime: null }
  );
});

test('asset insertion shell runtime forwards canonical insertion dependencies', () => {
  let receivedOptions = null;
  const controller = { insert() {} };
  const assetInsertionApi = {
    createStudioEditorAssetInsertionController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const options = {
    assetInsertionApi,
    canonicalDeckApi: { name: 'canonical-deck' },
    getDocument: () => null,
    resolveCanonicalDeck: () => null,
    insertionController: { name: 'element-insertion' }
  };

  const runtime = assetInsertionShellRuntime
    .createStudioEditorAssetInsertionShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.assetInsertionController, controller);
  assert.equal(receivedOptions.canonicalDeckApi, options.canonicalDeckApi);
  assert.equal(receivedOptions.getDocument, options.getDocument);
  assert.equal(receivedOptions.resolveCanonicalDeck, options.resolveCanonicalDeck);
  assert.equal(receivedOptions.insertionController, options.insertionController);
});

test('asset insertion shell runtime fails closed when the bridge API is unavailable', () => {
  const runtime = assetInsertionShellRuntime
    .createStudioEditorAssetInsertionShellRuntime({ assetInsertionApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.assetInsertionController, null);
});

test('index routes asset insertion construction through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-asset-insertion-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-asset-insertion-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-asset-insertion-shell-composition\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorAssetInsertionShellCompositionApi/);
  assert.match(
    fileContent,
    /studioEditorAssetInsertionShellCompositionApi\s*\.\s*createStudioEditorAssetInsertionShellComposition\(/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorAssetInsertionShellRuntimeApi\s*\.\s*createStudioEditorAssetInsertionShellRuntime\(/
  );
  assert.match(
    fileContent,
    /studioEditorAssetInsertionController = studioEditorAssetInsertionShellComposition/
  );
});

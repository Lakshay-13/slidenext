const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const assetInsertionShellRuntime = require('../shared/studio-editor-asset-insertion-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

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
  assert.match(fileContent, /studioEditorAssetInsertionShellRuntimeApi/);
  assert.match(fileContent, /createStudioEditorAssetInsertionShellRuntime/);
  assert.match(
    fileContent,
    /studioEditorAssetInsertionController = studioEditorAssetInsertionShellRuntime/
  );
});

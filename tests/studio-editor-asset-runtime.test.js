const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const assetRuntime = require('../shared/studio-editor-asset-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('asset runtime composes controller dependencies without changing them', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorAssetController(options) {
      calls.push(options);
      return { name: 'asset' };
    }
  };
  const options = {
    controllerApi,
    canonicalDeckApi: {},
    canonicalStateApi: {},
    getCanonicalDeck: () => null,
    getCanonicalDeckBaseline: () => null,
    getDocument: () => null,
    getActiveSlideId: () => '',
    getSelectedImage: () => null,
    getElementId: () => '',
    isElementLocked: () => false,
    syncInspectorForSelection: () => {},
    saveHistoryState: () => {},
    triggerAutoSave: () => {},
    triggerAutoVersion: () => {},
    finalizeMutation: () => {},
    onAssetsChanged: () => {}
  };

  assert.deepEqual(
    assetRuntime.createStudioEditorAssetRuntime(options),
    { assetController: { name: 'asset' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].canonicalDeckApi, options.canonicalDeckApi);
  assert.equal(calls[0].canonicalStateApi, options.canonicalStateApi);
  assert.equal(calls[0].getDocument, options.getDocument);
  assert.equal(calls[0].getSelectedImage, options.getSelectedImage);
  assert.equal(calls[0].getElementId, options.getElementId);
  assert.equal(calls[0].isElementLocked, options.isElementLocked);
  assert.equal(calls[0].syncInspectorForSelection, options.syncInspectorForSelection);
  assert.equal(calls[0].finalizeMutation, options.finalizeMutation);
  assert.equal(calls[0].onAssetsChanged, options.onAssetsChanged);
});

test('index wires asset persistence through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-asset-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorAssetRuntime\.createStudioEditorAssetRuntime\(/
  );
  assert.match(
    fileContent,
    /getActiveSlideId: \(doc\) => getActiveSlideId\(doc \|\| getIframeDoc\(\)\),/
  );
  assert.match(
    fileContent,
    /getSelectedImage: \(doc\) => \{\s+const selectedElements = getStudioSelectedElements\(doc\);/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorAssetController\.createStudioEditorAssetController\(/
  );
});

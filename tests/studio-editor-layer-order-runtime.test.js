const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const layerOrderRuntime = require('../shared/studio-editor-layer-order-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('layer order runtime composes canonical and mutation dependencies', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorLayerOrderController(options) {
      calls.push(options);
      return { name: 'layer-order' };
    }
  };
  const options = {
    controllerApi,
    layerOrderApi: {},
    canonicalLayoutApi: {},
    canonicalDeckApi: {},
    getActiveSlide: () => null,
    getIframeDoc: () => null,
    getNormalizedSlideLayerOrder: () => [],
    isElementLocked: () => false,
    assignElementId: () => '',
    buildCanonicalDeckBaseline: () => ({}),
    getPendingCanonicalDeck: () => ({}),
    getCanonicalDeckBaseline: () => ({}),
    applyLayerOrderMutation: () => ({}),
    rollbackLayerOrderMutation: () => ({})
  };

  assert.deepEqual(
    layerOrderRuntime.createStudioEditorLayerOrderRuntime(options),
    { layerOrderController: { name: 'layer-order' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].canonicalLayoutApi, options.canonicalLayoutApi);
  assert.equal(calls[0].getNormalizedSlideLayerOrder, options.getNormalizedSlideLayerOrder);
  assert.equal(calls[0].buildCanonicalDeckBaseline, options.buildCanonicalDeckBaseline);
  assert.equal(calls[0].getPendingCanonicalDeck, options.getPendingCanonicalDeck);
  assert.equal(calls[0].applyLayerOrderMutation, options.applyLayerOrderMutation);
  assert.equal(calls[0].rollbackLayerOrderMutation, options.rollbackLayerOrderMutation);
});

test('index wires layer order through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-layer-order-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-layer-order-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorLayerOrderShellRuntime\.createStudioEditorLayerOrderShellRuntime\(/
  );
  assert.match(
    fileContent,
    /const studioEditorLayerOrderStateController =[\s\S]+?createStudioEditorLayerOrderStateController\(\{[\s\S]+?getDocument: \(\) => getIframeDoc\(\),[\s\S]+?getSelectedElements: \(sourceDoc\) => getStudioSelectedElements\(sourceDoc\),/
  );
  assert.match(
    fileContent,
    /studioEditorLayerOrderStateController\.buildActionState\(elements, options\)/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorLayerOrderController\.createStudioEditorLayerOrderController\(/
  );
  assert.match(fileContent, /function rollbackEditorLayerOrderMutation\(/);
  assert.match(
    fileContent,
    /rollbackLayerOrderMutation: \(\.\.\.args\) => rollbackEditorLayerOrderMutation\(\.\.\.args\)/
  );
});

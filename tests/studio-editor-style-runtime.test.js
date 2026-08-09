const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styleRuntime = require('../shared/studio-editor-style-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('style runtime composes canonical, inspector, and mutation dependencies', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorStyleController(options) {
      calls.push(options);
      return { name: 'style' };
    }
  };
  const options = {
    controllerApi,
    styleApi: {},
    chartApi: {},
    canonicalStyleApi: {},
    canonicalDeckApi: {},
    getSelectedElements: () => [],
    getIframeDoc: () => null,
    getActiveSlide: () => null,
    isElementLocked: () => false,
    syncInspectorForSelection: () => {},
    documentRef: {},
    highlightAlignButton: () => {},
    assignElementId: () => '',
    buildCanonicalDeck: () => ({}),
    buildCanonicalDeckBaseline: () => ({}),
    getCanonicalDeckBaseline: () => ({}),
    applyStyleMutation: () => ({}),
    finalizeDeckMutation: () => {}
  };

  assert.deepEqual(
    styleRuntime.createStudioEditorStyleRuntime(options),
    { styleController: { name: 'style' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].canonicalStyleApi, options.canonicalStyleApi);
  assert.equal(calls[0].chartApi, options.chartApi);
  assert.equal(calls[0].getSelectedElements, options.getSelectedElements);
  assert.equal(calls[0].documentRef, options.documentRef);
  assert.equal(calls[0].buildCanonicalDeck, options.buildCanonicalDeck);
  assert.equal(calls[0].buildCanonicalDeckBaseline, options.buildCanonicalDeckBaseline);
  assert.equal(calls[0].applyStyleMutation, options.applyStyleMutation);
});

test('index wires style through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-style-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorStyleRuntime\.createStudioEditorStyleRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorStyleController\.createStudioEditorStyleController\(/
  );
});

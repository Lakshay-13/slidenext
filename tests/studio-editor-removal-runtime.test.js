const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const removalRuntime = require('../shared/studio-editor-removal-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('removal runtime composes canonical and mutation dependencies', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorRemovalController(options) {
      calls.push(options);
      return { name: 'removal' };
    }
  };
  const options = {
    controllerApi,
    canonicalDeckApi: {},
    canonicalRemovalApi: {},
    buildRemovalSelectionActionState: () => ({}),
    finalizeRemovalActionResult: () => {},
    getIframeDoc: () => null,
    assignElementId: () => '',
    buildCanonicalDeckBaseline: () => ({}),
    getPendingCanonicalDeck: () => ({}),
    getCanonicalDeckBaseline: () => ({}),
    applyRemovalMutation: () => ({}),
    deselectElement: () => {},
    finalizeDeckMutation: () => {},
    rollbackMutation: () => {},
    restoreSelection: () => {}
  };

  assert.deepEqual(
    removalRuntime.createStudioEditorRemovalRuntime(options),
    { removalController: { name: 'removal' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].canonicalDeckApi, options.canonicalDeckApi);
  assert.equal(calls[0].buildRemovalSelectionActionState, options.buildRemovalSelectionActionState);
  assert.equal(calls[0].buildCanonicalDeckBaseline, options.buildCanonicalDeckBaseline);
  assert.equal(calls[0].getPendingCanonicalDeck, options.getPendingCanonicalDeck);
  assert.equal(calls[0].applyRemovalMutation, options.applyRemovalMutation);
  assert.equal(calls[0].finalizeDeckMutation, options.finalizeDeckMutation);
  assert.equal(calls[0].rollbackMutation, options.rollbackMutation);
  assert.equal(calls[0].restoreSelection, options.restoreSelection);
});

test('index wires removal through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-removal-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-removal-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorRemovalShellRuntime\.createStudioEditorRemovalShellRuntime\(/
  );
  assert.match(
    fileContent,
    /getSelectedElements: \(doc\) => getStudioSelectedElements\(doc\),/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorRemovalController\.createStudioEditorRemovalController\(/
  );
});

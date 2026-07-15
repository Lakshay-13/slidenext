const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('finalizeEditorDeckMutation delegates to the shared mutation finalizer', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function finalizeEditorDeckMutation(versionLabel, options = {}) {',
    '\n\n    // Apply styles immediately to active selected elements'
  );
  const calls = [];
  const context = {
    SlideNextStudioEditorMutation: {
      createStudioMutationFinalizer(options) {
        calls.push(['factory', Object.keys(options).sort()]);
        return (label, mutationOptions) => {
          calls.push(['finalize', label, mutationOptions]);
          return label;
        };
      }
    },
    syncSelectionOverlay() {},
    generateThumbnails() {},
    updateLayersList() {},
    saveHistoryState() {},
    triggerAutoSave() {},
    triggerAutoVersion() {}
  };
  vm.createContext(context);
  vm.runInContext(source, context);

  const options = {
    syncSelectionOverlay: true,
    refreshThumbnails: false,
    debounceHistory: true
  };
  assert.equal(context.finalizeEditorDeckMutation('Auto: Grouped Elements', options), 'Auto: Grouped Elements');
  assert.deepEqual(calls, [
    ['factory', [
      'generateThumbnails',
      'saveHistoryState',
      'syncSelectionOverlay',
      'triggerAutoSave',
      'triggerAutoVersion',
      'updateLayersList'
    ]],
    ['finalize', 'Auto: Grouped Elements', options]
  ]);
});

test('finalizeEditorDeckMutation supplies the canonical deck builder to shared mutation finalization', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function finalizeEditorDeckMutation(versionLabel, options = {}) {',
    '\n\n    // Apply styles immediately to active selected elements'
  );
  const canonicalDeck = { kind: 'slidenext.deck', slides: [{ id: 'slide-1' }] };
  let capturedMutationOptions = null;
  let capturedBuildCanonicalDeck = null;
  const context = {
    SlideNextStudioEditorMutation: {
      finalizeStudioMutation(options) {
        capturedMutationOptions = options.mutationOptions;
        capturedBuildCanonicalDeck = options.buildCanonicalDeck;
        return options.versionLabel;
      }
    },
    buildEditorCanonicalDeck() {
      return canonicalDeck;
    },
    syncSelectionOverlay() {},
    generateThumbnails() {},
    updateLayersList() {},
    saveHistoryState() {},
    triggerAutoSave() {},
    triggerAutoVersion() {}
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.finalizeEditorDeckMutation('Auto: Styled Element', {
    transaction: { id: 'tx-1' }
  }), 'Auto: Styled Element');
  assert.equal(capturedMutationOptions.canonicalDeck, undefined);
  assert.equal(capturedBuildCanonicalDeck(), canonicalDeck);
});

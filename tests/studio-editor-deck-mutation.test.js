const test = require('node:test');
const assert = require('node:assert/strict');

const deckMutation = require('../shared/studio-editor-deck-mutation.js');

test('finalizeStudioEditorDeckMutation delegates shared mutation finalization', () => {
  const calls = [];
  const mutationApi = {
    finalizeStudioMutation(options) {
      calls.push(options);
      return options.versionLabel;
    }
  };
  const options = {
    syncSelectionOverlay() {},
    generateThumbnails() {},
    updateLayersList() {},
    saveHistoryState() {},
    triggerAutoSave() {},
    triggerAutoVersion() {},
    buildCanonicalDeck() {}
  };

  assert.equal(
    deckMutation.finalizeStudioEditorDeckMutation('Auto: Move', { transaction: { id: 'tx' } }, {
      ...options,
      mutationApi
    }),
    'Auto: Move'
  );
  assert.equal(calls[0].versionLabel, 'Auto: Move');
  assert.deepEqual(calls[0].mutationOptions, { transaction: { id: 'tx' } });
  assert.equal(calls[0].buildCanonicalDeck, options.buildCanonicalDeck);
});

test('finalizeStudioEditorDeckMutation preserves canonical fallback history behavior', () => {
  const calls = [];
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const result = deckMutation.finalizeStudioEditorDeckMutation(
    'Auto: Style',
    { transaction: { id: 'tx' } },
    {
      buildCanonicalDeck(sourceDoc) {
        assert.equal(sourceDoc, undefined);
        return canonicalDeck;
      },
      syncSelectionOverlay() {},
      generateThumbnails() {},
      updateLayersList() {},
      saveHistoryState(...args) {
        calls.push(['history', ...args]);
      },
      triggerAutoSave() {
        calls.push(['save']);
      },
      triggerAutoVersion(label) {
        calls.push(['version', label]);
      }
    }
  );

  assert.equal(result, 'Auto: Style');
  assert.deepEqual(calls, [
    ['history', false, { id: 'tx' }, canonicalDeck],
    ['save'],
    ['version', 'Auto: Style']
  ]);
});

test('finalizeStudioEditorSelectionToggleMutation preserves selection and persistence ordering', () => {
  const calls = [];
  const result = deckMutation.finalizeStudioEditorSelectionToggleMutation(
    'Auto: Locked Element',
    { transaction: { id: 'tx' }, canonicalDeck: { id: 'deck' } },
    {
      syncSelectionUi() {
        calls.push('selection');
      },
      finalizeMutation(label, options) {
        calls.push(['finalize', label, options]);
      }
    }
  );

  assert.equal(result, true);
  assert.deepEqual(calls, [
    'selection',
    ['finalize', 'Auto: Locked Element', {
      refreshThumbnails: false,
      transaction: { id: 'tx' },
      canonicalDeck: { id: 'deck' }
    }]
  ]);
});

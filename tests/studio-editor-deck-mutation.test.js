const test = require('node:test');
const assert = require('node:assert/strict');

const deckMutation = require('../shared/studio-editor-deck-mutation.js');

test('createStudioEditorDeckMutationFinalizer reuses configured mutation dependencies', () => {
  const calls = [];
  const mutationApi = {
    finalizeStudioMutation(options) {
      calls.push(options);
      return options.versionLabel;
    }
  };
  const buildCanonicalDeck = () => ({ kind: 'slidenext.deck', slides: [] });
  const isCanonicalDeck = () => true;
  const finalizer = deckMutation.createStudioEditorDeckMutationFinalizer({
    mutationApi,
    buildCanonicalDeck,
    isCanonicalDeck,
    syncSelectionOverlay() {},
    generateThumbnails() {},
    updateLayersList() {},
    saveHistoryState() {},
    triggerAutoSave() {},
    triggerAutoVersion() {}
  });

  assert.equal(finalizer('Auto: Move', { transaction: { id: 'tx' } }), 'Auto: Move');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].mutationApi, undefined);
  assert.equal(calls[0].buildCanonicalDeck, buildCanonicalDeck);
  assert.equal(calls[0].isCanonicalDeck, isCanonicalDeck);
  assert.deepEqual(calls[0].mutationOptions, { transaction: { id: 'tx' } });
});

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

test('finalizeStudioEditorInsertedElements selects before persisting inserted content', () => {
  const calls = [];
  const insertedElements = [{ id: 'node-1' }];
  const result = deckMutation.finalizeStudioEditorInsertedElements(
    insertedElements,
    'Auto: Pasted Element',
    { id: 'tx' },
    { id: 'deck' },
    {
      selectionApi: {
        selectAllStudioElements(elements) {
          calls.push(['select', elements]);
          return { selectedElements: elements };
        }
      },
      commitSelectionState(state) {
        calls.push(['commit', state]);
      },
      finalizeMutation(label, options) {
        calls.push(['finalize', label, options]);
      }
    }
  );

  assert.equal(result, true);
  assert.deepEqual(calls, [
    ['select', insertedElements],
    ['commit', { selectedElements: insertedElements }],
    ['finalize', 'Auto: Pasted Element', {
      transaction: { id: 'tx' },
      canonicalDeck: { id: 'deck' }
    }]
  ]);
});

test('finalizeStudioEditorLayerOrderMutation preserves layer chrome and history ordering', () => {
  const calls = [];
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const result = deckMutation.finalizeStudioEditorLayerOrderMutation(
    'Auto: Layer Order',
    { transaction: { id: 'tx' }, canonicalDeck },
    {
      saveHistoryState(...args) {
        calls.push(['history', ...args]);
      },
      triggerAutoSave() {
        calls.push(['save']);
      },
      updateLayersList() {
        calls.push(['layers']);
      },
      updateLayerOrderActionState() {
        calls.push(['actions']);
      },
      triggerAutoVersion(label) {
        calls.push(['version', label]);
      }
    }
  );

  assert.equal(result, 'Auto: Layer Order');
  assert.deepEqual(calls, [
    ['history', false, { id: 'tx' }, canonicalDeck],
    ['save'],
    ['layers'],
    ['actions'],
    ['version', 'Auto: Layer Order']
  ]);
});

test('finalizeStudioEditorWallpaperMutation preserves canonical history fallback ordering', () => {
  const calls = [];
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const result = deckMutation.finalizeStudioEditorWallpaperMutation(
    'Auto: Changed Background',
    { id: 'tx' },
    canonicalDeck,
    {
      generateThumbnails() {
        calls.push(['thumbnails']);
      },
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

  assert.equal(result, 'Auto: Changed Background');
  assert.deepEqual(calls, [
    ['thumbnails'],
    ['history', false, { id: 'tx' }, canonicalDeck],
    ['save'],
    ['version', 'Auto: Changed Background']
  ]);
});

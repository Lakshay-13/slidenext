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
  const buildCanonicalDeck = () => ({ kind: 'slidenext.deck', slides: [{ id: 'legacy' }] });
  const buildCanonicalDeckBaseline = () => ({ kind: 'slidenext.deck', slides: [{ id: 'baseline' }] });
  const isCanonicalDeck = () => true;
  const finalizer = deckMutation.createStudioEditorDeckMutationFinalizer({
    mutationApi,
    buildCanonicalDeck,
    buildCanonicalDeckBaseline,
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
  assert.equal(calls[0].buildCanonicalDeck, buildCanonicalDeckBaseline);
  assert.equal(calls[0].isCanonicalDeck, isCanonicalDeck);
  assert.deepEqual(calls[0].mutationOptions, { transaction: { id: 'tx' } });
});

test('createStudioEditorDeckMutationFinalizer preserves positional canonical decks', () => {
  const calls = [];
  const mutationApi = {
    finalizeStudioMutation(options) {
      calls.push(options);
      return options.versionLabel;
    }
  };
  const finalizer = deckMutation.createStudioEditorDeckMutationFinalizer({
    mutationApi,
    isCanonicalDeck: () => true
  });
  const canonicalDeck = { kind: 'slidenext.deck', slides: [{ id: 'slide-1' }] };

  assert.equal(finalizer('Auto: Saved Block', { id: 'tx' }, canonicalDeck), 'Auto: Saved Block');
  assert.deepEqual(calls[0].mutationOptions, {
    transaction: { id: 'tx' },
    canonicalDeck
  });
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
      buildCanonicalDeck(sourceDoc, buildOptions) {
        assert.equal(sourceDoc, undefined);
        assert.deepEqual(buildOptions, { preferLiveCanonicalDeck: false });
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

test('finalizeStudioEditorDeckMutation preserves fallback persistence when thumbnail refresh throws', () => {
  const calls = [];
  const result = deckMutation.finalizeStudioEditorDeckMutation(
    'Auto: Style',
    { transaction: { id: 'tx' } },
    {
      generateThumbnails() {
        throw new Error('thumbnail refresh unavailable');
      },
      saveHistoryState() {
        calls.push('history');
      },
      triggerAutoSave() {
        calls.push('save');
      },
      triggerAutoVersion(label) {
        calls.push(['version', label]);
      }
    }
  );

  assert.equal(result, 'Auto: Style');
  assert.deepEqual(calls, ['history', 'save', ['version', 'Auto: Style']]);
});

test('finalizeStudioEditorDeckMutation preserves fallback persistence when layer refresh throws', () => {
  const calls = [];
  const result = deckMutation.finalizeStudioEditorDeckMutation(
    'Auto: Style',
    { refreshLayersList: true, doc: { id: 'editor-document' } },
    {
      updateLayersList() {
        throw new Error('layer refresh unavailable');
      },
      saveHistoryState() {
        calls.push('history');
      },
      triggerAutoSave() {
        calls.push('save');
      },
      triggerAutoVersion(label) {
        calls.push(['version', label]);
      }
    }
  );

  assert.equal(result, 'Auto: Style');
  assert.deepEqual(calls, ['history', 'save', ['version', 'Auto: Style']]);
});

test('finalizeStudioEditorDeckMutation forwards the mutation document in its fallback lifecycle', () => {
  const documentRef = { id: 'editor-document' };
  const receivedDocuments = [];

  deckMutation.finalizeStudioEditorDeckMutation(
    '',
    {
      doc: documentRef,
      syncSelectionOverlay: true,
      refreshThumbnails: false,
      refreshLayersList: true
    },
    {
      syncSelectionOverlay(doc) {
        receivedDocuments.push(['overlay', doc]);
      },
      updateLayersList(doc) {
        receivedDocuments.push(['layers', doc]);
      }
    }
  );

  assert.deepEqual(receivedDocuments, [
    ['overlay', documentRef],
    ['layers', documentRef]
  ]);
});

test('finalizeStudioEditorDeckMutation propagates fallback history rejection', () => {
  assert.equal(deckMutation.finalizeStudioEditorDeckMutation('Auto: Rejected', {
    canonicalDeck: { kind: 'slidenext.deck', slides: [] }
  }, {
    saveHistoryState: () => ({ didCapture: false }),
    triggerAutoSave: () => {
      throw new Error('autosave should not run');
    }
  }), false);
});

test('finalizeStudioEditorDeckMutation converts thrown fallback history to rejection', () => {
  assert.equal(deckMutation.finalizeStudioEditorDeckMutation('Auto: Rejected', {
    canonicalDeck: { kind: 'slidenext.deck', slides: [] }
  }, {
    saveHistoryState: () => {
      throw new Error('history unavailable');
    },
    triggerAutoSave: () => {
      throw new Error('autosave should not run');
    }
  }), false);
});

test('finalizeStudioEditorDeckMutation converts thrown fallback autosave to rejection', () => {
  assert.equal(deckMutation.finalizeStudioEditorDeckMutation('Auto: Rejected', {
    canonicalDeck: { kind: 'slidenext.deck', slides: [] }
  }, {
    saveHistoryState: () => ({ didCapture: true }),
    triggerAutoSave: () => {
      throw new Error('autosave unavailable');
    },
    triggerAutoVersion: () => {
      throw new Error('versioning should not run');
    }
  }), false);
});

test('finalizeStudioEditorSelectionToggleMutation preserves selection and persistence ordering', () => {
  const calls = [];
  const documentRef = { id: 'editor-document' };
  const result = deckMutation.finalizeStudioEditorSelectionToggleMutation(
    'Auto: Locked Element',
    { doc: documentRef, transaction: { id: 'tx' }, canonicalDeck: { id: 'deck' } },
    {
      syncSelectionUi(doc) {
        calls.push(['selection', doc]);
      },
      finalizeMutation(label, options) {
        calls.push(['finalize', label, options]);
      }
    }
  );

  assert.equal(result, true);
  assert.deepEqual(calls, [
    ['selection', documentRef],
    ['finalize', 'Auto: Locked Element', {
      refreshThumbnails: false,
      transaction: { id: 'tx' },
      canonicalDeck: { id: 'deck' }
    }]
  ]);
});

test('finalizeStudioEditorSelectionToggleMutation propagates explicit persistence failures', () => {
  const result = deckMutation.finalizeStudioEditorSelectionToggleMutation(
    'Auto: Locked Element',
    { doc: { id: 'editor-document' } },
    {
      finalizeMutation: () => false
    }
  );

  assert.equal(result, false);
});

test('finalizeStudioEditorSelectionToggleMutation contains thrown persistence failures', () => {
  assert.equal(deckMutation.finalizeStudioEditorSelectionToggleMutation(
    'Auto: Locked Element',
    {},
    {
      finalizeMutation: () => {
        throw new Error('selection finalization failed');
      }
    }
  ), false);
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

test('finalizeStudioEditorInsertedElements propagates rejected persistence', () => {
  const result = deckMutation.finalizeStudioEditorInsertedElements(
    [{ id: 'node-1' }],
    'Auto: Pasted Element',
    { id: 'tx' },
    null,
    {
      selectionApi: {
        selectAllStudioElements: (elements) => ({ selectedElements: elements })
      },
      finalizeMutation: () => false
    }
  );

  assert.equal(result, false);
});

test('finalizeStudioEditorInsertedElements contains thrown persistence failures', () => {
  assert.equal(deckMutation.finalizeStudioEditorInsertedElements(
    [{ id: 'node-1' }],
    'Auto: Pasted Element',
    null,
    null,
    {
      selectionApi: {
        selectAllStudioElements: (elements) => ({ selectedElements: elements })
      },
      finalizeMutation: () => {
        throw new Error('inserted element finalization failed');
      }
    }
  ), false);
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

test('finalizeStudioEditorLayerOrderMutation propagates fallback history rejection', () => {
  assert.equal(deckMutation.finalizeStudioEditorLayerOrderMutation('Auto: Rejected', {
    transaction: { id: 'tx' },
    canonicalDeck: { kind: 'slidenext.deck', slides: [] }
  }, {
    saveHistoryState: () => ({ didCapture: false }),
    triggerAutoSave: () => {
      throw new Error('autosave should not run');
    }
  }), false);
});

test('finalizeStudioEditorLayerOrderMutation contains thrown persistence failures', () => {
  assert.equal(deckMutation.finalizeStudioEditorLayerOrderMutation(
    'Auto: Layer Order',
    {},
    {
      finalizeMutation: () => {
        throw new Error('layer finalization failed');
      }
    }
  ), false);
});

test('finalizeStudioEditorLayerOrderMutation preserves delegated results when action refresh throws', () => {
  const calls = [];
  const result = deckMutation.finalizeStudioEditorLayerOrderMutation('Auto: Layer Order', {
    transaction: { id: 'tx' },
    canonicalDeck: { kind: 'slidenext.deck', slides: [] }
  }, {
    finalizeMutation(label, mutationOptions) {
      calls.push([label, mutationOptions]);
      return label;
    },
    updateLayerOrderActionState: () => {
      throw new Error('layer action state unavailable');
    }
  });

  assert.equal(result, 'Auto: Layer Order');
  assert.deepEqual(calls, [['Auto: Layer Order', {
    refreshThumbnails: false,
    refreshLayersList: true,
    transaction: { id: 'tx' },
    canonicalDeck: { kind: 'slidenext.deck', slides: [] }
  }]]);
});

test('finalizeStudioEditorLayerOrderMutation converts thrown fallback history to rejection', () => {
  assert.equal(deckMutation.finalizeStudioEditorLayerOrderMutation('Auto: Rejected', {
    transaction: { id: 'tx' },
    canonicalDeck: { kind: 'slidenext.deck', slides: [] }
  }, {
    saveHistoryState: () => {
      throw new Error('history unavailable');
    },
    triggerAutoSave: () => {
      throw new Error('autosave should not run');
    }
  }), false);
});

test('finalizeStudioEditorLayerOrderMutation converts thrown fallback autosave to rejection', () => {
  assert.equal(deckMutation.finalizeStudioEditorLayerOrderMutation('Auto: Layer Order', {
    transaction: { id: 'tx' },
    canonicalDeck: { kind: 'slidenext.deck', slides: [] }
  }, {
    saveHistoryState() {},
    triggerAutoSave: () => {
      throw new Error('autosave unavailable');
    },
    updateLayersList: () => {
      throw new Error('layers should not refresh after autosave failure');
    }
  }), false);
});

test('finalizeStudioEditorLayerOrderMutation preserves persistence when layer refresh throws', () => {
  const calls = [];
  const result = deckMutation.finalizeStudioEditorLayerOrderMutation('Auto: Layer Order', {
    transaction: { id: 'tx' },
    canonicalDeck: { kind: 'slidenext.deck', slides: [] }
  }, {
    saveHistoryState() {},
    triggerAutoSave() {
      calls.push('save');
    },
    updateLayersList: () => {
      throw new Error('layer list unavailable');
    },
    updateLayerOrderActionState() {
      calls.push('actions');
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    }
  });

  assert.equal(result, 'Auto: Layer Order');
  assert.deepEqual(calls, ['save', 'actions', ['version', 'Auto: Layer Order']]);
});

test('finalizeStudioEditorLayerOrderMutation preserves versioning when action refresh throws', () => {
  const calls = [];
  const result = deckMutation.finalizeStudioEditorLayerOrderMutation('Auto: Layer Order', {
    transaction: { id: 'tx' },
    canonicalDeck: { kind: 'slidenext.deck', slides: [] }
  }, {
    saveHistoryState() {},
    triggerAutoSave() {
      calls.push('save');
    },
    updateLayerOrderActionState: () => {
      throw new Error('layer action state unavailable');
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    }
  });

  assert.equal(result, 'Auto: Layer Order');
  assert.deepEqual(calls, ['save', ['version', 'Auto: Layer Order']]);
});

test('finalizeStudioEditorLayerOrderMutation preserves the result when version notification throws', () => {
  const calls = [];
  const result = deckMutation.finalizeStudioEditorLayerOrderMutation('Auto: Layer Order', {
    transaction: { id: 'tx' },
    canonicalDeck: { kind: 'slidenext.deck', slides: [] }
  }, {
    saveHistoryState() {},
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion: () => {
      throw new Error('version notification unavailable');
    }
  });

  assert.equal(result, 'Auto: Layer Order');
  assert.deepEqual(calls, ['save']);
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

test('finalizeStudioEditorWallpaperMutation preserves fallback persistence when thumbnail refresh throws', () => {
  const calls = [];
  const result = deckMutation.finalizeStudioEditorWallpaperMutation(
    'Auto: Changed Background',
    { id: 'tx' },
    null,
    {
      generateThumbnails() {
        throw new Error('thumbnail refresh unavailable');
      },
      saveHistoryState() {
        calls.push('history');
      },
      triggerAutoSave() {
        calls.push('save');
      },
      triggerAutoVersion(label) {
        calls.push(['version', label]);
      }
    }
  );

  assert.equal(result, 'Auto: Changed Background');
  assert.deepEqual(calls, ['history', 'save', ['version', 'Auto: Changed Background']]);
});

test('finalizeStudioEditorWallpaperMutation propagates fallback history rejection', () => {
  assert.equal(deckMutation.finalizeStudioEditorWallpaperMutation(
    'Auto: Rejected',
    { id: 'tx' },
    { kind: 'slidenext.deck', slides: [] },
    {
      saveHistoryState: () => ({ didCapture: false }),
      triggerAutoSave: () => {
        throw new Error('autosave should not run');
      }
    }
  ), false);
});

test('finalizeStudioEditorWallpaperMutation converts thrown fallback history to rejection', () => {
  assert.equal(deckMutation.finalizeStudioEditorWallpaperMutation(
    'Auto: Rejected',
    { id: 'tx' },
    { kind: 'slidenext.deck', slides: [] },
    {
      saveHistoryState: () => {
        throw new Error('history unavailable');
      },
      triggerAutoSave: () => {
        throw new Error('autosave should not run');
      }
    }
  ), false);
});

test('finalizeStudioEditorWallpaperMutation converts thrown fallback autosave to rejection', () => {
  assert.equal(deckMutation.finalizeStudioEditorWallpaperMutation(
    'Auto: Rejected',
    { id: 'tx' },
    null,
    {
      saveHistoryState() {},
      triggerAutoSave: () => {
        throw new Error('autosave unavailable');
      },
      triggerAutoVersion: () => {
        throw new Error('versioning should not run');
      }
    }
  ), false);
});

test('finalizeStudioEditorWallpaperMutation preserves the result when version notification throws', () => {
  const calls = [];
  const result = deckMutation.finalizeStudioEditorWallpaperMutation(
    'Auto: Changed Background',
    { id: 'tx' },
    null,
    {
      saveHistoryState() {
        calls.push('history');
      },
      triggerAutoSave() {
        calls.push('save');
      },
      triggerAutoVersion() {
        throw new Error('version notification unavailable');
      }
    }
  );

  assert.equal(result, 'Auto: Changed Background');
  assert.deepEqual(calls, ['history', 'save']);
});

test('finalizeStudioEditorWallpaperMutation contains thrown persistence failures', () => {
  assert.equal(deckMutation.finalizeStudioEditorWallpaperMutation(
    'Auto: Background',
    { id: 'tx-wallpaper' },
    null,
    {
      finalizeMutation: () => {
        throw new Error('wallpaper finalization failed');
      }
    }
  ), false);
});

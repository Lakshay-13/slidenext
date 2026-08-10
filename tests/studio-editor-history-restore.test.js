const test = require('node:test');
const assert = require('node:assert/strict');

const historyRestore = require('../shared/studio-editor-history-restore.js');

test('createStudioEditorHistoryRestoreStateAdapter delegates restore handler construction', () => {
  let createCalls = 0;
  let capturedOptions = null;
  const adapter = historyRestore.createStudioEditorHistoryRestoreStateAdapter({
    restoreApi: {
      createStudioEditorHistoryRestoreHandler(options) {
        createCalls += 1;
        capturedOptions = options;
        return entry => ({ entry, restored: true });
      }
    },
    historyApi: { id: 'history-api' },
    getIframeDoc: () => ({ id: 'iframe-doc' })
  });

  assert.deepEqual(adapter({ id: 'entry-1' }), {
    entry: { id: 'entry-1' },
    restored: true
  });
  assert.equal(createCalls, 1);
  assert.equal(capturedOptions.historyApi.id, 'history-api');
  assert.deepEqual(capturedOptions.getIframeDoc(), { id: 'iframe-doc' });
  assert.equal('restoreApi' in capturedOptions, false);
});

test('createStudioEditorHistoryRestoreStateAdapter fails closed without a shared handler', () => {
  assert.equal(historyRestore.createStudioEditorHistoryRestoreStateAdapter(), null);
});

test('history restore rebuilds canonical state when the entry has no canonical deck', () => {
  const iframeDoc = { id: 'iframe-doc' };
  const rebuiltCanonicalDeck = { kind: 'slidenext.deck', slides: [{ id: 'slide-1' }] };
  const calls = [];
  const restoreHandler = historyRestore.createStudioEditorHistoryRestoreHandler({
    historyApi: {
      normalizeStudioHistoryEntry(entry) {
        return entry;
      },
      restoreStudioHistoryEntry() {}
    },
    getIframeDoc() {
      return iframeDoc;
    },
    buildCanonicalDeck(doc) {
      calls.push(['buildCanonicalDeck', doc]);
      return rebuiltCanonicalDeck;
    },
    capturePersistedDeckPlaybackState(doc, canonicalDeck) {
      calls.push(['capturePersistedDeckPlaybackState', doc, canonicalDeck]);
      return { activeSlideIds: ['slide-1'] };
    },
    applyPersistedDeckState(state) {
      calls.push(['applyPersistedDeckState', state]);
    },
    setEditorLiveCanonicalDeck(canonicalDeck, doc) {
      calls.push(['setEditorLiveCanonicalDeck', canonicalDeck, doc]);
    },
    setCurrentPresentationCanonicalDeck(canonicalDeck) {
      calls.push(['setCurrentPresentationCanonicalDeck', canonicalDeck]);
    }
  });

  restoreHandler({ canonicalDeck: null });

  assert.deepEqual(calls, [
    ['buildCanonicalDeck', iframeDoc],
    ['capturePersistedDeckPlaybackState', iframeDoc, rebuiltCanonicalDeck],
    ['applyPersistedDeckState', {
      canonicalDeck: rebuiltCanonicalDeck,
      playbackState: { activeSlideIds: ['slide-1'] }
    }],
    ['setEditorLiveCanonicalDeck', rebuiltCanonicalDeck, iframeDoc],
    ['setCurrentPresentationCanonicalDeck', rebuiltCanonicalDeck]
  ]);
});

const test = require('node:test');
const assert = require('node:assert/strict');

const historyRestore = require('../shared/studio-editor-history-restore.js');
const historyApi = require('../shared/studio-history.js');
const transactionApi = require('../shared/studio-editor-transaction.js');

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
    buildCanonicalDeck(doc, options) {
      calls.push(['buildCanonicalDeck', doc, options]);
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
    ['buildCanonicalDeck', iframeDoc, { preferLiveCanonicalDeck: false }],
    ['capturePersistedDeckPlaybackState', iframeDoc, rebuiltCanonicalDeck],
    ['applyPersistedDeckState', {
      canonicalDeck: rebuiltCanonicalDeck,
      playbackState: { activeSlideIds: ['slide-1'] }
    }],
    ['setEditorLiveCanonicalDeck', rebuiltCanonicalDeck, iframeDoc],
    ['setCurrentPresentationCanonicalDeck', rebuiltCanonicalDeck]
  ]);
});

test('history restore prefers the shared canonical deck validator', () => {
  const iframeDoc = { id: 'iframe-doc' };
  const entryCanonicalDeck = { kind: 'candidate', slides: [] };
  const rebuiltCanonicalDeck = { kind: 'rebuilt', slides: [] };
  let validatorCalls = 0;
  let buildCalls = 0;
  let restoredDeck = null;
  const restoreHandler = historyRestore.createStudioEditorHistoryRestoreHandler({
    historyApi: {
      normalizeStudioHistoryEntry(entry) {
        return entry;
      },
      restoreStudioHistoryEntry() {}
    },
    canonicalStateApi: {
      isStudioEditorCanonicalDeckLike(value) {
        validatorCalls += 1;
        return value === rebuiltCanonicalDeck;
      }
    },
    getIframeDoc: () => iframeDoc,
    buildCanonicalDeck() {
      buildCalls += 1;
      return rebuiltCanonicalDeck;
    },
    applyPersistedDeckState(state) {
      restoredDeck = state.canonicalDeck;
    }
  });

  restoreHandler({ canonicalDeck: entryCanonicalDeck });

  assert.equal(restoredDeck, rebuiltCanonicalDeck);
  assert.equal(validatorCalls, 2);
  assert.equal(buildCalls, 1);
});

test('history restore fails closed when the canonical frame cannot be rendered', () => {
  const iframeDoc = { id: 'iframe-doc' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [{ id: 'slide-1' }] };
  const calls = [];
  const restoreHandler = historyRestore.createStudioEditorHistoryRestoreHandler({
    historyApi: {
      normalizeStudioHistoryEntry(entry) {
        return entry;
      },
      restoreStudioHistoryEntry(entry, options) {
        return { frameSetup: options.restoreFrameSetup(entry) };
      },
      restoreStudioHistoryFrameSetup() {
        return { didRestoreDoc: false, restoredHtmlLength: 0 };
      }
    },
    getIframeDoc() {
      return iframeDoc;
    },
    applyPersistedDeckState(state) {
      calls.push(['applyPersistedDeckState', state]);
    },
    setEditorLiveCanonicalDeck(deck) {
      calls.push(['setEditorLiveCanonicalDeck', deck]);
    },
    setCurrentPresentationCanonicalDeck(deck) {
      calls.push(['setCurrentPresentationCanonicalDeck', deck]);
    }
  });

  assert.equal(restoreHandler({ canonicalDeck }), false);
  assert.deepEqual(calls, []);
});

test('history restore forwards the explicit canonical HTML builder to frame setup', () => {
  const iframeDoc = { id: 'iframe-doc' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [{ id: 'slide-1' }] };
  const buildDeckSourceHtml = () => '<main>canonical</main>';
  let receivedBuilder = null;
  const restoreHandler = historyRestore.createStudioEditorHistoryRestoreHandler({
    historyApi: {
      normalizeStudioHistoryEntry(entry) {
        return entry;
      },
      restoreStudioHistoryEntry(entry, options) {
        return { frameSetup: options.restoreFrameSetup(entry) };
      },
      restoreStudioHistoryFrameSetup(entry, options) {
        receivedBuilder = options.buildDeckSourceHtml;
        return { didRestoreDoc: false, restoredHtmlLength: 0 };
      }
    },
    getIframeDoc: () => iframeDoc,
    buildDeckViewOptions: () => ({
      deckHtmlOptions: {},
      buildDeckSourceHtml
    })
  });

  assert.equal(restoreHandler({ canonicalDeck }), false);
  assert.equal(receivedBuilder, buildDeckSourceHtml);
});

test('history restore applies active-slide transactions without rebuilding the frame', () => {
  const iframeDoc = { id: 'iframe-doc' };
  const calls = [];
  const restoreHandler = historyRestore.createStudioEditorHistoryRestoreHandler({
    historyApi,
    transactionApi,
    getIframeDoc: () => iframeDoc,
    setActiveSlideById(slideId, doc, options) {
      calls.push(['setActiveSlideById', slideId, doc, options]);
      return true;
    },
    buildCanonicalDeck() {
      throw new Error('view-only restore should not need frame rebuild');
    }
  });

  const result = restoreHandler({
    html: '',
    activeSlideId: 'slide-1',
    selectedElementIds: [],
    canonicalDeck: null
  }, {
    direction: 'undo',
    transaction: transactionApi.createStudioActiveSlideTransaction('slide-1', 'slide-2')
  });

  assert.equal(result.didRestoreTransaction, true);
  assert.deepEqual(calls, [[
    'setActiveSlideById',
    'slide-1',
    iframeDoc,
    { captureHistory: false, preserveSelection: true }
  ]]);
});

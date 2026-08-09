const test = require('node:test');
const assert = require('node:assert/strict');

const persistence = require('../shared/studio-editor-persistence.js');
const metadataController = require('../shared/studio-editor-presentation-metadata-controller.js');

test('presentation metadata controller applies metadata and synchronizes its canonical baseline', () => {
  const calls = [];
  const metadata = { id: 'deck-1' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const controller = metadataController.createStudioEditorPresentationMetadataController({
    persistenceApi: persistence,
    getCurrentPresentationUrl: () => '/presentations/deck/index.html',
    setCurrentPresentationMetadata(value) {
      calls.push(['metadata', value]);
    },
    resolveStoredCanonicalDeck(value) {
      calls.push(['resolve', value]);
      return canonicalDeck;
    },
    applyPersistedDeckState(...args) {
      calls.push(['apply', ...args]);
    },
    getIframeDoc() {
      return null;
    },
    generateThumbnails() {
      calls.push(['thumbnails']);
    },
    syncStudioChromeToActiveSlide() {
      calls.push(['chrome']);
    },
    updateDeckReadyToolbarActionState() {
      calls.push(['toolbar']);
    }
  });

  assert.equal(controller.apply(metadata, { syncPersistedCanonicalDeck: true }), metadata);
  assert.deepEqual(calls.slice(0, 2), [
    ['metadata', metadata],
    ['resolve', metadata]
  ]);
  assert.deepEqual(calls[2], [
    'apply',
    { canonicalDeck },
    {
      presentationUrl: '/presentations/deck/index.html',
      syncPresentationMetadata: false
    }
  ]);
  assert.deepEqual(calls.slice(3), [
    ['thumbnails'],
    ['chrome'],
    ['toolbar']
  ]);
});

test('presentation metadata controller keeps updates local when synchronization is disabled', () => {
  const metadata = { id: 'deck-1' };
  let syncCalls = 0;
  const controller = metadataController.createStudioEditorPresentationMetadataController({
    persistenceApi: {
      syncStudioPresentationMetadataPersistedCanonicalDeck() {
        syncCalls += 1;
      }
    }
  });

  assert.equal(controller.apply(metadata), metadata);
  assert.equal(syncCalls, 0);
});

test('presentation metadata controller delegates loading with session-aware options', async () => {
  const calls = [];
  const controller = metadataController.createStudioEditorPresentationMetadataController({
    loadPresentationMetadata(url, title, options) {
      calls.push([url, title, options]);
      return Promise.resolve({ id: 'deck-1' });
    },
    resolveLoadOptions(sessionToken) {
      return { sessionToken, marker: 'live-session' };
    }
  });

  const result = await controller.load(
    '/presentations/deck/index.html',
    'Deck',
    12
  );

  assert.deepEqual(calls, [[
    '/presentations/deck/index.html',
    'Deck',
    { sessionToken: 12, marker: 'live-session' }
  ]]);
  assert.deepEqual(result, { id: 'deck-1' });
});

test('presentation metadata controller delegates canonical deck updates with current metadata context', () => {
  const calls = [];
  const metadata = { id: 'deck-1' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const controller = metadataController.createStudioEditorPresentationMetadataController({
    deckContextApi: {
      applyStudioPresentationMetadataCanonicalDeckUpdate(deck, options) {
        calls.push([deck, options]);
        return 'updated';
      }
    },
    getCurrentPresentationMetadata: () => metadata,
    getCurrentPresentationUrl: () => '/presentations/deck/index.html',
    buildPresentationMetadataSeed: (url, title) => ({ url, title }),
    applyPresentationMetadata: () => {}
  });

  const result = controller.applyCanonicalDeck(
    canonicalDeck,
    '/presentations/next/index.html',
    'Next Deck'
  );

  assert.equal(result, 'updated');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], canonicalDeck);
  assert.deepEqual(calls[0][1], {
    currentPresentationMetadata: metadata,
    currentPresentationUrl: '/presentations/deck/index.html',
    presentationUrl: '/presentations/next/index.html',
    presentationTitle: 'Next Deck',
    buildPresentationMetadataSeed: calls[0][1].buildPresentationMetadataSeed,
    applyPresentationMetadata: calls[0][1].applyPresentationMetadata
  });
  assert.deepEqual(
    calls[0][1].buildPresentationMetadataSeed('/presentations/next/index.html', 'Next Deck'),
    { url: '/presentations/next/index.html', title: 'Next Deck' }
  );
  assert.equal(typeof calls[0][1].applyPresentationMetadata, 'function');
});

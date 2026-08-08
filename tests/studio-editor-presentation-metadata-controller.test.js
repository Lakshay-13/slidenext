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

const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const assetController = require('../shared/studio-editor-asset-controller.js');

test('addAsset commits a canonical asset and notifies the library view', () => {
  let deck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let changedAssets = null;
  const versionLabels = [];
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => deck,
    saveHistoryState: (_debounce, _transaction, nextDeck) => { deck = nextDeck; },
    triggerAutoVersion: (label) => versionLabels.push(label),
    onAssetsChanged: (assets) => { changedAssets = assets; }
  });

  const nextDeck = controller.addAsset({
    id: 'hero-image',
    name: 'Hero Image',
    type: 'image',
    src: '/images/hero.png'
  });

  assert.equal(nextDeck.assets[0].id, 'hero-image');
  assert.equal(changedAssets[0].name, 'Hero Image');
  assert.deepEqual(versionLabels, ['Auto: Added Asset "Hero Image"']);
});

test('removeAsset commits unused asset removal and rejects referenced assets', () => {
  let deck = canonicalDeck.createCanonicalDeck({
    assets: [
      { id: 'unused', name: 'Unused', src: 'unused.png' },
      { id: 'used', name: 'Used', src: 'used.png' }
    ],
    slides: [{ id: 'slide-1', nodes: [{ id: 'image-1', assetId: 'used' }] }]
  });
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => deck,
    saveHistoryState: (_debounce, _transaction, nextDeck) => { deck = nextDeck; }
  });

  assert.equal(controller.removeAsset('used'), false);
  assert.equal(controller.removeAsset('unused'), true);
  assert.deepEqual(deck.assets.map((asset) => asset.id), ['used']);
});

test('asset controller returns false when an asset operation cannot produce a deck', () => {
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] })
  });

  assert.equal(controller.removeAsset('missing'), false);
  assert.equal(controller.addAsset(null), null);
});

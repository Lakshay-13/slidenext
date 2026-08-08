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

test('asset mutations prefer a valid live canonical baseline', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let didBuildFromDocument = false;
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeckBaseline: () => liveDeck,
    getCanonicalDeck: () => {
      didBuildFromDocument = true;
      return canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
    },
    saveHistoryState: () => {}
  });

  const nextDeck = controller.addAsset({
    id: 'live-image',
    name: 'Live Image',
    type: 'image',
    src: '/images/live.png'
  });

  assert.equal(nextDeck.assets[0].id, 'live-image');
  assert.equal(didBuildFromDocument, false);
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

test('applyAsset binds the selected image, updates its DOM source, and commits the deck', () => {
  let deck = canonicalDeck.createCanonicalDeck({
    assets: [{ id: 'hero', name: 'Hero', type: 'image', src: '/hero.png' }],
    slides: [{ id: 'slide-1', nodes: [{ id: 'image-1', type: 'image', attributes: { src: '/old.png' } }] }]
  });
  const selectedImage = {
    dataset: { editorId: 'image-1' },
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
  let inspectorSyncs = 0;
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getSelectedImage: () => selectedImage,
    syncInspectorForSelection: () => { inspectorSyncs += 1; },
    saveHistoryState: (_debounce, _transaction, nextDeck) => { deck = nextDeck; }
  });

  assert.equal(controller.applyAsset('hero'), true);
  assert.equal(deck.slides[0].nodes[0].assetId, 'hero');
  assert.equal(selectedImage.attributes.src, '/hero.png');
  assert.equal(selectedImage.src, '/hero.png');
  assert.equal(inspectorSyncs, 1);
});

test('applyAsset refuses missing, unselected, and locked image targets', () => {
  let deck = canonicalDeck.createCanonicalDeck({
    assets: [{ id: 'hero', src: '/hero.png' }],
    slides: [{ id: 'slide-1', nodes: [{ id: 'image-1', type: 'image' }] }]
  });
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getSelectedImage: () => null
  });
  assert.equal(controller.applyAsset('hero'), false);

  const lockedController = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getSelectedImage: () => ({ dataset: { editorId: 'image-1' } }),
    isElementLocked: () => true
  });
  assert.equal(lockedController.applyAsset('hero'), false);
});

test('applyAsset prefers canonical lock metadata over stale DOM state', () => {
  let deck = canonicalDeck.createCanonicalDeck({
    assets: [{ id: 'hero', src: '/hero.png' }],
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'image-1', type: 'image', visibility: { locked: true } }]
    }]
  });
  const selectedImage = {
    dataset: { editorId: 'image-1' },
    setAttribute() {}
  };
  const createController = () => assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getSelectedImage: () => selectedImage,
    isElementLocked: () => false,
    saveHistoryState: (_debounce, _transaction, nextDeck) => { deck = nextDeck; }
  });

  assert.equal(createController().applyAsset('hero'), false);

  deck = canonicalDeck.updateCanonicalNodeVisibility(deck, ['image-1'], {
    locked: false
  });
  const unlockedController = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getSelectedImage: () => selectedImage,
    isElementLocked: () => true,
    saveHistoryState: (_debounce, _transaction, nextDeck) => { deck = nextDeck; }
  });
  assert.equal(unlockedController.applyAsset('hero'), false);
});

test('asset controller returns false when an asset operation cannot produce a deck', () => {
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] })
  });

  assert.equal(controller.removeAsset('missing'), false);
  assert.equal(controller.addAsset(null), null);
});

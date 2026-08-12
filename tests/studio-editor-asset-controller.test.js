const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
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
    canonicalStateApi: canonicalState,
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

test('asset controller delegates canonical deck resolution to shared state', () => {
  const deck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let resolverOptions = null;
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: {
      createStudioEditorCanonicalDeckResolver(options) {
        resolverOptions = options;
        return () => deck;
      }
    },
    getCanonicalDeckBaseline() {
      throw new Error('shared resolver should own baseline resolution');
    },
    getCanonicalDeck() {
      throw new Error('shared resolver should own fallback resolution');
    },
    saveHistoryState: () => {}
  });

  const result = controller.addAsset({ id: 'shared-asset', src: '/shared.png' });

  assert.equal(result.assets[0].id, 'shared-asset');
  assert.equal(typeof resolverOptions.getCanonicalDeck, 'function');
  assert.equal(typeof resolverOptions.getCanonicalDeckBaseline, 'function');
  assert.equal(resolverOptions.isCanonicalDeck, canonicalDeck.isCanonicalDeck);
});

test('asset mutations fall back when the live canonical baseline is invalid', () => {
  const fallbackDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let didBuildFromDocument = false;
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    getCanonicalDeck: () => {
      didBuildFromDocument = true;
      return fallbackDeck;
    },
    saveHistoryState: () => {}
  });

  const nextDeck = controller.addAsset({ id: 'fallback-asset', src: '/fallback.png' });

  assert.equal(nextDeck.assets[0].id, 'fallback-asset');
  assert.equal(didBuildFromDocument, true);
});

test('asset mutations require strict canonical baseline validation', () => {
  const fallbackDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let didUseFallback = false;
  const canonicalDeckApi = {
    ...canonicalDeck,
    isCanonicalDeck: (value) => (
      value
        && value.kind === 'slidenext.deck'
        && Array.isArray(value.slides)
        ? true
        : 1
    )
  };
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    getCanonicalDeck: () => {
      didUseFallback = true;
      return fallbackDeck;
    },
    saveHistoryState: () => {}
  });

  const result = controller.addAsset({ id: 'strict-asset', src: '/strict.png' });

  assert.equal(result.assets[0].id, 'strict-asset');
  assert.equal(didUseFallback, true);
});

test('asset mutations reject malformed fallback state without a canonical validator', () => {
  const canonicalDeckApi = {
    ...canonicalDeck,
    isCanonicalDeck: undefined
  };
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    getCanonicalDeck: () => ({ invalid: true }),
    saveHistoryState: () => {}
  });

  assert.equal(controller.addAsset({ id: 'invalid-asset', src: '/invalid.png' }), null);
});

test('asset controller fails closed when adding an asset canonical mutation throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1' }]
  });
  const calls = [];
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: {
      ...canonicalDeck,
      appendCanonicalAsset() {
        throw new Error('canonical asset add failed');
      }
    },
    getCanonicalDeck: () => sourceDeck,
    saveHistoryState() {
      calls.push('history');
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion() {
      calls.push('version');
    },
    onAssetsChanged() {
      calls.push('assets');
    }
  });

  assert.equal(controller.addAsset({ id: 'broken-asset', src: '/broken.png' }), null);
  assert.deepEqual(calls, []);
});

test('asset controller fails closed when removing an asset canonical mutation throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    assets: [{ id: 'unused', name: 'Unused', src: '/unused.png' }],
    slides: [{ id: 'slide-1' }]
  });
  const calls = [];
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: {
      ...canonicalDeck,
      removeCanonicalAsset() {
        throw new Error('canonical asset removal failed');
      }
    },
    getCanonicalDeck: () => sourceDeck,
    saveHistoryState() {
      calls.push('history');
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion() {
      calls.push('version');
    },
    onAssetsChanged() {
      calls.push('assets');
    }
  });

  assert.equal(controller.removeAsset('unused'), false);
  assert.deepEqual(calls, []);
});

test('asset controller fails closed when applying an asset canonical mutation throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    assets: [{ id: 'hero', name: 'Hero', src: '/hero.png' }],
    slides: [{ id: 'slide-1', nodes: [{ id: 'image-1', type: 'image' }] }]
  });
  const selectedImage = {
    dataset: { editorId: 'image-1' },
    setAttribute() {
      throw new Error('DOM asset mutation should not run');
    }
  };
  const calls = [];
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: {
      ...canonicalDeck,
      updateCanonicalNodeAsset() {
        throw new Error('canonical asset application failed');
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getSelectedImage: () => selectedImage,
    saveHistoryState() {
      calls.push('history');
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion() {
      calls.push('version');
    },
    onAssetsChanged() {
      calls.push('assets');
    }
  });

  assert.equal(controller.applyAsset('hero'), false);
  assert.deepEqual(calls, []);
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

test('removeAsset reports rejected persistence without publishing the library change', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    assets: [{ id: 'unused', name: 'Unused', src: 'unused.png' }],
    slides: [{ id: 'slide-1' }]
  });
  let changedAssets = 0;
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => deck,
    finalizeMutation: () => false,
    onAssetsChanged: () => { changedAssets += 1; }
  });

  assert.equal(controller.removeAsset('unused'), false);
  assert.deepEqual(deck.assets.map((asset) => asset.id), ['unused']);
  assert.equal(changedAssets, 0);
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
  const documentRef = { id: 'iframe-document' };
  let inspectorSyncs = 0;
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => deck,
    getDocument: () => documentRef,
    getActiveSlideId(currentDocument) {
      assert.equal(currentDocument, documentRef);
      return 'slide-1';
    },
    getSelectedImage(currentDocument) {
      assert.equal(currentDocument, documentRef);
      return selectedImage;
    },
    syncInspectorForSelection: () => { inspectorSyncs += 1; },
    saveHistoryState: (_debounce, _transaction, nextDeck) => { deck = nextDeck; }
  });

  assert.equal(controller.applyAsset('hero'), true);
  assert.equal(deck.slides[0].nodes[0].assetId, 'hero');
  assert.equal(selectedImage.attributes.src, '/hero.png');
  assert.equal(selectedImage.src, '/hero.png');
  assert.equal(inspectorSyncs, 1);
});

test('applyAsset restores the previous DOM source when persistence rejects', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    assets: [{ id: 'hero', name: 'Hero', type: 'image', src: '/hero.png' }],
    slides: [{ id: 'slide-1', nodes: [{ id: 'image-1', type: 'image', attributes: { src: '/old.png' } }] }]
  });
  const selectedImage = {
    dataset: { editorId: 'image-1' },
    src: '/old.png',
    attributes: { src: '/old.png' },
    getAttribute(name) {
      return this.attributes[name] || null;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
      this[name] = value;
    },
    removeAttribute(name) {
      delete this.attributes[name];
      delete this[name];
    }
  };
  let inspectorSyncs = 0;
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getSelectedImage: () => selectedImage,
    syncInspectorForSelection: () => { inspectorSyncs += 1; },
    finalizeMutation: () => false
  });

  assert.equal(controller.applyAsset('hero'), false);
  assert.equal(selectedImage.getAttribute('src'), '/old.png');
  assert.equal(selectedImage.src, '/old.png');
  assert.equal(inspectorSyncs, 1);
});

test('applyAsset restores the previous DOM source when history capture fails', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    assets: [{ id: 'hero', name: 'Hero', type: 'image', src: '/hero.png' }],
    slides: [{ id: 'slide-1', nodes: [{ id: 'image-1', type: 'image', attributes: { src: '/old.png' } }] }]
  });
  const selectedImage = {
    dataset: { editorId: 'image-1' },
    src: '/old.png',
    attributes: { src: '/old.png' },
    getAttribute(name) {
      return this.attributes[name] || null;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
      this[name] = value;
    },
    removeAttribute(name) {
      delete this.attributes[name];
      delete this[name];
    }
  };
  let inspectorSyncs = 0;
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getSelectedImage: () => selectedImage,
    syncInspectorForSelection: () => { inspectorSyncs += 1; },
    saveHistoryState: () => ({ didCapture: false })
  });

  assert.equal(controller.applyAsset('hero'), false);
  assert.equal(selectedImage.getAttribute('src'), '/old.png');
  assert.equal(selectedImage.src, '/old.png');
  assert.equal(inspectorSyncs, 1);
});

test('applyAsset restores the previous DOM source when history capture throws', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    assets: [{ id: 'hero', name: 'Hero', src: '/hero.png' }],
    slides: [{ id: 'slide-1', nodes: [{ id: 'image-1', type: 'image', attributes: { src: '/old.png' } }] }]
  });
  const selectedImage = {
    dataset: { editorId: 'image-1' },
    src: '/old.png',
    attributes: { src: '/old.png' },
    getAttribute(name) {
      return this.attributes[name] || null;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
      this[name] = value;
    },
    removeAttribute(name) {
      delete this.attributes[name];
      delete this[name];
    }
  };
  let inspectorSyncs = 0;
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getSelectedImage: () => selectedImage,
    syncInspectorForSelection: () => { inspectorSyncs += 1; },
    saveHistoryState: () => {
      throw new Error('history unavailable');
    }
  });

  assert.equal(controller.applyAsset('hero'), false);
  assert.equal(selectedImage.getAttribute('src'), '/old.png');
  assert.equal(selectedImage.src, '/old.png');
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
    canonicalStateApi: canonicalState,
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
    canonicalStateApi: canonicalState,
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getSelectedImage: () => selectedImage,
    isElementLocked: () => true,
    saveHistoryState: (_debounce, _transaction, nextDeck) => { deck = nextDeck; }
  });
  assert.equal(unlockedController.applyAsset('hero'), false);
});

test('applyAsset delegates locked visibility assembly to canonical state', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    assets: [{ id: 'hero', src: '/hero.png' }],
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'image-1', type: 'image', visibility: { locked: true } }]
    }]
  });
  const selectedImage = { dataset: { editorId: 'image-1' } };
  let readerDeck = null;
  let readerOptions = null;
  let mutationCalls = 0;
  const canonicalDeckApi = {
    ...canonicalDeck,
    updateCanonicalNodeAsset() {
      mutationCalls += 1;
      return deck;
    }
  };
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi,
    canonicalStateApi: {
      createStudioEditorCanonicalVisibilityReaderForDeck(value, options) {
        readerDeck = value;
        readerOptions = options;
        return () => true;
      }
    },
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getSelectedImage: () => selectedImage,
    isElementLocked: () => false
  });

  assert.equal(controller.applyAsset('hero'), false);
  assert.equal(readerDeck, deck);
  assert.equal(readerOptions.property, 'locked');
  assert.equal(readerOptions.canonicalDeckApi, canonicalDeckApi);
  assert.equal(readerOptions.getElementId(selectedImage), 'image-1');
  assert.equal(readerOptions.fallbackReader(selectedImage), false);
  assert.equal(mutationCalls, 0);
});

test('applyAsset keeps canonical lock fallback behavior without the shared lock reader', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    assets: [{ id: 'hero', src: '/hero.png' }],
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'image-1', type: 'image', visibility: { locked: true } }]
    }]
  });
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getSelectedImage: () => ({ dataset: { editorId: 'image-1' } }),
    isElementLocked: () => false
  });

  assert.equal(controller.applyAsset('hero'), false);
});

test('asset controller returns false when an asset operation cannot produce a deck', () => {
  const controller = assetController.createStudioEditorAssetController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] })
  });

  assert.equal(controller.removeAsset('missing'), false);
  assert.equal(controller.addAsset(null), null);
});

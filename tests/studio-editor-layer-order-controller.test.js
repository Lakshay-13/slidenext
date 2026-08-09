const test = require('node:test');
const assert = require('node:assert/strict');
const layerOrderController = require('../shared/studio-editor-layer-order-controller.js');
const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');

test('layer order controller applies the planned order and forwards mutation callbacks', () => {
  const calls = [];
  let builderOptions = null;
  let baselineOptions = null;
  const first = { id: 'first', isConnected: true };
  const second = { id: 'second', isConnected: true };
  const slide = { contains: (element) => element === first || element === second };
  const controller = layerOrderController.createStudioEditorLayerOrderController({
    canonicalDeckApi: { id: 'deck-api' },
    getCanonicalDeckBaseline: () => ({ id: 'live-baseline' }),
    canonicalLayoutApi: {
      createStudioCanonicalLayerOrderMutationBuilder(options) {
        builderOptions = options;
        return () => ({ id: 'canonical-deck' });
      },
      buildStudioCanonicalLayoutBaseline(options) {
        baselineOptions = options;
        return { id: 'baseline-deck' };
      }
    },
    layerOrderApi: {
      buildStudioLayerOrderMutationPlan(elements, action, options) {
        calls.push(['plan', elements, action, options.orderedElements]);
        assert.equal(options.isLocked(first), false);
        return { didChange: true, nextOrder: [second, first] };
      }
    },
    getActiveSlide: () => slide,
    getIframeDoc: () => ({ id: 'doc' }),
    getNormalizedSlideLayerOrder: () => [first, second],
    buildCanonicalDeck: () => ({ slides: [] }),
    buildCanonicalDeckBaseline: () => ({ slides: [] }),
    applyLayerOrderMutation: (...args) => {
      calls.push(['apply', ...args]);
      return { didApply: true, transaction: { id: 'tx' } };
    },
    assignElementId: (element) => element.id
  });

  let transaction = null;
  assert.equal(controller.reorder('front', [first], {
    onTransaction(value) {
      transaction = value;
    }
  }), true);
  assert.equal(calls[0][0], 'plan');
  assert.equal(calls[0][2], 'front');
  assert.equal(calls[1][0], 'apply');
  assert.deepEqual(calls[1][3], [second, first]);
  assert.deepEqual(transaction, { id: 'tx' });
  assert.equal(builderOptions.canonicalDeckApi.id, 'deck-api');
  assert.equal(typeof builderOptions.buildCanonicalDeckBaseline, 'function');
  assert.deepEqual(builderOptions.getCanonicalDeckBaseline(), { id: 'live-baseline' });
  assert.equal(baselineOptions.sourceDocument.id, 'doc');
  assert.equal(typeof baselineOptions.buildCanonicalDeckBaseline, 'function');
  assert.deepEqual(baselineOptions.getCanonicalDeckBaseline(), { id: 'live-baseline' });
});

test('layer order controller fails closed for inactive slides and no-op plans', () => {
  const controller = layerOrderController.createStudioEditorLayerOrderController({
    getActiveSlide: () => null
  });
  assert.equal(controller.reorder('front', []), false);

  const noOpController = layerOrderController.createStudioEditorLayerOrderController({
    layerOrderApi: {
      buildStudioLayerOrderMutationPlan: () => ({ didChange: false })
    },
    getActiveSlide: () => ({ contains: () => true }),
    getNormalizedSlideLayerOrder: () => []
  });
  assert.equal(noOpController.reorder('back', []), false);
});

test('layer order controller blocks canonical-locked elements when the DOM is stale', () => {
  const first = { id: 'node-1', isConnected: true };
  const second = { id: 'node-2', isConnected: true };
  const slide = { contains: () => true };
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [
        { id: 'node-1', visibility: { locked: true } },
        { id: 'node-2', visibility: { locked: false } }
      ]
    }]
  });
  let receivedLockState = null;
  let applied = false;
  const controller = layerOrderController.createStudioEditorLayerOrderController({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline: () => deck,
    layerOrderApi: {
      buildStudioLayerOrderMutationPlan(elements, action, options) {
        receivedLockState = options.isLocked(first);
        return { didChange: false };
      }
    },
    getActiveSlide: () => slide,
    getIframeDoc: () => ({ id: 'doc' }),
    getNormalizedSlideLayerOrder: () => [first, second],
    assignElementId: (element) => element.id,
    isElementLocked: () => false,
    applyLayerOrderMutation: () => {
      applied = true;
      return { didApply: true };
    }
  });

  assert.equal(controller.reorder('front', [first]), false);
  assert.equal(receivedLockState, true);
  assert.equal(applied, false);
});

test('layer order controller delegates lock baseline resolution to canonical state', () => {
  const first = { id: 'node-1', isConnected: true };
  const slide = { contains: () => true };
  const documentRef = { id: 'doc' };
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1', visibility: { locked: true } }] }]
  });
  let readerOptions = null;
  let readerDocument = null;
  const controller = layerOrderController.createStudioEditorLayerOrderController({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: {
      createStudioEditorCanonicalDeckBaselineReader(options) {
        readerOptions = options;
        return (sourceDocument) => {
          readerDocument = sourceDocument;
          return deck;
        };
      },
      createStudioEditorCanonicalLockReaderFromApi() {
        return () => true;
      }
    },
    getCanonicalDeckBaseline() {
      throw new Error('custom reader should own baseline resolution');
    },
    layerOrderApi: {
      buildStudioLayerOrderMutationPlan(_elements, _action, options) {
        assert.equal(options.isLocked(first), true);
        return { didChange: false };
      }
    },
    getActiveSlide: () => slide,
    getIframeDoc: () => documentRef,
    getNormalizedSlideLayerOrder: () => [first],
    assignElementId: (element) => element.id,
    isElementLocked: () => false
  });

  assert.equal(controller.reorder('front', [first]), false);
  assert.equal(readerDocument, documentRef);
  assert.equal(readerOptions.isCanonicalDeck, canonicalDeck.isCanonicalDeck);
  assert.equal(typeof readerOptions.getCanonicalDeckBaseline, 'function');
});

test('layer order controller delegates locked visibility assembly to canonical state', () => {
  const first = { id: 'node-1', isConnected: true };
  const slide = { contains: () => true };
  const documentRef = { id: 'doc' };
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1', visibility: { locked: true } }] }]
  });
  let readerDeck = null;
  let readerOptions = null;
  const controller = layerOrderController.createStudioEditorLayerOrderController({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: {
      createStudioEditorCanonicalDeckBaselineReader() {
        return () => deck;
      },
      createStudioEditorCanonicalVisibilityReaderForDeck(value, options) {
        readerDeck = value;
        readerOptions = options;
        return () => true;
      }
    },
    layerOrderApi: {
      buildStudioLayerOrderMutationPlan(_elements, _action, options) {
        assert.equal(options.isLocked(first), true);
        return { didChange: false };
      }
    },
    getActiveSlide: () => slide,
    getIframeDoc: () => documentRef,
    getNormalizedSlideLayerOrder: () => [first],
    assignElementId: (element) => element.id,
    isElementLocked: () => false
  });

  assert.equal(controller.reorder('front', [first]), false);
  assert.equal(readerDeck, deck);
  assert.equal(readerOptions.property, 'locked');
  assert.equal(readerOptions.canonicalDeckApi, canonicalDeck);
  assert.equal(readerOptions.getElementId(first), 'node-1');
  assert.equal(readerOptions.fallbackReader(first), false);
});

test('layer order controller fails closed when the shared baseline reader is unavailable', () => {
  const first = { id: 'node-1', isConnected: true };
  const slide = { contains: () => true };
  let fallbackLockReads = 0;
  const controller = layerOrderController.createStudioEditorLayerOrderController({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: {
      createStudioEditorCanonicalDeckBaselineReader() {
        return null;
      }
    },
    layerOrderApi: {
      buildStudioLayerOrderMutationPlan(_elements, _action, options) {
        assert.equal(options.isLocked(first), false);
        return { didChange: false };
      }
    },
    getActiveSlide: () => slide,
    getIframeDoc: () => ({ id: 'doc' }),
    getNormalizedSlideLayerOrder: () => [first],
    assignElementId: (element) => element.id,
    isElementLocked: () => {
      fallbackLockReads += 1;
      return false;
    }
  });

  assert.equal(controller.reorder('front', [first]), false);
  assert.equal(fallbackLockReads, 1);
});

test('layer order controller rebuilds the canonical lock baseline when live state is invalid', () => {
  const first = { id: 'node-1', isConnected: true };
  const slide = { contains: () => true };
  const rebuiltDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1', visibility: { locked: true } }] }]
  });
  let receivedLockState = null;
  const controller = layerOrderController.createStudioEditorLayerOrderController({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeckBaseline: () => rebuiltDeck,
    layerOrderApi: {
      buildStudioLayerOrderMutationPlan(_elements, _action, options) {
        receivedLockState = options.isLocked(first);
        return { didChange: false };
      }
    },
    getActiveSlide: () => slide,
    getIframeDoc: () => ({ id: 'doc' }),
    getNormalizedSlideLayerOrder: () => [first],
    assignElementId: (element) => element.id,
    isElementLocked: () => false
  });

  assert.equal(controller.reorder('front', [first]), false);
  assert.equal(receivedLockState, true);
});

test('layer order controller rejects invalid compatibility baselines', () => {
  const first = { id: 'node-1', isConnected: true };
  const slide = { contains: () => true };
  let rebuildCalls = 0;
  const controller = layerOrderController.createStudioEditorLayerOrderController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeckBaseline: () => {
      rebuildCalls += 1;
      return { invalid: true };
    },
    layerOrderApi: {
      buildStudioLayerOrderMutationPlan(_elements, _action, options) {
        assert.equal(options.isLocked(first), false);
        return { didChange: false };
      }
    },
    getActiveSlide: () => slide,
    getIframeDoc: () => ({ id: 'doc' }),
    getNormalizedSlideLayerOrder: () => [first],
    assignElementId: (element) => element.id,
    isElementLocked: () => false
  });

  assert.equal(controller.reorder('front', [first]), false);
  assert.equal(rebuildCalls, 1);
});

test('layer order controller rejects malformed baselines without a canonical validator', () => {
  const first = { id: 'node-1', isConnected: true };
  const slide = { contains: () => true };
  let rebuildCalls = 0;
  let fallbackLockReads = 0;
  const controller = layerOrderController.createStudioEditorLayerOrderController({
    canonicalDeckApi: {
      ...canonicalDeck,
      isCanonicalDeck: undefined
    },
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeckBaseline: () => {
      rebuildCalls += 1;
      return { invalid: true };
    },
    layerOrderApi: {
      buildStudioLayerOrderMutationPlan(_elements, _action, options) {
        assert.equal(options.isLocked(first), false);
        return { didChange: false };
      }
    },
    getActiveSlide: () => slide,
    getIframeDoc: () => ({ id: 'doc' }),
    getNormalizedSlideLayerOrder: () => [first],
    assignElementId: (element) => element.id,
    isElementLocked: () => {
      fallbackLockReads += 1;
      return false;
    }
  });

  assert.equal(controller.reorder('front', [first]), false);
  assert.equal(rebuildCalls, 1);
  assert.equal(fallbackLockReads, 1);
});

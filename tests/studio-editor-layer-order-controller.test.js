const test = require('node:test');
const assert = require('node:assert/strict');
const layerOrderController = require('../shared/studio-editor-layer-order-controller.js');

test('layer order controller applies the planned order and forwards mutation callbacks', () => {
  const calls = [];
  let builderOptions = null;
  let baselineOptions = null;
  const first = { id: 'first', isConnected: true };
  const second = { id: 'second', isConnected: true };
  const slide = { contains: (element) => element === first || element === second };
  const controller = layerOrderController.createStudioEditorLayerOrderController({
    canonicalDeckApi: { id: 'deck-api' },
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
  assert.equal(baselineOptions.sourceDocument.id, 'doc');
  assert.equal(typeof baselineOptions.buildCanonicalDeckBaseline, 'function');
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

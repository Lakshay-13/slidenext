const test = require('node:test');
const assert = require('node:assert/strict');

const controllerApi = require('../shared/studio-editor-layout-conversion-controller.js');

function createPlan(element, overrides = {}) {
  return {
    selection: [element],
    canConvert: true,
    reason: '',
    items: [{
      element,
      beforeStyle: { position: '', margin: '8px', left: '', top: '', width: '50%', height: '' },
      afterStyle: { position: 'absolute', margin: '0px', left: '100px', top: '40px', width: '300px', height: '80px' },
      layout: { mode: 'absolute', x: 100, y: 40, width: 300, height: 80 }
    }],
    ...overrides
  };
}

test('convert applies one reversible style transaction and canonical layout sidecar', () => {
  const element = {
    dataset: { editorId: 'node-1' },
    style: { position: '', margin: '8px', left: '', top: '', width: '50%', height: '' }
  };
  const transaction = { kind: 'style' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const calls = [];
  const controller = controllerApi.createStudioEditorLayoutConversionController({
    conversionApi: {
      buildStudioFlowToFreeformPlan() {
        return createPlan(element);
      }
    },
    canonicalLayoutApi: {
      createStudioCanonicalLayoutMutationBuilder(builderOptions) {
        assert.equal(builderOptions.canonicalDeckApi.id, 'deck-api');
        return (mutationOptions) => {
          calls.push(['canonical', mutationOptions]);
          return canonicalDeck;
        };
      }
    },
    canonicalDeckApi: { id: 'deck-api' },
    transactionApi: {
      createStudioStyleTransaction(items, options) {
        calls.push(['transaction', items, options]);
        return transaction;
      }
    },
    getDocument: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    finalizeDeckMutation(label, options) {
      calls.push(['finalize', label, options]);
    },
    updateActionState: (doc) => calls.push(['update', doc]),
    assignElementId: (node) => node.dataset.editorId
  });

  assert.equal(controller.convert(), true);
  assert.deepEqual(element.style, {
    position: 'absolute',
    margin: '0px',
    left: '100px',
    top: '40px',
    width: '300px',
    height: '80px'
  });
  assert.equal(calls[0][0], 'transaction');
  assert.equal(calls[1][0], 'canonical');
  assert.deepEqual(calls[1][1].nextItems, [{
    element,
    nextAbsLeft: 100,
    nextAbsTop: 40,
    nextWidth: 300,
    nextHeight: 80
  }]);
  assert.equal(calls[2][0], 'finalize');
  assert.equal(calls[2][1], 'Auto: Converted to Freeform');
  assert.equal(calls[2][2].transaction, transaction);
  assert.equal(calls[2][2].canonicalDeck, canonicalDeck);
  assert.deepEqual(calls[3], ['update', { id: 'doc' }]);
});

test('convert fails closed before DOM mutation when canonical sidecar construction fails', () => {
  const element = {
    dataset: { editorId: 'node-1' },
    style: { position: '', margin: '8px', left: '', top: '', width: '50%', height: '' }
  };
  const controller = controllerApi.createStudioEditorLayoutConversionController({
    conversionApi: { buildStudioFlowToFreeformPlan: () => createPlan(element) },
    canonicalLayoutApi: {
      createStudioCanonicalLayoutMutationBuilder: () => () => null
    },
    transactionApi: { createStudioStyleTransaction: () => ({ kind: 'style' }) },
    getDocument: () => ({ id: 'doc' })
  });

  assert.equal(controller.convert(), false);
  assert.deepEqual(element.style, {
    position: '',
    margin: '8px',
    left: '',
    top: '',
    width: '50%',
    height: ''
  });
});

test('convert fails closed before DOM mutation when finalization is unavailable', () => {
  const element = {
    dataset: { editorId: 'node-1' },
    style: { position: '', margin: '8px', left: '', top: '', width: '50%', height: '' }
  };
  const controller = controllerApi.createStudioEditorLayoutConversionController({
    conversionApi: { buildStudioFlowToFreeformPlan: () => createPlan(element) },
    transactionApi: { createStudioStyleTransaction: () => ({ kind: 'style' }) },
    getDocument: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' })
  });

  assert.equal(controller.convert(), false);
  assert.deepEqual(element.style, {
    position: '',
    margin: '8px',
    left: '',
    top: '',
    width: '50%',
    height: ''
  });
});

test('convert restores flow styles when finalization rejects the mutation', () => {
  const element = {
    dataset: { editorId: 'node-1' },
    style: { position: '', margin: '8px', left: '', top: '', width: '50%', height: '' }
  };
  const updates = [];
  const controller = controllerApi.createStudioEditorLayoutConversionController({
    conversionApi: { buildStudioFlowToFreeformPlan: () => createPlan(element) },
    transactionApi: { createStudioStyleTransaction: () => ({ kind: 'style' }) },
    getDocument: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    finalizeDeckMutation: () => false,
    updateActionState: (doc) => updates.push(doc)
  });

  assert.equal(controller.convert(), false);
  assert.deepEqual(element.style, {
    position: '',
    margin: '8px',
    left: '',
    top: '',
    width: '50%',
    height: ''
  });
  assert.deepEqual(updates, [{ id: 'doc' }]);
});

test('convert does not mutate when the planner rejects the selection', () => {
  const element = {
    style: { position: '', margin: '8px' }
  };
  let transactionCalls = 0;
  const controller = controllerApi.createStudioEditorLayoutConversionController({
    conversionApi: {
      buildStudioFlowToFreeformPlan: () => ({
        selection: [element],
        items: [],
        canConvert: false,
        reason: 'locked-selection'
      })
    },
    transactionApi: {
      createStudioStyleTransaction: () => {
        transactionCalls += 1;
        return { kind: 'style' };
      }
    },
    getDocument: () => ({ id: 'doc' })
  });

  assert.equal(controller.convert(), false);
  assert.equal(transactionCalls, 0);
  assert.deepEqual(element.style, { position: '', margin: '8px' });
});

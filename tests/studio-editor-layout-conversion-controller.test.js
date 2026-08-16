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
  const pendingCanonicalDeck = { kind: 'slidenext.deck', slides: [{ id: 'pending' }] };
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
        assert.equal(builderOptions.getPendingCanonicalDeck(), pendingCanonicalDeck);
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
    getPendingCanonicalDeck: () => pendingCanonicalDeck,
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

test('convert delegates DOM style application and rollback to the shared mutation API', () => {
  const element = {
    dataset: { editorId: 'node-1' },
    style: { position: '', margin: '8px', left: '', top: '', width: '50%', height: '' }
  };
  const calls = [];
  const controller = controllerApi.createStudioEditorLayoutConversionController({
    conversionApi: {
      buildStudioFlowToFreeformPlan: () => createPlan(element)
    },
    conversionMutationApi: {
      applyStudioLayoutConversionStyles(items) {
        calls.push(['apply', items]);
        return true;
      },
      restoreStudioLayoutConversionStyles(items) {
        calls.push(['restore', items]);
        return true;
      }
    },
    transactionApi: { createStudioStyleTransaction: () => ({ kind: 'style' }) },
    getDocument: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    finalizeDeckMutation: () => false
  });

  assert.equal(controller.convert(), false);
  assert.deepEqual(calls.map(([name]) => name), ['apply', 'restore']);
});

test('convert restores styles when the shared mutation rejects after partial application', () => {
  const element = {
    dataset: { editorId: 'node-1' },
    style: { position: '', margin: '8px', left: '', top: '', width: '50%', height: '' }
  };
  const calls = [];
  let finalizeCalls = 0;
  const controller = controllerApi.createStudioEditorLayoutConversionController({
    conversionApi: {
      buildStudioFlowToFreeformPlan: () => createPlan(element)
    },
    conversionMutationApi: {
      applyStudioLayoutConversionStyles() {
        calls.push('apply');
        element.style.position = 'absolute';
        return false;
      },
      restoreStudioLayoutConversionStyles(items) {
        calls.push('restore');
        items.forEach((item) => {
          Object.keys(item.beforeStyle).forEach((property) => {
            item.element.style[property] = item.beforeStyle[property];
          });
        });
        return true;
      }
    },
    transactionApi: { createStudioStyleTransaction: () => ({ kind: 'style' }) },
    getDocument: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    finalizeDeckMutation: () => {
      finalizeCalls += 1;
      return true;
    }
  });

  assert.equal(controller.convert(), false);
  assert.deepEqual(calls, ['apply', 'restore']);
  assert.equal(finalizeCalls, 0);
  assert.deepEqual(element.style, {
    position: '',
    margin: '8px',
    left: '',
    top: '',
    width: '50%',
    height: ''
  });
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

test('convert restores flow styles when finalization throws', () => {
  const element = {
    style: { position: '', margin: '8px', left: '', top: '', width: '50%', height: '' }
  };
  const updates = [];
  const controller = controllerApi.createStudioEditorLayoutConversionController({
    conversionApi: { buildStudioFlowToFreeformPlan: () => createPlan(element) },
    transactionApi: { createStudioStyleTransaction: () => ({ kind: 'style' }) },
    getDocument: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    finalizeDeckMutation: () => {
      throw new Error('history finalization failed');
    },
    updateActionState: (doc) => updates.push(doc)
  });

  assert.doesNotThrow(() => assert.equal(controller.convert(), false));
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

test('convert preserves the result when action-state refresh throws', () => {
  const element = {
    style: { position: '', margin: '8px', left: '', top: '', width: '50%', height: '' }
  };
  const controller = controllerApi.createStudioEditorLayoutConversionController({
    conversionApi: { buildStudioFlowToFreeformPlan: () => createPlan(element) },
    transactionApi: { createStudioStyleTransaction: () => ({ kind: 'style' }) },
    getDocument: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    finalizeDeckMutation: () => true,
    updateActionState() {
      throw new Error('toolbar refresh failed');
    }
  });

  assert.equal(controller.convert(), true);
  assert.equal(element.style.position, 'absolute');
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

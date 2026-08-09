const test = require('node:test');
const assert = require('node:assert/strict');

const layerOrder = require('../shared/studio-editor-layer-order.js');
const transactionState = require('../shared/studio-editor-transaction.js');

test('getStudioLayerOrderSelection filters stale targets and preserves current layer order', () => {
  const stale = { id: 'stale', isConnected: false };
  const first = { id: 'first', isConnected: true };
  const second = { id: 'second', isConnected: true };
  const third = { id: 'third', isConnected: true };

  assert.deepEqual(layerOrder.getStudioLayerOrderSelection(
    [stale, third, first],
    {
      orderedElements: [first, second, third]
    }
  ), [first, third]);
});

test('buildStudioLayerOrderActionState disables locked, deck-not-ready, and no-op layer arrangement actions', () => {
  const first = { id: 'first', isConnected: true, locked: false };
  const second = { id: 'second', isConnected: true, locked: false };
  const third = { id: 'third', isConnected: true, locked: true };
  const orderedElements = [first, second, third];

  assert.deepEqual(layerOrder.buildStudioLayerOrderActionState([second], {
    orderedElements,
    isLocked: (element) => !!element.locked
  }), {
    selection: [second],
    hasSelection: true,
    hasLockedSelection: false,
    canReorder: true,
    canBringToFront: true,
    canSendToBack: true,
    canBringForward: true,
    canSendBackward: true
  });

  assert.deepEqual(layerOrder.buildStudioLayerOrderActionState([third], {
    orderedElements,
    isLocked: (element) => !!element.locked
  }), {
    selection: [third],
    hasSelection: true,
    hasLockedSelection: true,
    canReorder: false,
    canBringToFront: false,
    canSendToBack: false,
    canBringForward: false,
    canSendBackward: false
  });

  assert.deepEqual(layerOrder.buildStudioLayerOrderActionState([first], {
    orderedElements,
    isLocked: (element) => !!element.locked
  }), {
    selection: [first],
    hasSelection: true,
    hasLockedSelection: false,
    canReorder: true,
    canBringToFront: true,
    canSendToBack: false,
    canBringForward: true,
    canSendBackward: false
  });

  assert.deepEqual(layerOrder.buildStudioLayerOrderActionState([second], {
    orderedElements,
    isLocked: (element) => !!element.locked,
    canMutateDeck: () => false
  }), {
    selection: [second],
    hasSelection: true,
    hasLockedSelection: false,
    canReorder: false,
    canBringToFront: false,
    canSendToBack: false,
    canBringForward: false,
    canSendBackward: false
  });
});

test('createStudioLayerOrderActionStateBuilder preserves explicit ordering and document overrides', () => {
  const doc = { id: 'doc' };
  const slide = { id: 'slide' };
  const first = { id: 'first', isConnected: true };
  const second = { id: 'second', isConnected: true };
  const orderedElements = [first, second];
  const buildActionState = layerOrder.createStudioLayerOrderActionStateBuilder({
    getDocument: () => ({ id: 'fallback-doc' }),
    getSelectedElements: () => [first],
    getActiveSlide: () => ({ id: 'fallback-slide' }),
    getNormalizedSlideLayerOrder: () => [],
    getLockedState: () => () => false
  });

  const result = buildActionState([first], {
    doc,
    slide,
    orderedElements,
    canMutateDeck: () => true
  });

  assert.deepEqual(result.selection, [first]);
  assert.equal(result.canReorder, true);
  assert.equal(result.canBringToFront, true);
  assert.equal(result.canSendToBack, false);
});

test('buildStudioLayerOrderToolbarState derives layer arrangement button states from the action state', () => {
  const first = { id: 'first', isConnected: true, locked: false };
  const second = { id: 'second', isConnected: true, locked: false };
  const orderedElements = [first, second];

  assert.deepEqual(layerOrder.buildStudioLayerOrderToolbarState([first], {
    orderedElements,
    isLocked: (element) => !!element.locked
  }), {
    selection: [first],
    hasSelection: true,
    hasLockedSelection: false,
    canReorder: true,
    canBringToFront: true,
    canSendToBack: false,
    canBringForward: true,
    canSendBackward: false,
    buttonStates: {
      arrangeLayerFrontBtn: true,
      arrangeLayerBackBtn: false,
      arrangeLayerForwardBtn: true,
      arrangeLayerBackwardBtn: false
    },
    controlStates: {
      elZIndex: false
    }
  });
});

test('renderStudioLayerOrderToolbarState applies arrangement and z-index control states', () => {
  const buttons = {
    arrangeLayerFrontBtn: { disabled: true },
    arrangeLayerBackBtn: { disabled: true },
    arrangeLayerForwardBtn: { disabled: true },
    arrangeLayerBackwardBtn: { disabled: true },
    elZIndex: { disabled: true }
  };

  assert.equal(layerOrder.renderStudioLayerOrderToolbarState({
    documentRef: {
      getElementById(id) {
        return buttons[id] || null;
      }
    },
    actionState: {
      buttonStates: {
        arrangeLayerFrontBtn: true,
        arrangeLayerBackBtn: false,
        arrangeLayerForwardBtn: true,
        arrangeLayerBackwardBtn: false
      },
      controlStates: {
        elZIndex: true
      }
    }
  }), true);
  assert.equal(buttons.arrangeLayerFrontBtn.disabled, false);
  assert.equal(buttons.arrangeLayerBackBtn.disabled, true);
  assert.equal(buttons.arrangeLayerForwardBtn.disabled, false);
  assert.equal(buttons.arrangeLayerBackwardBtn.disabled, true);
  assert.equal(buttons.elZIndex.disabled, false);
});

test('syncStudioLayerOrderZIndexInput updates the inspector control for a target', () => {
  const zIndexInput = { value: '' };
  const target = { style: { zIndex: '12' } };

  assert.equal(layerOrder.syncStudioLayerOrderZIndexInput({
    target,
    documentRef: {
      getElementById(id) {
        return id === 'elZIndex' ? zIndexInput : null;
      }
    }
  }), zIndexInput);
  assert.equal(zIndexInput.value, '12');
  assert.equal(layerOrder.syncStudioLayerOrderZIndexInput({ target: null }), null);
});

test('syncStudioLayerOrderZIndexInput prefers canonical node layout data', () => {
  const zIndexInput = { value: '' };

  assert.equal(layerOrder.syncStudioLayerOrderZIndexInput({
    target: { style: { zIndex: '12' } },
    canonicalTarget: { layout: { zIndex: 7 } },
    documentRef: {
      getElementById(id) {
        return id === 'elZIndex' ? zIndexInput : null;
      }
    }
  }), zIndexInput);
  assert.equal(zIndexInput.value, '7');
});

test('syncStudioLayerOrderToolbarState builds and renders layer controls in one shared operation', () => {
  const element = { id: 'element-1', isConnected: true, locked: false };
  const controls = {
    arrangeLayerFrontBtn: { disabled: true },
    arrangeLayerBackBtn: { disabled: true },
    arrangeLayerForwardBtn: { disabled: true },
    arrangeLayerBackwardBtn: { disabled: true },
    elZIndex: { disabled: true }
  };
  const orderedElements = [element];

  assert.equal(layerOrder.syncStudioLayerOrderToolbarState({
    documentRef: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    elements: [element],
    orderedElements,
    isLocked: (target) => !!target.locked,
    canMutateDeck: () => true,
    buildZIndexMutationPlan(targets) {
      assert.deepEqual(targets, [element]);
      return { canApply: true };
    }
  }), true);
  assert.equal(controls.elZIndex.disabled, false);
  assert.equal(controls.arrangeLayerFrontBtn.disabled, true);
});

test('buildStudioLayerOrderToolbarState can include shared z-index control enablement', () => {
  const first = { id: 'first', isConnected: true, locked: false };
  const orderedElements = [first];

  assert.deepEqual(layerOrder.buildStudioLayerOrderToolbarState([first], {
    orderedElements,
    isLocked: (element) => !!element.locked,
    buildZIndexMutationPlan(elements, options = {}) {
      assert.deepEqual(elements, [first]);
      assert.deepEqual(options.orderedElements, orderedElements);
      return {
        canApply: true
      };
    }
  }).controlStates, {
    elZIndex: true
  });
});

test('buildStudioLayerOrderMutationPlan reuses the action-state readiness and lock guards before reordering layers', () => {
  const first = { id: 'first', isConnected: true, locked: false };
  const second = { id: 'second', isConnected: true, locked: false };
  const third = { id: 'third', isConnected: true, locked: true };
  const orderedElements = [first, second, third];

  assert.deepEqual(layerOrder.buildStudioLayerOrderMutationPlan([third], 'front', {
    orderedElements,
    isLocked: (element) => !!element.locked
  }), {
    selection: [third],
    didChange: false,
    nextOrder: [first, second, third]
  });

  assert.deepEqual(layerOrder.buildStudioLayerOrderMutationPlan([second], 'front', {
    orderedElements,
    isLocked: (element) => !!element.locked
  }), {
    selection: [second],
    didChange: true,
    nextOrder: [first, third, second]
  });

  assert.deepEqual(layerOrder.buildStudioLayerOrderMutationPlan([second], 'front', {
    orderedElements,
    isLocked: (element) => !!element.locked,
    canMutateDeck: () => false
  }), {
    selection: [second],
    didChange: false,
    nextOrder: [first, second, third]
  });
});

test('buildStudioReorderedLayerOrder moves targets to front or back in layer order', () => {
  const first = { id: 'first', isConnected: true };
  const second = { id: 'second', isConnected: true };
  const third = { id: 'third', isConnected: true };
  const initialOrder = [first, second, third];

  assert.deepEqual(layerOrder.buildStudioReorderedLayerOrder(initialOrder, [second], 'front'), {
    didChange: true,
    nextOrder: [first, third, second]
  });

  assert.deepEqual(layerOrder.buildStudioReorderedLayerOrder(initialOrder, [second], 'back'), {
    didChange: true,
    nextOrder: [second, first, third]
  });
});

test('buildStudioReorderedLayerOrder moves targets forward and backward by one layer', () => {
  const first = { id: 'first', isConnected: true };
  const second = { id: 'second', isConnected: true };
  const third = { id: 'third', isConnected: true };
  const initialOrder = [first, second, third];

  assert.deepEqual(layerOrder.buildStudioReorderedLayerOrder(initialOrder, [second], 'forward'), {
    didChange: true,
    nextOrder: [first, third, second]
  });

  assert.deepEqual(layerOrder.buildStudioReorderedLayerOrder(initialOrder, [second], 'backward'), {
    didChange: true,
    nextOrder: [second, first, third]
  });
});

test('buildStudioReorderedLayerOrder skips stale targets and no-op reorder requests', () => {
  const first = { id: 'first', isConnected: true };
  const second = { id: 'second', isConnected: true };
  const initialOrder = [first, second];

  assert.deepEqual(layerOrder.buildStudioReorderedLayerOrder(initialOrder, [
    { id: 'stale', isConnected: false }
  ], 'front'), {
    didChange: false,
    nextOrder: [first, second]
  });

  assert.deepEqual(layerOrder.buildStudioReorderedLayerOrder(initialOrder, [second], 'forward'), {
    didChange: false,
    nextOrder: [first, second]
  });

  assert.deepEqual(layerOrder.buildStudioReorderedLayerOrder(initialOrder, [first], 'invalid'), {
    didChange: false,
    nextOrder: [first, second]
  });
});

test('applyStudioLayerOrderMutation applies the next order and creates an optional z-index transaction', () => {
  const first = {
    dataset: { editorId: 'node-1' },
    style: { zIndex: '0' }
  };
  const second = {
    dataset: { editorId: 'node-2' },
    style: { zIndex: '1' }
  };
  const slide = { id: 'slide-1' };
  const result = layerOrder.applyStudioLayerOrderMutation(slide, [first, second], [second, first], {
    applyLayerOrder(currentSlide, nextOrder) {
      assert.equal(currentSlide, slide);
      nextOrder.forEach((element, index) => {
        element.style.zIndex = `${index}`;
      });
    },
    createStyleTransaction: transactionState.createStudioStyleTransaction,
    getElementId: (element) => element.dataset.editorId
  });

  assert.equal(result.didApply, true);
  assert.deepEqual(result.transaction.operations.map((operation) => operation.elementId), ['node-1', 'node-2']);
  assert.deepEqual(result.transaction.operations[0].before, { zIndex: '0' });
  assert.deepEqual(result.transaction.operations[0].after, { zIndex: '1' });
});

test('applyStudioLayerOrderWithTransaction delegates mutation dependencies', () => {
  const slide = { id: 'slide-1' };
  const initialOrder = [{ id: 'node-1' }];
  const nextOrder = [{ id: 'node-2' }];
  const calls = [];
  const result = layerOrder.applyStudioLayerOrderWithTransaction(slide, initialOrder, nextOrder, {
    applyStudioLayerOrderMutation(...args) {
      calls.push(args);
      return { didApply: true, transaction: { id: 'tx-layer' } };
    },
    createStudioStyleTransaction() {},
    getElementId() {},
    applyLayerOrder() {}
  });

  assert.deepEqual(result, { didApply: true, transaction: { id: 'tx-layer' } });
  assert.deepEqual(calls[0].slice(0, 3), [slide, initialOrder, nextOrder]);
});

test('applyStudioLayerOrderWithTransaction preserves fallback style transaction capture', () => {
  const first = { dataset: { editorId: 'node-1' }, style: { zIndex: '0' } };
  const second = { dataset: { editorId: 'node-2' }, style: { zIndex: '1' } };
  const transaction = { type: 'style' };
  const result = layerOrder.applyStudioLayerOrderWithTransaction(
    { id: 'slide-1' },
    [first, second],
    [second, first],
    {
      applyLayerOrder(_slide, nextOrder) {
        nextOrder.forEach((element, index) => {
          element.style.zIndex = `${index}`;
        });
      },
      createStudioStyleTransaction(items) {
        return transaction;
      }
    }
  );

  assert.equal(result.didApply, true);
  assert.equal(result.transaction, transaction);
  assert.equal(first.style.zIndex, '1');
  assert.equal(second.style.zIndex, '0');
});

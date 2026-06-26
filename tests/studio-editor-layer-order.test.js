const test = require('node:test');
const assert = require('node:assert/strict');

const layerOrder = require('../shared/studio-editor-layer-order.js');

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

const test = require('node:test');
const assert = require('node:assert/strict');

const transformState = require('../shared/studio-editor-transform.js');

test('canStudioTransformSelection rejects empty selections', () => {
  assert.equal(transformState.canStudioTransformSelection([], {
    isLocked: () => false,
    isFreeformPositioned: () => true
  }), false);
});

test('canStudioTransformSelection allows connected unlocked freeform selections', () => {
  assert.equal(transformState.canStudioTransformSelection([
    { id: 1, isConnected: true },
    { id: 2, isConnected: true }
  ], {
    isLocked: () => false,
    isFreeformPositioned: () => true
  }), true);
});

test('canStudioTransformSelection ignores disconnected stale selections', () => {
  assert.equal(transformState.canStudioTransformSelection([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ], {
    isLocked: () => false,
    isFreeformPositioned: () => true
  }), true);

  assert.equal(transformState.canStudioTransformSelection([
    { id: 1, isConnected: false }
  ], {
    isLocked: () => false,
    isFreeformPositioned: () => true
  }), false);
});

test('canStudioTransformSelection rejects locked or non-freeform selections', () => {
  assert.equal(transformState.canStudioTransformSelection([
    { id: 1, isConnected: true },
    { id: 2, isConnected: true }
  ], {
    isLocked: (element) => element.id === 2,
    isFreeformPositioned: () => true
  }), false);

  assert.equal(transformState.canStudioTransformSelection([
    { id: 1, isConnected: true }
  ], {
    isLocked: () => false,
    isFreeformPositioned: () => false
  }), false);
});

test('buildStudioTransformSelectionState returns filtered live selections and transform state', () => {
  assert.deepEqual(transformState.buildStudioTransformSelectionState([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ], {
    isLocked: () => false,
    isFreeformPositioned: () => true
  }), {
    selection: [{ id: 2, isConnected: true }],
    canTransform: true
  });

  assert.deepEqual(transformState.buildStudioTransformSelectionState([
    { id: 1, isConnected: true }
  ], {
    isLocked: () => true,
    isFreeformPositioned: () => true
  }), {
    selection: [{ id: 1, isConnected: true }],
    canTransform: false
  });
});

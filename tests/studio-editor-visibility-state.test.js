const test = require('node:test');
const assert = require('node:assert/strict');

const visibilityState = require('../shared/studio-editor-visibility-state.js');

test('getStudioVisibilitySelection ignores disconnected stale selections', () => {
  assert.deepEqual(visibilityState.getStudioVisibilitySelection([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ]), [
    { id: 2, isConnected: true }
  ]);
});

test('buildStudioVisibilityActionState derives visibility button state from live selections only', () => {
  assert.deepEqual(visibilityState.buildStudioVisibilityActionState([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ], {
    isHidden: () => false
  }), {
    hasSelection: true,
    allHidden: false
  });

  assert.deepEqual(visibilityState.buildStudioVisibilityActionState([
    { id: 1, isConnected: true }
  ], {
    isHidden: () => true
  }), {
    hasSelection: true,
    allHidden: true
  });

  assert.deepEqual(visibilityState.buildStudioVisibilityActionState([
    { id: 1, isConnected: false }
  ], {
    isHidden: () => false
  }), {
    hasSelection: false,
    allHidden: false
  });
});

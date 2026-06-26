const test = require('node:test');
const assert = require('node:assert/strict');

const lockState = require('../shared/studio-editor-lock-state.js');

test('getStudioLockSelection ignores disconnected stale selections', () => {
  assert.deepEqual(lockState.getStudioLockSelection([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ]), [
    { id: 2, isConnected: true }
  ]);
});

test('buildStudioLockActionState derives button state from live selections only', () => {
  assert.deepEqual(lockState.buildStudioLockActionState([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ], {
    isLocked: () => false
  }), {
    hasSelection: true,
    allLocked: false,
    canRemove: true
  });

  assert.deepEqual(lockState.buildStudioLockActionState([
    { id: 1, isConnected: true }
  ], {
    isLocked: () => true
  }), {
    hasSelection: true,
    allLocked: true,
    canRemove: false
  });

  assert.deepEqual(lockState.buildStudioLockActionState([
    { id: 1, isConnected: false }
  ], {
    isLocked: () => false
  }), {
    hasSelection: false,
    allLocked: false,
    canRemove: false
  });
});

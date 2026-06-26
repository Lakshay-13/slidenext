const test = require('node:test');
const assert = require('node:assert/strict');

const removal = require('../shared/studio-editor-removal.js');

test('getStudioRemovableSelection ignores disconnected stale selections', () => {
  assert.deepEqual(removal.getStudioRemovableSelection([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ]), [
    { id: 2, isConnected: true }
  ]);
});

test('buildStudioRemovalActionState derives delete availability from live unlocked selections only', () => {
  assert.deepEqual(removal.buildStudioRemovalActionState([
    { id: 1, isConnected: false, locked: false },
    { id: 2, isConnected: true, locked: false }
  ], {
    isLocked: (element) => !!element.locked
  }), {
    selection: [{ id: 2, isConnected: true, locked: false }],
    hasSelection: true,
    canRemove: true
  });

  assert.deepEqual(removal.buildStudioRemovalActionState([
    { id: 1, isConnected: true, locked: true }
  ], {
    isLocked: (element) => !!element.locked
  }), {
    selection: [{ id: 1, isConnected: true, locked: true }],
    hasSelection: true,
    canRemove: false
  });

  assert.deepEqual(removal.buildStudioRemovalActionState([
    { id: 1, isConnected: false, locked: false }
  ], {
    isLocked: (element) => !!element.locked
  }), {
    selection: [],
    hasSelection: false,
    canRemove: false
  });
});

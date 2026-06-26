const test = require('node:test');
const assert = require('node:assert/strict');

const liveSelection = require('../shared/studio-editor-live-selection.js');

test('getStudioLiveSelection ignores disconnected stale selections', () => {
  assert.deepEqual(liveSelection.getStudioLiveSelection([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ]), [
    { id: 2, isConnected: true }
  ]);
});

test('buildStudioLiveSelectionState derives count and primary live element', () => {
  assert.deepEqual(liveSelection.buildStudioLiveSelectionState([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true },
    { id: 3, isConnected: true }
  ]), {
    selection: [
      { id: 2, isConnected: true },
      { id: 3, isConnected: true }
    ],
    hasSelection: true,
    count: 2,
    primaryElement: { id: 2, isConnected: true }
  });

  assert.deepEqual(liveSelection.buildStudioLiveSelectionState([
    { id: 1, isConnected: false }
  ]), {
    selection: [],
    hasSelection: false,
    count: 0,
    primaryElement: null
  });
});

test('hasStudioLockedLiveSelection only considers connected selections', () => {
  assert.equal(liveSelection.hasStudioLockedLiveSelection([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ], {
    isLocked: (element) => element.id === 1
  }), false);

  assert.equal(liveSelection.hasStudioLockedLiveSelection([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ], {
    isLocked: (element) => element.id === 2
  }), true);
});

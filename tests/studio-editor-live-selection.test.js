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

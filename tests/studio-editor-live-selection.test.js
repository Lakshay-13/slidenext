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

  assert.deepEqual(liveSelection.getStudioLiveSelection([
    { id: 1, isConnected: false, include: true },
    { id: 2, isConnected: true, include: true },
    { id: 3, isConnected: true, include: false }
  ], {
    isEligibleElement: (element) => !!element.include
  }), [
    { id: 2, isConnected: true, include: true }
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

test('isStudioLiveSelectedElement only matches connected selected elements', () => {
  const stale = { id: 1, isConnected: false };
  const live = { id: 2, isConnected: true };

  assert.equal(liveSelection.isStudioLiveSelectedElement([stale, live], stale), false);
  assert.equal(liveSelection.isStudioLiveSelectedElement([stale, live], live), true);
  assert.equal(liveSelection.isStudioLiveSelectedElement([stale], null), false);
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

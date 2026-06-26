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

test('buildStudioVisibilityMutationPlan derives the next visibility toggle from the live selection only', () => {
  const visible = { id: 1, isConnected: true, hidden: false };
  const hidden = { id: 2, isConnected: true, hidden: true };

  assert.deepEqual(visibilityState.buildStudioVisibilityMutationPlan([
    { id: 'stale', isConnected: false, hidden: false },
    visible
  ], {
    isHidden: (element) => !!element.hidden
  }), {
    selection: [visible],
    shouldHide: true,
    didChange: true,
    versionLabel: 'Auto: Hid Element'
  });

  assert.deepEqual(visibilityState.buildStudioVisibilityMutationPlan([hidden], {
    isHidden: (element) => !!element.hidden
  }), {
    selection: [hidden],
    shouldHide: false,
    didChange: true,
    versionLabel: 'Auto: Showed Element'
  });

  assert.deepEqual(visibilityState.buildStudioVisibilityMutationPlan([
    { id: 'stale', isConnected: false, hidden: false }
  ], {
    isHidden: (element) => !!element.hidden
  }), {
    selection: [],
    shouldHide: false,
    didChange: false,
    versionLabel: ''
  });
});

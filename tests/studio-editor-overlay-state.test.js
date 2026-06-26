const test = require('node:test');
const assert = require('node:assert/strict');

const overlayState = require('../shared/studio-editor-overlay-state.js');

test('getStudioVisibleSelection ignores disconnected and hidden selections', () => {
  assert.deepEqual(overlayState.getStudioVisibleSelection([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true, hidden: true },
    { id: 3, isConnected: true, hidden: false }
  ], {
    isHidden: (element) => element.hidden
  }), [
    { id: 3, isConnected: true, hidden: false }
  ]);
});

test('buildStudioSelectionOverlayState only reports visible live selections', () => {
  assert.deepEqual(overlayState.buildStudioSelectionOverlayState([
    { id: 1, isConnected: false, hidden: false },
    { id: 2, isConnected: true, hidden: true }
  ], {
    isHidden: (element) => element.hidden
  }), {
    visibleSelection: [],
    hasVisibleSelection: false
  });

  assert.deepEqual(overlayState.buildStudioSelectionOverlayState([
    { id: 1, isConnected: true, hidden: false }
  ], {
    isHidden: (element) => element.hidden
  }), {
    visibleSelection: [{ id: 1, isConnected: true, hidden: false }],
    hasVisibleSelection: true
  });
});

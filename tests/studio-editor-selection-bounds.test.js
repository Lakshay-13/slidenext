const test = require('node:test');
const assert = require('node:assert/strict');

const selectionBounds = require('../shared/studio-editor-selection-bounds.js');

test('getStudioBoundableSelection ignores disconnected and hidden selections', () => {
  assert.deepEqual(selectionBounds.getStudioBoundableSelection([
    { id: 1, isConnected: false, hidden: false },
    { id: 2, isConnected: true, hidden: true },
    { id: 3, isConnected: true, hidden: false }
  ], {
    isHidden: (element) => element.hidden
  }), [
    { id: 3, isConnected: true, hidden: false }
  ]);
});

test('buildStudioSelectionBounds computes bounds from live visible elements', () => {
  assert.deepEqual(selectionBounds.buildStudioSelectionBounds([
    { id: 1, isConnected: false, hidden: false, bounds: { left: 0, top: 0, right: 100, bottom: 100 } },
    { id: 2, isConnected: true, hidden: true, bounds: { left: 5, top: 5, right: 50, bottom: 50 } },
    { id: 3, isConnected: true, hidden: false, bounds: { left: 10, top: 20, right: 30, bottom: 40 } },
    { id: 4, isConnected: true, hidden: false, bounds: { left: 25, top: 10, right: 80, bottom: 90 } }
  ], {
    minSizePx: 24,
    isHidden: (element) => element.hidden,
    getElementBounds: (element) => element.bounds
  }), {
    left: 10,
    top: 10,
    right: 80,
    bottom: 90,
    width: 70,
    height: 80
  });
});

test('buildStudioSelectionBounds enforces minimum size and skips invalid bounds', () => {
  assert.deepEqual(selectionBounds.buildStudioSelectionBounds([
    { id: 1, isConnected: true, hidden: false, bounds: null },
    { id: 2, isConnected: true, hidden: false, bounds: { left: 10, top: 10, right: 20, bottom: 20 } }
  ], {
    minSizePx: 24,
    isHidden: (element) => element.hidden,
    getElementBounds: (element) => element.bounds
  }), {
    left: 10,
    top: 10,
    right: 20,
    bottom: 20,
    width: 24,
    height: 24
  });

  assert.equal(selectionBounds.buildStudioSelectionBounds([
    { id: 1, isConnected: false, hidden: false, bounds: { left: 0, top: 0, right: 10, bottom: 10 } }
  ], {
    getElementBounds: (element) => element.bounds
  }), null);
});

test('getStudioMarqueeSelection normalizes reverse drags and returns overlapping live elements', () => {
  const elements = [
    { id: 1, isConnected: false, hidden: false, bounds: { left: 10, top: 10, right: 30, bottom: 30 } },
    { id: 2, isConnected: true, hidden: true, bounds: { left: 10, top: 10, right: 30, bottom: 30 } },
    { id: 3, isConnected: true, hidden: false, bounds: { left: 10, top: 10, right: 30, bottom: 30 } },
    { id: 4, isConnected: true, hidden: false, bounds: { left: 30, top: 30, right: 50, bottom: 50 } },
    { id: 5, isConnected: true, hidden: false, bounds: null }
  ];

  assert.deepEqual(selectionBounds.getStudioMarqueeSelection(elements, {
    left: 35,
    top: 35,
    right: 15,
    bottom: 15
  }, {
    isHidden: (element) => element.hidden,
    getElementBounds: (element) => element.bounds
  }), [elements[2], elements[3]]);
});

test('getStudioMarqueeSelection ignores edge-only contact and invalid marquee bounds', () => {
  const elements = [
    { id: 1, isConnected: true, bounds: { left: 0, top: 0, right: 10, bottom: 10 } },
    { id: 2, isConnected: true, bounds: { left: 10, top: 0, right: 20, bottom: 10 } }
  ];

  assert.deepEqual(selectionBounds.getStudioMarqueeSelection(elements, {
    left: 10,
    top: 0,
    right: 20,
    bottom: 10
  }, {
    getElementBounds: (element) => element.bounds
  }), [elements[1]]);
  assert.deepEqual(selectionBounds.getStudioMarqueeSelection(elements, null, {
    getElementBounds: (element) => element.bounds
  }), []);
});

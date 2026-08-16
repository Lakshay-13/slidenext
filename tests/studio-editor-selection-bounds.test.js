const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const selectionBounds = require('../shared/studio-editor-selection-bounds.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('editor composes selection bounds through the shared resolver', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorSelectionBoundsResolver =/);
  assert.match(source, /createStudioSelectionBoundsResolver\(/);
  assert.match(source, /getSelectedElements: \(doc\) => getStudioSelectedElements\(doc\),/);
  assert.match(source, /return typeof studioEditorSelectionBoundsResolver === 'function'/);
  assert.doesNotMatch(source, /getSelectionBounds\.resolver/);
});

test('getStudioBoundableSelection ignores disconnected, hidden, and locked selections', () => {
  assert.deepEqual(selectionBounds.getStudioBoundableSelection([
    { id: 1, isConnected: false, hidden: false },
    { id: 2, isConnected: true, hidden: true },
    { id: 3, isConnected: true, hidden: false, locked: true },
    { id: 4, isConnected: true, hidden: false, locked: false }
  ], {
    isHidden: (element) => element.hidden,
    isLocked: (element) => element.locked
  }), [
    { id: 4, isConnected: true, hidden: false, locked: false }
  ]);
});

test('getStudioBoundableSelection fails closed when visibility readers throw', () => {
  const elements = [
    { id: 'safe', isConnected: true },
    { id: 'hidden-reader-error', isConnected: true },
    { id: 'locked-reader-error', isConnected: true }
  ];

  assert.deepEqual(selectionBounds.getStudioBoundableSelection(elements, {
    isHidden: (element) => {
      if (element.id === 'hidden-reader-error') throw new Error('stale hidden state');
      return false;
    },
    isLocked: (element) => {
      if (element.id === 'locked-reader-error') throw new Error('stale locked state');
      return false;
    }
  }), [elements[0]]);
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

test('buildStudioSelectionBounds falls back for invalid minimum sizes', () => {
  const element = {
    isConnected: true,
    bounds: { left: 10, top: 10, right: 15, bottom: 15 }
  };
  const buildOptions = (minSizePx) => ({
    minSizePx,
    getElementBounds: (target) => target.bounds
  });

  assert.deepEqual(selectionBounds.buildStudioSelectionBounds([element], buildOptions(Number.NaN)), {
    left: 10,
    top: 10,
    right: 15,
    bottom: 15,
    width: 24,
    height: 24
  });
  assert.deepEqual(selectionBounds.buildStudioSelectionBounds([element], buildOptions(-1)), {
    left: 10,
    top: 10,
    right: 15,
    bottom: 15,
    width: 24,
    height: 24
  });
});

test('createStudioSelectionBoundsResolver assembles editor geometry and hidden state', () => {
  const documentRef = { id: 'iframe-document' };
  const slide = { id: 'slide-1' };
  const hiddenElement = {
    hidden: true,
    getBoundingClientRect() {
      return { left: 100, top: 100, right: 200, bottom: 200 };
    }
  };
  const visibleElement = {
    hidden: false,
    getBoundingClientRect() {
      return { left: 10, top: 20, right: 70, bottom: 80 };
    }
  };
  const calls = [];
  const resolveBounds = selectionBounds.createStudioSelectionBoundsResolver({
    getCurrentDocument: () => documentRef,
    getActiveSlide: (doc) => {
      calls.push(['slide', doc]);
      return slide;
    },
    getSelectedElements: (doc) => {
      assert.equal(doc, documentRef);
      return [hiddenElement, visibleElement];
    },
    getSlideMetrics: (currentSlide) => {
      calls.push(['metrics', currentSlide]);
      return { id: 'metrics-1' };
    },
    getRectOnSlide: (rect, metrics) => {
      calls.push(['rect', rect, metrics]);
      return rect;
    },
    getHiddenStateReader: (doc) => {
      calls.push(['hidden', doc]);
      return (element) => element.hidden;
    },
    getMinSizePx: () => 24
  });

  assert.deepEqual(resolveBounds(), {
    left: 10,
    top: 20,
    right: 70,
    bottom: 80,
    width: 60,
    height: 60
  });
  assert.deepEqual(calls.map(([name]) => name), [
    'slide',
    'metrics',
    'hidden',
    'rect'
  ]);
  assert.equal(calls[0][1], documentRef);
  assert.equal(calls[1][1], slide);
});

test('createStudioSelectionBoundsResolver returns null without an active slide', () => {
  const resolveBounds = selectionBounds.createStudioSelectionBoundsResolver({
    getActiveSlide: () => null,
    getSelectedElements: () => [{ id: 'element-1' }]
  });

  assert.equal(resolveBounds(), null);
});

test('getStudioMarqueeSelection normalizes reverse drags and returns overlapping live elements', () => {
  const elements = [
    { id: 1, isConnected: false, hidden: false, bounds: { left: 10, top: 10, right: 30, bottom: 30 } },
    { id: 2, isConnected: true, hidden: true, bounds: { left: 10, top: 10, right: 30, bottom: 30 } },
    { id: 3, isConnected: true, hidden: false, bounds: { left: 10, top: 10, right: 30, bottom: 30 } },
    { id: 4, isConnected: true, hidden: false, bounds: { left: 30, top: 30, right: 50, bottom: 50 } },
    { id: 5, isConnected: true, hidden: false, bounds: null },
    { id: 6, isConnected: true, hidden: false, locked: true, bounds: { left: 10, top: 10, right: 30, bottom: 30 } }
  ];

  assert.deepEqual(selectionBounds.getStudioMarqueeSelection(elements, {
    left: 35,
    top: 35,
    right: 15,
    bottom: 15
  }, {
    isHidden: (element) => element.hidden,
    isLocked: (element) => element.locked,
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

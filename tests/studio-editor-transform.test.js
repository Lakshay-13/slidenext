const test = require('node:test');
const assert = require('node:assert/strict');

const transformState = require('../shared/studio-editor-transform.js');

test('canStudioTransformSelection rejects empty selections', () => {
  assert.equal(transformState.canStudioTransformSelection([], {
    isLocked: () => false,
    isFreeformPositioned: () => true
  }), false);
});

test('canStudioTransformSelection allows connected unlocked freeform selections', () => {
  assert.equal(transformState.canStudioTransformSelection([
    { id: 1, isConnected: true },
    { id: 2, isConnected: true }
  ], {
    isLocked: () => false,
    isFreeformPositioned: () => true
  }), true);
});

test('canStudioTransformSelection ignores disconnected stale selections', () => {
  assert.equal(transformState.canStudioTransformSelection([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ], {
    isLocked: () => false,
    isFreeformPositioned: () => true
  }), true);

  assert.equal(transformState.canStudioTransformSelection([
    { id: 1, isConnected: false }
  ], {
    isLocked: () => false,
    isFreeformPositioned: () => true
  }), false);
});

test('canStudioTransformSelection rejects locked or non-freeform selections', () => {
  assert.equal(transformState.canStudioTransformSelection([
    { id: 1, isConnected: true },
    { id: 2, isConnected: true }
  ], {
    isLocked: (element) => element.id === 2,
    isFreeformPositioned: () => true
  }), false);

  assert.equal(transformState.canStudioTransformSelection([
    { id: 1, isConnected: true }
  ], {
    isLocked: () => false,
    isFreeformPositioned: () => false
  }), false);
});

test('buildStudioTransformSelectionState returns filtered live selections and transform state', () => {
  assert.deepEqual(transformState.buildStudioTransformSelectionState([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ], {
    isLocked: () => false,
    isFreeformPositioned: () => true
  }), {
    selection: [{ id: 2, isConnected: true }],
    canTransform: true
  });

  assert.deepEqual(transformState.buildStudioTransformSelectionState([
    { id: 1, isConnected: true }
  ], {
    isLocked: () => true,
    isFreeformPositioned: () => true
  }), {
    selection: [{ id: 1, isConnected: true }],
    canTransform: false
  });
});

test('isStudioFreeformPositioned only accepts absolute and fixed positioned elements', () => {
  const view = {
    getComputedStyle(element) {
      return { position: element.position };
    }
  };

  assert.equal(transformState.isStudioFreeformPositioned({
    position: 'absolute',
    ownerDocument: { defaultView: view }
  }), true);
  assert.equal(transformState.isStudioFreeformPositioned({
    position: 'fixed',
    ownerDocument: { defaultView: view }
  }), true);
  assert.equal(transformState.isStudioFreeformPositioned({
    position: 'relative',
    ownerDocument: { defaultView: view }
  }), false);
  assert.equal(transformState.isStudioFreeformPositioned({
    position: 'absolute'
  }), false);
});

test('shouldStudioResizeWidth and shouldStudioResizeHeight follow the editor resize tag policy', () => {
  assert.equal(transformState.shouldStudioResizeWidth({ tagName: 'IMG' }), true);
  assert.equal(transformState.shouldStudioResizeWidth({ tagName: 'SPAN' }), false);
  assert.equal(transformState.shouldStudioResizeHeight({ tagName: 'DIV' }), true);
  assert.equal(transformState.shouldStudioResizeHeight({ tagName: 'P' }), false);
});

test('normalizeStudioTransformBounds clamps drag motion and resize bounds deterministically', () => {
  assert.deepEqual(transformState.normalizeStudioTransformBounds({
    left: -40,
    top: -50,
    right: 260,
    bottom: 190
  }, {
    width: 200,
    height: 120
  }, {
    mode: 'drag',
    dragOverflowMarginPx: 16
  }), {
    left: -16,
    top: -16,
    right: 284,
    bottom: 224,
    width: 300,
    height: 240
  });

  assert.deepEqual(transformState.normalizeStudioTransformBounds({
    left: 180,
    top: 90,
    right: 185,
    bottom: 95
  }, {
    width: 200,
    height: 120
  }, {
    mode: 'resize',
    handleDir: 'nw',
    minSizePx: 20
  }), {
    left: 165,
    top: 75,
    right: 185,
    bottom: 95,
    width: 20,
    height: 20
  });
});

test('applyStudioTransformBounds updates drag and resize item styles using shared transform math', () => {
  const dragElement = { tagName: 'DIV', style: {} };
  transformState.applyStudioTransformBounds({
    type: 'drag',
    startBounds: { left: 100, top: 80 },
    items: [{
      element: dragElement,
      startAbsLeft: 120,
      startAbsTop: 95,
      parentOffsetLeft: 10,
      parentOffsetTop: 20
    }]
  }, {
    left: 140,
    top: 110
  }, {
    minSizePx: 20
  });

  assert.equal(dragElement.style.left, '150px');
  assert.equal(dragElement.style.top, '105px');

  const resizeElement = { tagName: 'DIV', style: {} };
  transformState.applyStudioTransformBounds({
    type: 'resize',
    startBounds: { left: 100, top: 80, width: 200, height: 100 },
    items: [{
      element: resizeElement,
      startAbsLeft: 120,
      startAbsTop: 90,
      startWidth: 80,
      startHeight: 40,
      parentOffsetLeft: 20,
      parentOffsetTop: 10
    }]
  }, {
    left: 100,
    top: 80,
    width: 300,
    height: 150
  }, {
    minSizePx: 20
  });

  assert.equal(resizeElement.style.left, '110px');
  assert.equal(resizeElement.style.top, '85px');
  assert.equal(resizeElement.style.width, '120px');
  assert.equal(resizeElement.style.height, '60px');
});

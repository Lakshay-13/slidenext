const test = require('node:test');
const assert = require('node:assert/strict');

const transformState = require('../shared/studio-editor-transform.js');

function createClassList() {
  const values = new Set();
  return {
    add(value) {
      values.add(value);
    },
    remove(value) {
      values.delete(value);
    },
    contains(value) {
      return values.has(value);
    }
  };
}

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

test('buildStudioTransformPointerSelectionPlan makes transform target reselection explicit', () => {
  const dragTarget = { id: 'node-1' };

  assert.deepEqual(transformState.buildStudioTransformPointerSelectionPlan({
    selection: []
  }, {}), {
    hasTransformTarget: false,
    shouldSelectTarget: false,
    selectOptions: {
      additive: false,
      toggle: false
    },
    shouldFallbackSelectTarget: false
  });

  assert.deepEqual(transformState.buildStudioTransformPointerSelectionPlan({
    selection: []
  }, {
    dragTarget,
    shiftKey: true
  }), {
    hasTransformTarget: true,
    shouldSelectTarget: true,
    selectOptions: {
      additive: true,
      toggle: true
    },
    shouldFallbackSelectTarget: false
  });

  assert.deepEqual(transformState.buildStudioTransformPointerSelectionPlan({
    selection: []
  }, {
    dragTarget,
    didAttemptSelection: true
  }), {
    hasTransformTarget: true,
    shouldSelectTarget: true,
    selectOptions: {
      additive: false,
      toggle: false
    },
    shouldFallbackSelectTarget: true
  });

  assert.deepEqual(transformState.buildStudioTransformPointerSelectionPlan({
    selection: [dragTarget]
  }, {
    dragTarget,
    handle: { id: 'handle' }
  }), {
    hasTransformTarget: true,
    shouldSelectTarget: false,
    selectOptions: {
      additive: false,
      toggle: false
    },
    shouldFallbackSelectTarget: false
  });
});

test('resolveStudioTransformPointerSelectionState applies transform target reselection and fallback selection', () => {
  const dragTarget = { id: 'node-1' };
  const selectionStates = [
    { selection: [], canTransform: false },
    { selection: [], canTransform: false },
    { selection: [dragTarget], canTransform: true }
  ];
  const selectedCalls = [];

  assert.deepEqual(transformState.resolveStudioTransformPointerSelectionState({
    dragTarget,
    getSelectionState() {
      return selectionStates.shift();
    },
    selectElement(target, options) {
      selectedCalls.push({ target, options });
    }
  }), {
    selectionState: { selection: [dragTarget], canTransform: true },
    pointerSelectionPlan: {
      hasTransformTarget: true,
      shouldSelectTarget: false,
      selectOptions: {
        additive: false,
        toggle: false
      },
      shouldFallbackSelectTarget: false
    },
    didSelectTarget: true,
    didFallbackSelectTarget: true
  });
  assert.deepEqual(selectedCalls, [
    { target: dragTarget, options: { additive: false, toggle: false } },
    { target: dragTarget, options: undefined }
  ]);

  assert.deepEqual(transformState.resolveStudioTransformPointerSelectionState({
    getSelectionState() {
      return { selection: [], canTransform: false };
    }
  }), {
    selectionState: { selection: [], canTransform: false },
    pointerSelectionPlan: {
      hasTransformTarget: false,
      shouldSelectTarget: false,
      selectOptions: {
        additive: false,
        toggle: false
      },
      shouldFallbackSelectTarget: false
    },
    didSelectTarget: false,
    didFallbackSelectTarget: false
  });
});

test('shouldHandleStudioTransformPointerEvent only accepts events for the active transform pointer', () => {
  assert.equal(transformState.shouldHandleStudioTransformPointerEvent({
    pointerId: 7
  }, {
    pointerId: 7
  }), true);

  assert.equal(transformState.shouldHandleStudioTransformPointerEvent({
    pointerId: 7
  }, {
    pointerId: 8
  }), false);

  assert.equal(transformState.shouldHandleStudioTransformPointerEvent(null, {
    pointerId: 7
  }), false);
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

test('buildStudioTransformSizingLockState preserves flow layout sizing constraints only when needed', () => {
  const absoluteImage = {
    tagName: 'IMG',
    position: 'absolute',
    style: { width: '', height: '' },
    ownerDocument: {
      defaultView: {
        getComputedStyle(element) {
          return { position: element.position };
        }
      }
    }
  };
  assert.deepEqual(transformState.buildStudioTransformSizingLockState(absoluteImage), {
    isPrePositioned: true,
    lockWidth: false,
    lockHeight: false
  });

  const flowTable = {
    tagName: 'TABLE',
    position: 'relative',
    style: { width: '', height: '' },
    ownerDocument: {
      defaultView: {
        getComputedStyle(element) {
          return { position: element.position };
        }
      }
    }
  };
  assert.deepEqual(transformState.buildStudioTransformSizingLockState(flowTable), {
    isPrePositioned: false,
    lockWidth: true,
    lockHeight: true
  });

  const flowText = {
    tagName: 'DIV',
    position: 'relative',
    style: { width: '320px', height: '' },
    ownerDocument: {
      defaultView: {
        getComputedStyle(element) {
          return { position: element.position };
        }
      }
    }
  };
  assert.deepEqual(transformState.buildStudioTransformSizingLockState(flowText), {
    isPrePositioned: false,
    lockWidth: false,
    lockHeight: false
  });
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

test('buildStudioTransformInteractionBounds derives raw drag and resize bounds from session state', () => {
  assert.deepEqual(transformState.buildStudioTransformInteractionBounds({
    type: 'drag',
    startBounds: {
      left: 100,
      top: 80,
      right: 220,
      bottom: 170,
      width: 120,
      height: 90
    },
    grabOffset: {
      x: 15,
      y: 10
    }
  }, {
    pointer: {
      x: 190,
      y: 160
    }
  }), {
    left: 175,
    top: 150,
    right: 295,
    bottom: 240
  });

  assert.deepEqual(transformState.buildStudioTransformInteractionBounds({
    type: 'resize',
    handleDir: 'nw',
    startBounds: {
      left: 100,
      top: 80,
      right: 220,
      bottom: 170
    }
  }, {
    dx: -20,
    dy: 15
  }), {
    left: 80,
    top: 95,
    right: 220,
    bottom: 170
  });
});

test('resolveStudioTransformBounds applies the shared interaction and normalization pipeline', () => {
  assert.deepEqual(transformState.resolveStudioTransformBounds({
    type: 'drag',
    slideBounds: {
      width: 200,
      height: 120
    },
    startBounds: {
      left: 100,
      top: 80,
      right: 400,
      bottom: 320,
      width: 300,
      height: 240
    },
    grabOffset: {
      x: 40,
      y: 30
    }
  }, {
    pointer: {
      x: 0,
      y: 0
    },
    minSizePx: 20,
    dragOverflowMarginPx: 16
  }), {
    left: -16,
    top: -16,
    right: 284,
    bottom: 224,
    width: 300,
    height: 240
  });

  assert.deepEqual(transformState.resolveStudioTransformBounds({
    type: 'resize',
    handleDir: 'nw',
    slideBounds: {
      width: 200,
      height: 120
    },
    startBounds: {
      left: 180,
      top: 90,
      right: 185,
      bottom: 95
    }
  }, {
    dx: 0,
    dy: 0,
    minSizePx: 20,
    dragOverflowMarginPx: 16
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

test('materializeStudioTransformSession applies absolute positioning state only once', () => {
  const element = {
    style: {},
    classList: createClassList()
  };
  const overlay = {
    classList: createClassList()
  };
  const session = {
    materialized: false,
    items: [{
      element,
      startAbsLeft: 140,
      startAbsTop: 120,
      startWidth: 180,
      startHeight: 90,
      parentOffsetLeft: 40,
      parentOffsetTop: 20,
      lockWidth: true,
      lockHeight: false
    }],
    overlay
  };

  assert.deepEqual(transformState.materializeStudioTransformSession(session), {
    didMaterialize: true,
    session
  });
  assert.equal(element.style.position, 'absolute');
  assert.equal(element.style.margin, '0');
  assert.equal(element.style.width, '180px');
  assert.equal(element.style.height, undefined);
  assert.equal(element.style.left, '100px');
  assert.equal(element.style.top, '100px');
  assert.equal(element.classList.contains('editor-dragging'), true);
  assert.equal(overlay.classList.contains('drag-preview'), true);
  assert.equal(session.materialized, true);

  assert.deepEqual(transformState.materializeStudioTransformSession(session), {
    didMaterialize: false,
    session
  });
});

test('captureStudioTransformSessionPointer captures the active pointer when available', () => {
  let capturedPointerId = null;
  const session = {
    pointerId: 9,
    captureTarget: {
      setPointerCapture(pointerId) {
        capturedPointerId = pointerId;
      }
    }
  };

  assert.deepEqual(transformState.captureStudioTransformSessionPointer(session), {
    didCapture: true,
    session
  });
  assert.equal(capturedPointerId, 9);

  const failedCaptureSession = {
    pointerId: 5,
    captureTarget: {
      setPointerCapture() {
        throw new Error('capture failed');
      }
    }
  };

  assert.deepEqual(transformState.captureStudioTransformSessionPointer(failedCaptureSession), {
    didCapture: false,
    session: failedCaptureSession
  });

  assert.deepEqual(transformState.captureStudioTransformSessionPointer(null), {
    didCapture: false,
    session: null
  });
});

test('progressStudioTransformSession applies drag threshold gating before continuing transforms', () => {
  const element = {
    style: {},
    classList: createClassList()
  };
  const overlay = {
    classList: createClassList()
  };
  const session = {
    materialized: false,
    moved: false,
    items: [{
      element,
      startAbsLeft: 140,
      startAbsTop: 120,
      startWidth: 180,
      startHeight: 90,
      parentOffsetLeft: 40,
      parentOffsetTop: 20,
      lockWidth: false,
      lockHeight: false
    }],
    overlay
  };

  assert.deepEqual(transformState.progressStudioTransformSession(session, {
    moveDistanceScreen: 4,
    dragStartThresholdPx: 5
  }), {
    didMaterialize: false,
    isActive: false,
    didMove: false,
    session
  });
  assert.equal(session.materialized, false);
  assert.equal(session.moved, false);

  assert.deepEqual(transformState.progressStudioTransformSession(session, {
    moveDistanceScreen: 5,
    dragStartThresholdPx: 5
  }), {
    didMaterialize: true,
    isActive: true,
    didMove: true,
    session
  });
  assert.equal(session.materialized, true);
  assert.equal(session.moved, true);
  assert.equal(element.classList.contains('editor-dragging'), true);
  assert.equal(overlay.classList.contains('drag-preview'), true);

  assert.deepEqual(transformState.progressStudioTransformSession(null), {
    didMaterialize: false,
    isActive: false,
    didMove: false,
    session: null
  });
});

test('cleanupStudioTransformSession releases pointer capture and clears drag state', () => {
  const element = {
    style: {},
    classList: createClassList()
  };
  const overlay = {
    classList: createClassList()
  };
  element.classList.add('editor-dragging');
  overlay.classList.add('drag-preview');
  let releasedPointerId = null;
  const session = {
    pointerId: 7,
    materialized: true,
    captureTarget: {
      hasPointerCapture(pointerId) {
        return pointerId === 7;
      },
      releasePointerCapture(pointerId) {
        releasedPointerId = pointerId;
      }
    },
    items: [{
      element
    }],
    overlay
  };

  assert.deepEqual(transformState.cleanupStudioTransformSession(session), {
    didCleanup: true,
    didReleasePointerCapture: true,
    session
  });
  assert.equal(releasedPointerId, 7);
  assert.equal(element.classList.contains('editor-dragging'), false);
  assert.equal(overlay.classList.contains('drag-preview'), false);
  assert.equal(session.materialized, false);
});

test('cleanupStudioTransformSession tolerates missing capture state and null sessions', () => {
  const session = {
    pointerId: 3,
    materialized: true,
    captureTarget: {
      hasPointerCapture() {
        return false;
      },
      releasePointerCapture() {
        throw new Error('should not release');
      }
    },
    items: [],
    overlay: null
  };

  assert.deepEqual(transformState.cleanupStudioTransformSession(session), {
    didCleanup: true,
    didReleasePointerCapture: false,
    session
  });
  assert.equal(session.materialized, false);

  assert.deepEqual(transformState.cleanupStudioTransformSession(null), {
    didCleanup: false,
    didReleasePointerCapture: false,
    session: null
  });
});

test('finalizeStudioTransformSession reports move state while delegating cleanup', () => {
  const element = {
    style: {},
    classList: createClassList()
  };
  const overlay = {
    classList: createClassList()
  };
  element.classList.add('editor-dragging');
  overlay.classList.add('drag-preview');

  const session = {
    moved: true,
    pointerId: 11,
    materialized: true,
    captureTarget: {
      hasPointerCapture(pointerId) {
        return pointerId === 11;
      },
      releasePointerCapture() {}
    },
    items: [{ element }],
    overlay
  };

  assert.deepEqual(transformState.finalizeStudioTransformSession(session), {
    didFinalize: true,
    didMove: true,
    didReleasePointerCapture: true,
    session
  });
  assert.equal(session.materialized, false);
  assert.equal(element.classList.contains('editor-dragging'), false);
  assert.equal(overlay.classList.contains('drag-preview'), false);

  assert.deepEqual(transformState.finalizeStudioTransformSession(null), {
    didFinalize: false,
    didMove: false,
    didReleasePointerCapture: false,
    session: null
  });
});

test('buildStudioTransformCompletionPlan only persists moved sessions and centralizes the version label', () => {
  assert.deepEqual(transformState.buildStudioTransformCompletionPlan({
    didMove: true
  }), {
    shouldPersist: true,
    versionLabel: 'Auto: Moved Element'
  });

  assert.deepEqual(transformState.buildStudioTransformCompletionPlan({
    didMove: true
  }, {
    versionLabel: 'Custom Move Label'
  }), {
    shouldPersist: true,
    versionLabel: 'Custom Move Label'
  });

  assert.deepEqual(transformState.buildStudioTransformCompletionPlan({
    didMove: false
  }), {
    shouldPersist: false,
    versionLabel: ''
  });
});

test('buildStudioTransformSessionItem captures transform geometry and sizing locks from an element', () => {
  const parent = {
    getBoundingClientRect() {
      return { left: 20, top: 30, right: 220, bottom: 180 };
    }
  };
  const element = {
    tagName: 'TABLE',
    position: 'relative',
    style: { width: '', height: '' },
    ownerDocument: {
      defaultView: {
        getComputedStyle(node) {
          return { position: node.position };
        }
      }
    },
    getBoundingClientRect() {
      return { left: 60, top: 80, right: 260, bottom: 200 };
    }
  };

  assert.deepEqual(transformState.buildStudioTransformSessionItem(element, {
    slideMetrics: { scaleX: 1, scaleY: 1 },
    getClosestPositionedAncestor: () => parent,
    getRectOnSlide: (rect) => rect
  }), {
    element,
    startAbsLeft: 60,
    startAbsTop: 80,
    startWidth: 200,
    startHeight: 120,
    parentOffsetLeft: 20,
    parentOffsetTop: 30,
    lockWidth: true,
    lockHeight: true
  });

  assert.equal(transformState.buildStudioTransformSessionItem(null), null);
  assert.equal(transformState.buildStudioTransformSessionItem({
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 10, bottom: 10 };
    }
  }), null);
});

test('buildStudioTransformSession normalizes transform session state and grab offsets', () => {
  const items = [{ id: 'node-1' }];
  const overlay = { id: 'overlay' };

  assert.deepEqual(transformState.buildStudioTransformSession({
    type: 'resize',
    handleDir: 'se',
    pointerId: 9,
    captureTarget: { id: 'body' },
    startClientX: 300,
    startClientY: 180,
    startPointer: { x: 140, y: 110 },
    slideMetrics: { scaleX: 1, scaleY: 1 },
    slideBounds: { width: 200, height: 120 },
    startBounds: { left: 100, top: 80, width: 120, height: 90 },
    items,
    overlay
  }), {
    type: 'resize',
    handleDir: 'se',
    pointerId: 9,
    captureTarget: { id: 'body' },
    startClientX: 300,
    startClientY: 180,
    startPointer: { x: 140, y: 110 },
    grabOffset: { x: 40, y: 30 },
    slideMetrics: { scaleX: 1, scaleY: 1 },
    slideBounds: { width: 200, height: 120 },
    startBounds: { left: 100, top: 80, width: 120, height: 90 },
    items,
    moved: false,
    materialized: false,
    overlay
  });

  assert.deepEqual(transformState.buildStudioTransformSession({
    startBounds: {}
  }), {
    type: 'drag',
    handleDir: '',
    pointerId: undefined,
    captureTarget: null,
    startClientX: 0,
    startClientY: 0,
    startPointer: { x: 0, y: 0 },
    grabOffset: { x: 0, y: 0 },
    slideMetrics: null,
    slideBounds: {},
    startBounds: {},
    items: [],
    moved: false,
    materialized: false,
    overlay: null
  });
});

test('startStudioTransformSession builds the session and captures its pointer', () => {
  let capturedPointerId = null;
  const captureTarget = {
    setPointerCapture(pointerId) {
      capturedPointerId = pointerId;
    }
  };

  assert.deepEqual(transformState.startStudioTransformSession({
    type: 'resize',
    handleDir: 'se',
    pointerId: 12,
    captureTarget,
    startClientX: 300,
    startClientY: 180,
    startPointer: { x: 140, y: 110 },
    slideMetrics: { scaleX: 1, scaleY: 1 },
    slideBounds: { width: 200, height: 120 },
    startBounds: { left: 100, top: 80, width: 120, height: 90 },
    items: [],
    overlay: null
  }), {
    session: {
      type: 'resize',
      handleDir: 'se',
      pointerId: 12,
      captureTarget,
      startClientX: 300,
      startClientY: 180,
      startPointer: { x: 140, y: 110 },
      grabOffset: { x: 40, y: 30 },
      slideMetrics: { scaleX: 1, scaleY: 1 },
      slideBounds: { width: 200, height: 120 },
      startBounds: { left: 100, top: 80, width: 120, height: 90 },
      items: [],
      moved: false,
      materialized: false,
      overlay: null
    },
    didCapture: true
  });
  assert.equal(capturedPointerId, 12);
});

test('buildStudioTransformMotionState derives pointer deltas and screen movement from the session start', () => {
  assert.deepEqual(transformState.buildStudioTransformMotionState({
    startPointer: { x: 120, y: 90 },
    startClientX: 400,
    startClientY: 300
  }, {
    pointer: { x: 150, y: 140 },
    clientX: 424,
    clientY: 332
  }), {
    dx: 30,
    dy: 50,
    moveDistanceScreen: 40
  });

  assert.deepEqual(transformState.buildStudioTransformMotionState({}, {}), {
    dx: 0,
    dy: 0,
    moveDistanceScreen: 0
  });
});

test('buildStudioTransformFrameState combines motion, threshold progress, and resolved bounds', () => {
  const inactiveSession = {
    startPointer: { x: 10, y: 20 },
    startClientX: 100,
    startClientY: 200,
    materialized: false,
    moved: false,
    startBounds: { left: 0, top: 0, right: 50, bottom: 40, width: 50, height: 40 },
    grabOffset: { x: 5, y: 4 },
    slideBounds: { width: 200, height: 120 },
    items: []
  };

  assert.deepEqual(transformState.buildStudioTransformFrameState(inactiveSession, {
    pointer: { x: 12, y: 24 },
    clientX: 102,
    clientY: 204,
    dragStartThresholdPx: 10,
    minSizePx: 20,
    dragOverflowMarginPx: 16
  }), {
    isActive: false,
    motionState: {
      dx: 2,
      dy: 4,
      moveDistanceScreen: Math.hypot(2, 4)
    },
    progressResult: {
      didMaterialize: false,
      isActive: false,
      didMove: false,
      session: inactiveSession
    },
    bounds: null,
    session: inactiveSession
  });

  const activeSession = {
    type: 'drag',
    startPointer: { x: 10, y: 20 },
    startClientX: 100,
    startClientY: 200,
    materialized: false,
    moved: false,
    startBounds: { left: 0, top: 0, right: 50, bottom: 40, width: 50, height: 40 },
    grabOffset: { x: 5, y: 4 },
    slideBounds: { width: 200, height: 120 },
    items: []
  };

  assert.deepEqual(transformState.buildStudioTransformFrameState(activeSession, {
    pointer: { x: 60, y: 70 },
    clientX: 112,
    clientY: 216,
    dragStartThresholdPx: 10,
    minSizePx: 20,
    dragOverflowMarginPx: 16
  }), {
    isActive: true,
    motionState: {
      dx: 50,
      dy: 50,
      moveDistanceScreen: 20
    },
    progressResult: {
      didMaterialize: true,
      isActive: true,
      didMove: true,
      session: activeSession
    },
    bounds: {
      left: 55,
      top: 66,
      right: 105,
      bottom: 106,
      width: 50,
      height: 40
    },
    session: activeSession
  });
});

test('buildStudioTransformStartState derives the shared transform bootstrap state', () => {
  const slide = { id: 'slide-1' };
  const selection = [{ id: 'node-1' }, { id: 'node-2' }];

  assert.deepEqual(transformState.buildStudioTransformStartState(selection, {
    slide,
    event: { pointerId: 7 },
    itemOptions: { source: 'test' },
    getSlideMetrics(currentSlide) {
      assert.equal(currentSlide, slide);
      return { logicalWidth: 1280, logicalHeight: 720, scaleX: 2, scaleY: 2 };
    },
    getPointerOnSlide(event, slideMetrics) {
      assert.equal(event.pointerId, 7);
      assert.equal(slideMetrics.logicalWidth, 1280);
      return { x: 100, y: 80 };
    },
    getSelectionBounds(elements, slideMetrics) {
      assert.equal(elements, selection);
      assert.equal(slideMetrics.logicalHeight, 720);
      return { left: 60, top: 40, width: 200, height: 120 };
    },
    buildSessionItem(element, options) {
      assert.equal(options.slideMetrics.logicalWidth, 1280);
      assert.equal(options.source, 'test');
      return { elementId: element.id };
    }
  }), {
    slideMetrics: { logicalWidth: 1280, logicalHeight: 720, scaleX: 2, scaleY: 2 },
    slideBounds: { width: 1280, height: 720 },
    startPointer: { x: 100, y: 80 },
    startBounds: { left: 60, top: 40, width: 200, height: 120 },
    items: [{ elementId: 'node-1' }, { elementId: 'node-2' }]
  });

  assert.equal(transformState.buildStudioTransformStartState(selection, {
    getSlideMetrics() {
      return { logicalWidth: 0, logicalHeight: 0 };
    },
    getPointerOnSlide() {
      return { x: 0, y: 0 };
    },
    getSelectionBounds() {
      return null;
    }
  }), null);
});

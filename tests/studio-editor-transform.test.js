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

test('buildStudioTransformStyleTransaction captures position and size style changes', () => {
  const element = {
    dataset: {},
    style: {
      position: 'absolute',
      margin: '0',
      left: '20px',
      top: '30px',
      width: '120px',
      height: '80px'
    }
  };
  const transactionApi = {
    createStudioStyleTransaction(items) {
      return items;
    }
  };
  const result = transformState.buildStudioTransformStyleTransaction({
    session: {
      items: [{
        element,
        startStyle: {
          position: '',
          margin: '',
          left: '',
          top: '',
          width: '',
          height: ''
        }
      }]
    }
  }, {
    transactionApi,
    assignEditorElementId(target) {
      target.dataset.editorId = 'node-1';
    }
  });

  assert.deepEqual(result, [{
    element,
    before: {
      position: '',
      margin: '',
      left: '',
      top: '',
      width: '',
      height: ''
    },
    after: {
      position: 'absolute',
      margin: '0',
      left: '20px',
      top: '30px',
      width: '120px',
      height: '80px'
    }
  }]);
});

test('buildStudioTransformStyleTransaction returns null without a transaction-ready session', () => {
  assert.equal(transformState.buildStudioTransformStyleTransaction({}, {}), null);
  assert.equal(transformState.buildStudioTransformStyleTransaction({
    session: { items: [] }
  }, {
    transactionApi: {}
  }), null);
});

test('buildStudioTransformCanonicalLayoutUpdates derives absolute positions and resized dimensions', () => {
  const element = {
    dataset: { editorId: 'node-1' },
    style: {
      left: '120px',
      top: '80px',
      width: '240px',
      height: '120px'
    }
  };

  assert.deepEqual(transformState.buildStudioTransformCanonicalLayoutUpdates({
    session: {
      items: [{
        element,
        parentOffsetLeft: 20,
        parentOffsetTop: 10,
        isPrePositioned: true
      }]
    }
  }), [{
    id: 'node-1',
    layout: {
      mode: 'absolute',
      x: 140,
      y: 90,
      width: 240,
      height: 120
    }
  }]);
});

test('createStudioTransformSessionFinalizer closes the session before persisting a move', () => {
  const calls = [];
  const transaction = { type: 'style' };
  const finalizeSession = transformState.createStudioTransformSessionFinalizer({
    onSessionEnd() {
      calls.push('end');
    },
    buildTransaction() {
      calls.push('transaction');
      return transaction;
    },
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    }
  });

  finalizeSession({ id: 'move' }, {
    shouldPersist: true,
    versionLabel: 'Auto: Moved Element'
  });

  assert.deepEqual(calls, [
    'end',
    'transaction',
    ['history', false, transaction],
    'save',
    ['version', 'Auto: Moved Element']
  ]);
});

test('createStudioTransformSessionFinalizer stops persistence hooks when history capture fails', () => {
  const calls = [];
  const finalizeSession = transformState.createStudioTransformSessionFinalizer({
    onSessionEnd() {
      calls.push('end');
    },
    buildTransaction() {
      calls.push('transaction');
      return { type: 'style' };
    },
    saveHistoryState() {
      calls.push('history');
      return { didCapture: false };
    },
    onHistoryFailure() {
      calls.push('rollback');
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion() {
      calls.push('version');
    }
  });

  assert.equal(finalizeSession({ id: 'move' }, {
    shouldPersist: true,
    versionLabel: 'Auto: Moved Element'
  }), false);
  assert.deepEqual(calls, ['end', 'transaction', 'history', 'rollback']);
});

test('createStudioTransformSessionFinalizer rolls back when history capture throws', () => {
  const calls = [];
  const finalizeSession = transformState.createStudioTransformSessionFinalizer({
    buildTransaction() {
      calls.push('transaction');
      return { type: 'style' };
    },
    saveHistoryState() {
      calls.push('history');
      throw new Error('history unavailable');
    },
    onHistoryFailure() {
      calls.push('rollback');
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion() {
      calls.push('version');
    }
  });

  assert.equal(finalizeSession({ id: 'move' }, { shouldPersist: true }), false);
  assert.deepEqual(calls, ['transaction', 'history', 'rollback']);
});

test('createStudioTransformSessionFinalizer forwards an optional canonical deck sidecar', () => {
  const calls = [];
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const finalizeSession = transformState.createStudioTransformSessionFinalizer({
    buildTransaction() {
      return { type: 'style' };
    },
    buildCanonicalDeck() {
      return canonicalDeck;
    },
    saveHistoryState(...args) {
      calls.push(args);
    }
  });

  finalizeSession({ id: 'move' }, { shouldPersist: true, versionLabel: 'Auto: Moved Element' });

  assert.deepEqual(calls, [[false, { type: 'style' }, canonicalDeck]]);
});

test('createStudioTransformSessionFinalizer preserves transaction history when canonical sidecar construction throws', () => {
  const calls = [];
  const transaction = { type: 'style' };
  const finalizeSession = transformState.createStudioTransformSessionFinalizer({
    buildTransaction() {
      return transaction;
    },
    buildCanonicalDeck() {
      throw new Error('canonical transform unavailable');
    },
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    }
  });

  assert.doesNotThrow(() => finalizeSession({ id: 'move' }, {
    shouldPersist: true,
    versionLabel: 'Auto: Moved Element'
  }));
  assert.deepEqual(calls, [
    ['history', false, transaction],
    'save',
    ['version', 'Auto: Moved Element']
  ]);
});

test('createStudioTransformSessionFinalizer can fail closed when canonical state is required', () => {
  const calls = [];
  const transaction = { type: 'style' };
  const finalizeSession = transformState.createStudioTransformSessionFinalizer({
    buildTransaction() {
      return transaction;
    },
    buildCanonicalDeck() {
      return null;
    },
    requireCanonicalDeck() {
      return true;
    },
    onCanonicalFailure(details) {
      calls.push(['failure', details.transaction]);
    },
    saveHistoryState() {
      calls.push('history');
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion() {
      calls.push('version');
    }
  });

  finalizeSession({ id: 'move' }, { shouldPersist: true });

  assert.deepEqual(calls, [['failure', transaction]]);
});

test('attachStudioTransformPointerHandlers binds the shared pointer lifecycle', () => {
  const documentListeners = new Map();
  const bodyListeners = new Map();
  const windowListeners = new Map();
  const doc = {
    addEventListener(type, handler, capture) {
      documentListeners.set(type, { handler, capture });
    },
    body: {
      addEventListener(type, handler, capture) {
        bodyListeners.set(type, { handler, capture });
      }
    },
    defaultView: {
      addEventListener(type, handler, capture) {
        windowListeners.set(type, { handler, capture });
      }
    }
  };
  const handlers = {
    handlePointerDown() {},
    handlePointerMove() {},
    handlePointerUp() {},
    handlePointerCancel() {},
    handleWindowBlur() {}
  };

  assert.equal(transformState.attachStudioTransformPointerHandlers(doc, handlers), true);
  assert.equal(documentListeners.get('dragstart').capture, true);
  assert.equal(bodyListeners.get('pointerdown').handler, handlers.handlePointerDown);
  assert.equal(bodyListeners.get('pointermove').handler, handlers.handlePointerMove);
  assert.equal(bodyListeners.get('pointerup').handler, handlers.handlePointerUp);
  assert.equal(bodyListeners.get('pointercancel').handler, handlers.handlePointerCancel);
  assert.equal(bodyListeners.get('lostpointercapture').handler, handlers.handlePointerCancel);
  assert.deepEqual(windowListeners.get('blur'), {
    handler: handlers.handleWindowBlur,
    capture: true
  });
});

test('attachStudioTransformPointerHandlers tolerates missing editor frame targets', () => {
  assert.equal(transformState.attachStudioTransformPointerHandlers(null, {}), false);
  assert.equal(transformState.attachStudioTransformPointerHandlers({ body: {} }, {}), false);
});

test('createStudioTransformFallbackPointerHandlers coordinates the legacy pointer lifecycle', () => {
  const calls = [];
  let activeSession = null;
  const session = { pointerId: 7, slideMetrics: { logicalWidth: 1920 } };
  const handlers = transformState.createStudioTransformFallbackPointerHandlers({
    getActiveSlide() {
      calls.push('getActiveSlide');
      return { id: 'slide-1' };
    },
    resolveTransformSessionStart(options) {
      calls.push(['resolveStart', options.slide]);
      return {
        session,
        startBounds: { left: 10, top: 20 }
      };
    },
    shouldHandlePointerEvent(nextSession, event) {
      return nextSession === activeSession && event.pointerId === 7;
    },
    getPointerOnSlide() {
      return { x: 30, y: 40 };
    },
    buildTransformFrameState(nextSession, options) {
      calls.push(['frame', nextSession, options]);
      return { isActive: true, bounds: { left: 12, top: 22 } };
    },
    applyTransformBounds(nextSession, bounds) {
      calls.push(['apply', nextSession, bounds]);
    },
    finalizeTransformSession(nextSession) {
      calls.push(['finalize', nextSession]);
      return { id: 'finalize-result' };
    },
    buildCompletionPlan(result) {
      calls.push(['completion', result]);
      return { shouldPersist: true, versionLabel: 'Auto: Moved Element' };
    },
    getGridSizePx() {
      return 20;
    },
    snapDistancePx: 9,
    onSessionStart(bounds) {
      calls.push(['start', bounds]);
    },
    onSessionFrame(bounds) {
      calls.push(['session-frame', bounds]);
    },
    onSessionFinalize(result, completionPlan) {
      calls.push(['session-finalize', result, completionPlan]);
    }
  });

  assert.equal(handlers.handlePointerDown({ pointerId: 7 }), true);
  activeSession = session;
  assert.equal(handlers.handlePointerMove({
    pointerId: 7,
    clientX: 30,
    clientY: 40,
    shiftKey: true
  }), true);
  assert.equal(handlers.handlePointerUp({ pointerId: 7 }), true);
  assert.deepEqual(calls, [
    'getActiveSlide',
    ['resolveStart', { id: 'slide-1' }],
    ['start', { left: 10, top: 20 }],
    ['frame', session, {
      pointer: { x: 30, y: 40 },
      clientX: 30,
      clientY: 40,
      dragStartThresholdPx: 4,
      minSizePx: 0,
      dragOverflowMarginPx: 0,
      snapDistancePx: 9,
      gridSizePx: 20,
      lockAspectRatio: true
    }],
    ['apply', session, { left: 12, top: 22 }],
    ['session-frame', { left: 12, top: 22 }],
    ['finalize', session],
    ['completion', { id: 'finalize-result' }],
    ['session-finalize', { id: 'finalize-result' }, {
      shouldPersist: true,
      versionLabel: 'Auto: Moved Element'
    }]
  ]);
  assert.equal(handlers.getSession(), null);
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

test('buildStudioTransformSelectionState excludes hidden elements from transform eligibility', () => {
  const visible = { id: 'visible', isConnected: true };
  const hidden = { id: 'hidden', isConnected: true };

  assert.deepEqual(transformState.buildStudioTransformSelectionState([visible, hidden], {
    isHidden: (element) => element === hidden,
    isLocked: () => false,
    isFreeformPositioned: () => true
  }), {
    selection: [visible],
    canTransform: true
  });
});

test('getStudioSlideMetrics, getStudioRectOnSlide, and getStudioPointerOnSlide convert browser geometry into slide coordinates', () => {
  const metrics = transformState.getStudioSlideMetrics({
    clientWidth: 1920,
    clientHeight: 1080,
    getBoundingClientRect() {
      return { left: 100, top: 200, width: 960, height: 540 };
    }
  });

  assert.deepEqual(metrics, {
    rect: { left: 100, top: 200, width: 960, height: 540 },
    logicalWidth: 1920,
    logicalHeight: 1080,
    scaleX: 2,
    scaleY: 2
  });

  assert.deepEqual(transformState.getStudioRectOnSlide({
    left: 140,
    top: 230,
    right: 340,
    bottom: 430
  }, metrics), {
    left: 80,
    top: 60,
    right: 480,
    bottom: 460
  });

  assert.deepEqual(transformState.getStudioPointerOnSlide({
    clientX: 150,
    clientY: 250
  }, metrics), {
    x: 100,
    y: 100
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

test('buildStudioTransformPointerStartIntent resolves transform start targets only for primary pointer presses', () => {
  const handleNode = { id: 'handle' };
  const overlayNode = { id: 'overlay' };
  const target = {
    closest(selector) {
      if (selector === '.editor-resize-handle') return handleNode;
      if (selector === '#editorSelectionOverlay') return overlayNode;
      return null;
    }
  };
  const dragTarget = { id: 'node-1' };

  assert.deepEqual(transformState.buildStudioTransformPointerStartIntent({
    button: 0,
    isPrimary: true,
    target
  }, {
    resolveEditableTarget() {
      return dragTarget;
    }
  }), {
    canStart: true,
    handle: handleNode,
    overlay: overlayNode,
    dragTarget
  });

  assert.deepEqual(transformState.buildStudioTransformPointerStartIntent({
    button: 1,
    isPrimary: true,
    target: null
  }), {
    canStart: false,
    handle: null,
    overlay: null,
    dragTarget: null
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

test('buildStudioTransformSizingLockState prefers canonical freeform state over computed CSS', () => {
  const element = {
    tagName: 'DIV',
    style: { width: '', height: '' },
    ownerDocument: {
      defaultView: {
        getComputedStyle() {
          return { position: 'absolute' };
        }
      }
    }
  };

  assert.deepEqual(transformState.buildStudioTransformSizingLockState(element, {
    isFreeformPositioned: () => false
  }), {
    isPrePositioned: false,
    lockWidth: true,
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

test('normalizeStudioTransformBounds rejects invalid non-negative constraints', () => {
  assert.deepEqual(transformState.normalizeStudioTransformBounds({
    left: -20,
    top: -20,
    right: 80,
    bottom: 80
  }, {
    width: 100,
    height: 100
  }, {
    mode: 'drag',
    dragOverflowMarginPx: -10
  }), {
    left: 0,
    top: 0,
    right: 100,
    bottom: 100,
    width: 100,
    height: 100
  });

  const resizeElement = { tagName: 'DIV', style: {} };
  transformState.applyStudioTransformBounds({
    type: 'resize',
    startBounds: { left: 0, top: 0, width: 100, height: 50 },
    items: [{
      element: resizeElement,
      startAbsLeft: 0,
      startAbsTop: 0,
      startWidth: 0,
      startHeight: 0
    }]
  }, {
    left: 0,
    top: 0,
    width: 100,
    height: 50
  }, {
    minSizePx: Number.NaN
  });
  assert.equal(resizeElement.style.width, '0px');
  assert.equal(resizeElement.style.height, '0px');
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

test('buildStudioTransformInteractionBounds preserves aspect ratio for locked resize sessions', () => {
  assert.deepEqual(transformState.buildStudioTransformInteractionBounds({
    type: 'resize',
    handleDir: 'se',
    lockAspectRatio: true,
    startBounds: {
      left: 100,
      top: 100,
      right: 200,
      bottom: 150,
      width: 100,
      height: 50
    }
  }, {
    dx: 50,
    dy: 0,
    minSizePx: 24
  }), {
    left: 100,
    top: 100,
    right: 250,
    bottom: 175
  });

  assert.deepEqual(transformState.buildStudioTransformInteractionBounds({
    type: 'resize',
    handleDir: 'e',
    lockAspectRatio: true,
    startBounds: {
      left: 100,
      top: 100,
      right: 200,
      bottom: 150,
      width: 100,
      height: 50
    }
  }, {
    dx: 50,
    dy: 0,
    minSizePx: 24
  }), {
    left: 100,
    top: 87.5,
    right: 250,
    bottom: 162.5
  });
});

test('snapStudioTransformBounds aligns dragged bounds to slide edges and centers', () => {
  const result = transformState.snapStudioTransformBounds({
    left: 49,
    top: 38,
    right: 149,
    bottom: 88
  }, {
    type: 'drag',
    slideBounds: { width: 200, height: 120 }
  }, {
    snapDistancePx: 5
  });

  assert.deepEqual(result, {
    bounds: {
      left: 50,
      top: 35,
      right: 150,
      bottom: 85
    },
    guides: [
      { axis: 'x', position: 100 },
      { axis: 'y', position: 60 }
    ]
  });

  let emittedGuides = null;
  transformState.resolveStudioTransformBounds({
    type: 'drag',
    slideBounds: { width: 200, height: 120 },
    startBounds: {
      left: 49,
      top: 35,
      right: 149,
      bottom: 85,
      width: 100,
      height: 50
    },
    grabOffset: { x: 0, y: 0 }
  }, {
    pointer: { x: 49, y: 35 },
    snapDistancePx: 5,
    onGuides(guides) {
      emittedGuides = guides;
    }
  });
  assert.deepEqual(emittedGuides, [
    { axis: 'x', position: 100 },
    { axis: 'y', position: 60 }
  ]);

  assert.deepEqual(transformState.snapStudioTransformBounds({
    left: 20,
    top: 20,
    right: 70,
    bottom: 70
  }, {
    type: 'resize',
    slideBounds: { width: 200, height: 120 }
  }), {
    bounds: {
      left: 20,
      top: 20,
      right: 70,
      bottom: 70
    },
    guides: []
  });
});

test('snapStudioTransformBounds uses the shared interaction threshold when no override is supplied', () => {
  assert.deepEqual(transformState.snapStudioTransformBounds({
    left: 10,
    top: 10,
    right: 60,
    bottom: 60
  }, {
    type: 'drag',
    slideBounds: { width: 200, height: 120 }
  }), {
    bounds: {
      left: 0,
      top: 0,
      right: 50,
      bottom: 50
    },
    guides: [
      { axis: 'x', position: 0 },
      { axis: 'y', position: 0 }
    ]
  });
});

test('snapStudioTransformBounds optionally aligns dragged top-left bounds to a grid', () => {
  assert.deepEqual(transformState.snapStudioTransformBounds({
    left: 23,
    top: 37,
    right: 123,
    bottom: 87
  }, {
    type: 'drag',
    slideBounds: { width: 500, height: 400 }
  }, {
    snapDistancePx: 5,
    gridSizePx: 20
  }), {
    bounds: {
      left: 20,
      top: 40,
      right: 120,
      bottom: 90
    },
    guides: [
      { axis: 'x', position: 20, kind: 'grid' },
      { axis: 'y', position: 40, kind: 'grid' }
    ]
  });

  assert.deepEqual(transformState.snapStudioTransformBounds({
    left: 23,
    top: 37,
    right: 123,
    bottom: 87
  }, {
    type: 'drag',
    slideBounds: { width: 500, height: 400 }
  }, {
    snapDistancePx: 5
  }).bounds, {
    left: 23,
    top: 37,
    right: 123,
    bottom: 87
  });

  assert.deepEqual(transformState.snapStudioTransformBounds({
    left: 49,
    top: 36,
    right: 149,
    bottom: 86
  }, {
    type: 'drag',
    slideBounds: { width: 500, height: 400 }
  }, {
    snapDistancePx: -1,
    snapTargets: [{ left: 50, top: 40, right: 150, bottom: 90 }]
  }).bounds, {
    left: 50,
    top: 40,
    right: 150,
    bottom: 90
  });
});

test('snapStudioTransformBounds aligns dragged bounds to neighboring element guides', () => {
  assert.deepEqual(transformState.snapStudioTransformBounds({
    left: 97,
    top: 48,
    right: 147,
    bottom: 98
  }, {
    type: 'drag',
    slideBounds: { width: 500, height: 400 },
    snapTargets: [{ left: 150, top: 100, right: 250, bottom: 200 }]
  }, {
    snapDistancePx: 5
  }), {
    bounds: {
      left: 100,
      top: 50,
      right: 150,
      bottom: 100
    },
    guides: [
      { axis: 'x', position: 150, kind: 'guide' },
      { axis: 'y', position: 100, kind: 'guide' }
    ]
  });
});

test('buildStudioTransformSnapTargets excludes selected and hidden elements and normalizes bounds', () => {
  const selectedElement = {
    getBoundingClientRect() {
      throw new Error('selected elements should not be measured');
    }
  };
  const hiddenElement = {
    getBoundingClientRect() {
      throw new Error('hidden elements should not be measured');
    }
  };
  const visibleElement = {
    getBoundingClientRect() {
      return { left: 25, top: 35, right: 125, bottom: 95 };
    }
  };

  assert.deepEqual(transformState.buildStudioTransformSnapTargets('slide', [selectedElement], {
    slideMetrics: { scaleX: 2, scaleY: 2 },
    getSlideEditableElements() {
      return [selectedElement, hiddenElement, visibleElement];
    },
    isHidden(element) {
      return element === hiddenElement;
    },
    getRectOnSlide(rect, slideMetrics) {
      return {
        left: rect.left * slideMetrics.scaleX,
        top: rect.top * slideMetrics.scaleY,
        right: rect.right * slideMetrics.scaleX,
        bottom: rect.bottom * slideMetrics.scaleY
      };
    }
  }), [{ left: 50, top: 70, right: 250, bottom: 190 }]);
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

test('resolveStudioTransformBounds preserves locked resize ratios when slide edges constrain the result', () => {
  assert.deepEqual(transformState.resolveStudioTransformBounds({
    type: 'resize',
    handleDir: 'se',
    slideBounds: {
      width: 200,
      height: 120
    },
    startBounds: {
      left: 100,
      top: 50,
      right: 180,
      bottom: 90,
      width: 80,
      height: 40
    }
  }, {
    dx: 100,
    dy: 100,
    minSizePx: 8,
    lockAspectRatio: true
  }), {
    left: 100,
    top: 50,
    right: 200,
    bottom: 100,
    width: 100,
    height: 50
  });

  assert.deepEqual(transformState.resolveStudioTransformBounds({
    type: 'resize',
    handleDir: 'e',
    slideBounds: {
      width: 200,
      height: 120
    },
    startBounds: {
      left: 100,
      top: 50,
      right: 180,
      bottom: 90,
      width: 80,
      height: 40
    }
  }, {
    dx: 100,
    dy: 100,
    minSizePx: 8,
    lockAspectRatio: true
  }), {
    left: 100,
    top: 45,
    right: 200,
    bottom: 95,
    width: 100,
    height: 50
  });
});

test('resolveStudioTransformBounds keeps locked ratios when minimum size conflicts with slide bounds', () => {
  const bounds = transformState.resolveStudioTransformBounds({
    type: 'resize',
    handleDir: 'se',
    slideBounds: {
      width: 100,
      height: 100
    },
    startBounds: {
      left: 0,
      top: 0,
      right: 100,
      bottom: 10,
      width: 100,
      height: 10
    }
  }, {
    dx: -90,
    dy: -5,
    minSizePx: 24,
    lockAspectRatio: true
  });

  assert.deepEqual(bounds, {
    left: 0,
    top: 0,
    right: 100,
    bottom: 10,
    width: 100,
    height: 10
  });
  assert.equal(bounds.width / bounds.height, 10);
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
      lockHeight: false,
      isPrePositioned: true
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

test('materializeStudioTransformSession fails closed for normal-flow items', () => {
  const element = {
    style: { position: 'relative' },
    classList: createClassList()
  };
  const session = {
    materialized: false,
    items: [{ element, isPrePositioned: false }]
  };

  assert.deepEqual(transformState.materializeStudioTransformSession(session), {
    didMaterialize: false,
    session
  });
  assert.equal(element.style.position, 'relative');
  assert.equal(session.materialized, false);
});

test('materializeStudioTransformSession fails closed when positioning metadata is missing', () => {
  const element = {
    style: { position: 'relative' },
    classList: createClassList()
  };
  const session = {
    materialized: false,
    items: [{ element }]
  };

  assert.deepEqual(transformState.materializeStudioTransformSession(session), {
    didMaterialize: false,
    session
  });
  assert.equal(element.style.position, 'relative');
  assert.equal(session.materialized, false);
});

test('buildStudioTransformCanonicalLayoutUpdates ignores normal-flow items', () => {
  const element = {
    dataset: { editorId: 'flow-node' },
    style: { left: '120px', top: '80px' }
  };

  assert.deepEqual(transformState.buildStudioTransformCanonicalLayoutUpdates({
    session: {
      items: [{ element, isPrePositioned: false }]
    }
  }), []);
});

test('buildStudioTransformCanonicalLayoutUpdates ignores items without positioning metadata', () => {
  const element = {
    dataset: { editorId: 'unknown-node' },
    style: { left: '120px', top: '80px' }
  };

  assert.deepEqual(transformState.buildStudioTransformCanonicalLayoutUpdates({
    session: {
      items: [{ element }]
    }
  }), []);
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
      lockHeight: false,
      isPrePositioned: true
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

test('normalizeStudioTransformDragStartThreshold provides a safe shared default', () => {
  assert.equal(transformState.DEFAULT_DRAG_START_THRESHOLD_PX, 4);
  assert.equal(transformState.normalizeStudioTransformDragStartThreshold(), 4);
  assert.equal(transformState.normalizeStudioTransformDragStartThreshold(0), 0);
  assert.equal(transformState.normalizeStudioTransformDragStartThreshold(-2), 0);

  const session = { materialized: false, items: [] };
  assert.equal(transformState.progressStudioTransformSession(session, {
    moveDistanceScreen: 3
  }).isActive, false);
  assert.equal(transformState.progressStudioTransformSession(session, {
    moveDistanceScreen: 4
  }).isActive, true);
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

test('buildStudioPositionedLayoutItem captures the shared positioned geometry snapshot', () => {
  const parent = {
    getBoundingClientRect() {
      return { left: 40, top: 55, right: 260, bottom: 215 };
    }
  };
  const element = {
    getBoundingClientRect() {
      return { left: 70, top: 95, right: 190, bottom: 155 };
    }
  };

  assert.deepEqual(transformState.buildStudioPositionedLayoutItem(element, {
    slideMetrics: { scaleX: 2, scaleY: 2, rect: { left: 10, top: 15 } },
    getClosestPositionedAncestor(currentElement) {
      assert.equal(currentElement, element);
      return parent;
    },
    getRectOnSlide(rect, slideMetrics) {
      assert.equal(slideMetrics.scaleX, 2);
      return {
        left: (rect.left - slideMetrics.rect.left) * slideMetrics.scaleX,
        top: (rect.top - slideMetrics.rect.top) * slideMetrics.scaleY,
        right: (rect.right - slideMetrics.rect.left) * slideMetrics.scaleX,
        bottom: (rect.bottom - slideMetrics.rect.top) * slideMetrics.scaleY
      };
    }
  }), {
    element,
    absLeft: 120,
    absTop: 160,
    width: 240,
    height: 120,
    parentLeft: 60,
    parentTop: 80
  });

  assert.equal(transformState.buildStudioPositionedLayoutItem(null), null);
});

test('buildStudioPositionedLayoutItems aborts when any selected element cannot produce a geometry snapshot', () => {
  const first = {
    id: 'first',
    getBoundingClientRect() {
      return { left: 10, top: 20, right: 60, bottom: 50 };
    }
  };
  const second = {
    id: 'second'
  };

  assert.deepEqual(transformState.buildStudioPositionedLayoutItems([first, second], {
    getClosestPositionedAncestor(element) {
      if (element === first) {
        return {
          getBoundingClientRect() {
            return { left: 0, top: 0, right: 100, bottom: 100 };
          }
        };
      }
      return null;
    },
    getRectOnSlide(rect) {
      return rect;
    }
  }), []);
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
    lockHeight: true,
    isPrePositioned: false,
    startStyle: {
      position: '',
      margin: '',
      left: '',
      top: '',
      width: '',
      height: ''
    }
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

test('resolveStudioTransformSessionStart assembles the transform session from shared startup dependencies', () => {
  let capturedPointerId = null;
  const captureTarget = {
    setPointerCapture(pointerId) {
      capturedPointerId = pointerId;
    }
  };
  const handleNode = {
    getAttribute(name) {
      return name === 'data-dir' ? 'se' : '';
    }
  };
  const overlayNode = { id: 'overlay' };
  const dragTarget = { id: 'node-1' };
  const target = {
    closest(selector) {
      if (selector === '.editor-resize-handle') return handleNode;
      return null;
    }
  };

  assert.deepEqual(transformState.resolveStudioTransformSessionStart({
    slide: { id: 'slide-1' },
    event: {
      button: 0,
      isPrimary: true,
      pointerId: 9,
      clientX: 300,
      clientY: 180,
      target
    },
    getSelectionState() {
      return {
        selection: [dragTarget],
        canTransform: true
      };
    },
    selectElement() {},
    resolveEditableTarget() {
      return dragTarget;
    },
    getSlideMetrics() {
      return { logicalWidth: 1280, logicalHeight: 720, scaleX: 1, scaleY: 1 };
    },
    getPointerOnSlide() {
      return { x: 140, y: 110 };
    },
    getSelectionBounds() {
      return { left: 100, top: 80, width: 120, height: 90 };
    },
    getSnapTargets() {
      return [{ left: 240, top: 180, right: 360, bottom: 270 }];
    },
    buildSessionItem(element) {
      return { elementId: element.id };
    },
    ensureOverlay() {
      return overlayNode;
    },
    captureTarget
  }), {
    session: {
      type: 'resize',
      handleDir: 'se',
      pointerId: 9,
      captureTarget,
      startClientX: 300,
      startClientY: 180,
      startPointer: { x: 140, y: 110 },
      grabOffset: { x: 40, y: 30 },
      slideMetrics: { logicalWidth: 1280, logicalHeight: 720, scaleX: 1, scaleY: 1 },
      slideBounds: { width: 1280, height: 720 },
      startBounds: { left: 100, top: 80, width: 120, height: 90 },
      items: [{ elementId: 'node-1' }],
      snapTargets: [{ left: 240, top: 180, right: 360, bottom: 270 }],
      moved: false,
      materialized: false,
      overlay: overlayNode
    },
    startBounds: { left: 100, top: 80, width: 120, height: 90 },
    didCapture: true
  });
  assert.equal(capturedPointerId, 9);

  assert.equal(transformState.resolveStudioTransformSessionStart({
    slide: null,
    event: {
      button: 0,
      isPrimary: true,
      target: null
    }
  }), null);
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

test('createStudioTransformPointerHandlers coordinates the shared pointer lifecycle', () => {
  const calls = [];
  const session = { pointerId: 7, slideMetrics: { scaleX: 1, scaleY: 1 } };
  const startBounds = { left: 1, top: 2, width: 30, height: 40 };
  const bounds = { left: 4, top: 5, width: 30, height: 40 };
  const transformHandlers = transformState.createStudioTransformPointerHandlers({
    getActiveSlide() {
      return { id: 'slide-1' };
    },
    resolveTransformSessionStart(options) {
      calls.push(['start', options.captureTarget]);
      return { session, startBounds };
    },
    shouldHandlePointerEvent(nextSession, event) {
      return nextSession === session && event.pointerId === 7;
    },
    buildTransformFrameState(nextSession, options) {
      calls.push([
        'frame',
        nextSession,
        options.clientX,
        options.clientY,
        options.lockAspectRatio,
        options.gridSizePx,
        options.snapDistancePx
      ]);
      return { isActive: true, bounds };
    },
    applyTransformBounds(nextSession, nextBounds, options) {
      calls.push(['apply', nextSession, nextBounds, options.minSizePx]);
    },
    finalizeTransformSession(nextSession) {
      calls.push(['finalize', nextSession]);
      return { didMove: true };
    },
    buildCompletionPlan(finalizeResult) {
      calls.push(['completion', finalizeResult]);
      return { shouldPersist: true, versionLabel: 'Auto: Moved Element' };
    },
    captureTarget: { id: 'body' },
    minSizePx: 12,
    snapDistancePx: 9,
    getGridSizePx() {
      return 20;
    },
    onSessionStart(nextBounds) {
      calls.push(['session-start', nextBounds]);
    },
    onSessionFrame(nextBounds) {
      calls.push(['session-frame', nextBounds]);
    },
    onSessionFinalize(finalizeResult, completionPlan) {
      calls.push(['session-finalize', finalizeResult, completionPlan]);
    }
  });

  const downEvent = {
    pointerId: 7,
    preventDefault() {
      calls.push(['down-prevented']);
    },
    stopPropagation() {
      calls.push(['down-stopped']);
    }
  };
  assert.equal(transformHandlers.handlePointerDown(downEvent), true);
  assert.equal(transformHandlers.getSession(), session);
  assert.equal(transformHandlers.handlePointerMove({
    pointerId: 7,
    clientX: 40,
    clientY: 50,
    shiftKey: true,
    preventDefault() {
      calls.push(['move-prevented']);
    }
  }), true);
  assert.equal(transformHandlers.handlePointerUp({ pointerId: 7 }), true);
  assert.equal(transformHandlers.getSession(), null);
  assert.equal(transformHandlers.handlePointerUp({ pointerId: 8 }), false);

  assert.deepEqual(calls, [
    ['start', { id: 'body' }],
    ['session-start', startBounds],
    ['down-prevented'],
    ['down-stopped'],
    ['frame', session, 40, 50, true, 20, 9],
    ['apply', session, bounds, 12],
    ['session-frame', bounds],
    ['move-prevented'],
    ['finalize', session],
    ['completion', { didMove: true }],
    ['session-finalize', { didMove: true }, {
      shouldPersist: true,
      versionLabel: 'Auto: Moved Element'
    }]
  ]);
});

test('transform handlers reject concurrent pointer starts without replacing the active session', () => {
  [
    transformState.createStudioTransformPointerHandlers,
    transformState.createStudioTransformFallbackPointerHandlers
  ].forEach((createHandlers) => {
    const activeSession = { pointerId: 7 };
    let startCount = 0;
    const handlers = createHandlers({
      getActiveSlide: () => ({ id: 'slide-1' }),
      resolveTransformSessionStart: () => {
        startCount += 1;
        return { session: activeSession, startBounds: {} };
      },
      finalizeTransformSession: (session) => {
        assert.equal(session, activeSession);
        return { didMove: false };
      },
      buildCompletionPlan: () => ({ shouldPersist: false, versionLabel: '' })
    });

    assert.equal(handlers.handlePointerDown({ pointerId: 7 }), true);
    assert.equal(handlers.handlePointerDown({ pointerId: 8 }), false);
    assert.equal(handlers.getSession(), activeSession);
    assert.equal(startCount, 1);

    handlers.finalizeSession({ cancelled: true });
    assert.equal(handlers.getSession(), null);
  });
});

test('transform pointer cancellation restores styles and does not persist either handler path', () => {
  [
    transformState.createStudioTransformPointerHandlers,
    transformState.createStudioTransformFallbackPointerHandlers
  ].forEach((createHandlers) => {
    const element = {
      style: {
        position: 'relative',
        margin: '8px',
        left: '10px',
        top: '20px',
        width: '100px',
        height: '50px'
      }
    };
    const startStyle = { ...element.style };
    const session = {
      pointerId: 7,
      materialized: true,
      moved: true,
      slideMetrics: {},
      items: [{ element, startStyle }]
    };
    let completionPlan = null;
    const handlers = createHandlers({
      getActiveSlide() {
        return { id: 'slide-1' };
      },
      resolveTransformSessionStart() {
        return { session, startBounds: {} };
      },
      buildTransformFrameState() {
        return { isActive: true, bounds: {} };
      },
      applyTransformBounds() {
        element.style.position = 'absolute';
        element.style.left = '90px';
        element.style.top = '100px';
      },
      onSessionFinalize(_finalizeResult, nextCompletionPlan) {
        completionPlan = nextCompletionPlan;
      }
    });

    assert.equal(handlers.handlePointerDown({ pointerId: 7 }), true);
    assert.equal(handlers.handlePointerMove({ pointerId: 7 }), true);
    assert.equal(element.style.left, '90px');
    assert.equal(handlers.handlePointerCancel({ pointerId: 7 }), true);
    assert.deepEqual(element.style, startStyle);
    assert.deepEqual(completionPlan, {
      shouldPersist: false,
      versionLabel: ''
    });
    assert.equal(handlers.getSession(), null);
  });
});

test('transform window blur rolls back the active gesture instead of persisting it', () => {
  const element = {
    style: {
      position: 'relative',
      margin: '4px',
      left: '12px',
      top: '18px',
      width: '80px',
      height: '40px'
    }
  };
  const startStyle = { ...element.style };
  const session = {
    pointerId: 3,
    materialized: true,
    moved: true,
    items: [{ element, startStyle }]
  };
  let completionPlan = null;
  const handlers = transformState.createStudioTransformPointerHandlers({
    getActiveSlide: () => ({ id: 'slide-1' }),
    resolveTransformSessionStart: () => ({ session, startBounds: {} }),
    onSessionFinalize(_finalizeResult, nextCompletionPlan) {
      completionPlan = nextCompletionPlan;
    }
  });

  assert.equal(handlers.handlePointerDown({ pointerId: 3 }), true);
  element.style.left = '120px';
  handlers.handleWindowBlur();

  assert.deepEqual(element.style, startStyle);
  assert.deepEqual(completionPlan, {
    shouldPersist: false,
    versionLabel: ''
  });
  assert.equal(handlers.getSession(), null);
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

test('buildStudioTransformStartState aborts when any selected item cannot materialize into a transform session item', () => {
  const selection = [{ id: 'node-1' }, { id: 'node-2' }];

  assert.equal(transformState.buildStudioTransformStartState(selection, {
    getSlideMetrics() {
      return { logicalWidth: 1280, logicalHeight: 720 };
    },
    getPointerOnSlide() {
      return { x: 10, y: 20 };
    },
    getSelectionBounds() {
      return { left: 0, top: 0, width: 100, height: 80 };
    },
    buildSessionItem(element) {
      return element.id === 'node-1' ? { elementId: element.id } : null;
    }
  }), null);
});

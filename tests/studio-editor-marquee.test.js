const test = require('node:test');
const assert = require('node:assert/strict');

const events = require('../shared/studio-editor-events.js');

function createPointerEvent(overrides = {}) {
  let prevented = 0;
  let stopped = 0;

  return {
    pointerId: 1,
    button: 0,
    isPrimary: true,
    clientX: 10,
    clientY: 10,
    shiftKey: false,
    preventDefault() {
      prevented += 1;
    },
    stopPropagation() {
      stopped += 1;
    },
    get prevented() {
      return prevented;
    },
    get stopped() {
      return stopped;
    },
    ...overrides
  };
}

test('createStudioMarqueePointerHandlers starts only on empty primary slide space', () => {
  const slide = {
    contains(target) {
      return target === slide || target === 'empty';
    }
  };
  const editableTarget = { id: 'element' };
  const handler = events.createStudioMarqueePointerHandlers({
    getActiveSlide: () => slide,
    resolveEditableTarget: (target) => target === editableTarget ? editableTarget : null,
    getSlideMetrics: () => ({ scaleX: 1, scaleY: 1 }),
    getPointerOnSlide: (event) => ({ x: event.clientX, y: event.clientY }),
    captureTarget: {}
  });

  assert.equal(handler.handlePointerDown(createPointerEvent({ target: editableTarget })), false);
  assert.equal(handler.handlePointerDown(createPointerEvent({ target: 'outside' })), false);
  assert.equal(handler.handlePointerDown(createPointerEvent({ target: 'empty', button: 2 })), false);
  assert.equal(handler.handlePointerDown(createPointerEvent({ target: 'empty' })), true);
  assert.equal(handler.getSession().additive, false);
});

test('createStudioMarqueePointerHandlers uses the shared drag threshold by default', () => {
  const slide = { contains: () => true };
  const handler = events.createStudioMarqueePointerHandlers({
    getActiveSlide: () => slide,
    getSlideMetrics: () => ({ scaleX: 1, scaleY: 1 }),
    getPointerOnSlide: (event) => ({ x: event.clientX, y: event.clientY })
  });

  assert.equal(handler.handlePointerDown(createPointerEvent({
    target: slide,
    clientX: 0,
    clientY: 0
  })), true);
  assert.equal(handler.handlePointerMove(createPointerEvent({
    clientX: 3,
    clientY: 0
  })), false);
  assert.equal(handler.handlePointerMove(createPointerEvent({
    clientX: 4,
    clientY: 0
  })), true);
  assert.equal(handler.handlePointerCancel(createPointerEvent()), true);
});

test('attachStudioMarqueePointerHandlers binds the shared marquee lifecycle', () => {
  const bodyListeners = new Map();
  const windowListeners = new Map();
  const doc = {
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

  assert.equal(events.attachStudioMarqueePointerHandlers(doc, handlers), true);
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

test('attachStudioPointerHandlers optionally prevents native drag while binding shared pointer events', () => {
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

  assert.equal(events.attachStudioPointerHandlers(doc, handlers, { preventNativeDrag: true }), true);
  assert.equal(documentListeners.get('dragstart').capture, true);
  assert.equal(bodyListeners.get('pointerdown').handler, handlers.handlePointerDown);
  assert.equal(bodyListeners.get('lostpointercapture').handler, handlers.handlePointerCancel);
  assert.deepEqual(windowListeners.get('blur'), {
    handler: handlers.handleWindowBlur,
    capture: true
  });
});

test('attachStudioMarqueePointerHandlers tolerates missing editor frame targets', () => {
  assert.equal(events.attachStudioMarqueePointerHandlers(null, {}), false);
  assert.equal(events.attachStudioMarqueePointerHandlers({ body: {} }, {}), false);
});

test('createStudioMarqueePointerHandlers captures, frames, and finalizes a marquee selection', () => {
  const calls = [];
  const slide = { contains: () => true };
  const captureTarget = {
    captured: null,
    setPointerCapture(pointerId) {
      this.captured = pointerId;
      calls.push(['capture', pointerId]);
    },
    hasPointerCapture(pointerId) {
      return this.captured === pointerId;
    },
    releasePointerCapture(pointerId) {
      calls.push(['release', pointerId]);
      this.captured = null;
    }
  };
  const handler = events.createStudioMarqueePointerHandlers({
    getActiveSlide: () => slide,
    getSlideMetrics: () => ({ scaleX: 1, scaleY: 1 }),
    getPointerOnSlide: (event) => ({ x: event.clientX, y: event.clientY }),
    getMarqueeElements: () => ['element-a'],
    getMarqueeSelection(elements, rect, session) {
      calls.push(['selection', elements, rect, session.additive]);
      return ['selected'];
    },
    captureTarget,
    dragStartThresholdPx: 4,
    onSessionStart(session) {
      calls.push(['start', session.startPointer]);
    },
    onSessionFrame(rect, selection) {
      calls.push(['frame', rect, selection]);
    },
    onSessionFinalize(result) {
      calls.push(['finalize', result]);
    }
  });

  const downEvent = createPointerEvent({
    pointerId: 7,
    target: slide,
    clientX: 80,
    clientY: 70,
    shiftKey: true
  });
  assert.equal(handler.handlePointerDown(downEvent), true);
  assert.equal(downEvent.prevented, 1);
  assert.equal(downEvent.stopped, 1);
  assert.equal(handler.handlePointerMove(createPointerEvent({
    pointerId: 7,
    clientX: 78,
    clientY: 68
  })), false);
  assert.equal(handler.handlePointerMove(createPointerEvent({
    pointerId: 7,
    clientX: 20,
    clientY: 30
  })), true);
  assert.equal(handler.handlePointerUp(createPointerEvent({
    pointerId: 7,
    clientX: 10,
    clientY: 15
  })), true);
  assert.equal(handler.getSession(), null);
  assert.deepEqual(calls, [
    ['capture', 7],
    ['start', { x: 80, y: 70 }],
    ['selection', ['element-a'], { left: 80, top: 70, right: 20, bottom: 30 }, true],
    ['frame', { left: 80, top: 70, right: 20, bottom: 30 }, ['selected']],
    ['selection', ['element-a'], { left: 80, top: 70, right: 10, bottom: 15 }, true],
    ['frame', { left: 80, top: 70, right: 10, bottom: 15 }, ['selected']],
    ['release', 7],
    ['finalize', {
      cancelled: false,
      didSelect: true,
      rect: { left: 80, top: 70, right: 10, bottom: 15 },
      selection: ['selected'],
      additive: true
    }]
  ]);
});

test('createStudioMarqueePointerHandlers cancels without committing an inactive or blurred drag', () => {
  const results = [];
  const slide = { contains: () => true };
  const handler = events.createStudioMarqueePointerHandlers({
    getActiveSlide: () => slide,
    getSlideMetrics: () => ({}),
    getPointerOnSlide: (event) => ({ x: event.clientX, y: event.clientY }),
    onSessionFinalize: (result) => results.push(result)
  });

  assert.equal(handler.handlePointerDown(createPointerEvent({ target: slide })), true);
  assert.equal(handler.handlePointerMove(createPointerEvent({ pointerId: 2, clientX: 40, clientY: 40 })), false);
  assert.equal(handler.handlePointerUp(createPointerEvent({ pointerId: 2 })), false);
  assert.equal(handler.handlePointerMove(createPointerEvent({ pointerId: undefined, clientX: 40, clientY: 40 })), false);
  assert.notEqual(handler.getSession(), null);
  assert.equal(handler.handlePointerCancel(createPointerEvent({ pointerId: 1 })), true);
  assert.deepEqual(results, [{
    cancelled: true,
    didSelect: false,
    rect: null,
    selection: [],
    additive: false
  }]);

  assert.equal(handler.handlePointerDown(createPointerEvent({ target: slide })), true);
  assert.equal(handler.handleWindowBlur(), true);
  assert.equal(results.length, 2);
  assert.equal(results[1].cancelled, true);
});

test('createStudioMarqueeSelectionHandlers commits additive selection and syncs cancelled drags', () => {
  const slide = { contains: () => true };
  const commits = [];
  let suppressNextFrameClick = false;
  let syncCalls = 0;
  const handler = events.createStudioMarqueeSelectionHandlers({
    getActiveSlide: () => slide,
    getSlideMetrics: () => ({ scaleX: 1, scaleY: 1 }),
    getPointerOnSlide: (event) => ({ x: event.clientX, y: event.clientY }),
    getMarqueeElements: () => ['element-a'],
    getMarqueeSelection: () => ['element-b'],
    getSelectedElements: () => ['element-existing'],
    commitSelectionState(nextState) {
      commits.push(nextState);
    },
    syncSelectionOverlay() {
      syncCalls += 1;
    },
    setSuppressNextFrameClick(nextValue) {
      suppressNextFrameClick = nextValue;
    }
  });

  assert.equal(handler.handlePointerDown(createPointerEvent({ target: slide, shiftKey: true })), true);
  assert.equal(handler.handlePointerMove(createPointerEvent({ pointerId: 1, clientX: 40, clientY: 40 })), true);
  assert.equal(handler.handlePointerUp(createPointerEvent({ pointerId: 1, clientX: 50, clientY: 50 })), true);
  assert.deepEqual(commits, [{ selectedElements: ['element-existing', 'element-b'] }]);
  assert.equal(suppressNextFrameClick, true);

  assert.equal(handler.handlePointerDown(createPointerEvent({ target: slide })), true);
  assert.equal(handler.handlePointerCancel(createPointerEvent({ pointerId: 1 })), true);
  assert.equal(syncCalls, 1);
});

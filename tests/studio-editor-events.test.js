const test = require('node:test');
const assert = require('node:assert/strict');

const events = require('../shared/studio-editor-events.js');

function createKeyboardEvent(overrides = {}) {
  let prevented = 0;
  let stopped = 0;

  return {
    key: '',
    code: '',
    ctrlKey: false,
    metaKey: false,
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

test('createStudioFrameKeydownHandler ignores stale disconnected selections for selection-only shortcuts', () => {
  const calls = {
    arrange: [],
    remove: 0,
    duplicate: 0,
    nudge: []
  };
  const handler = events.createStudioFrameKeydownHandler({
    getActiveElement: () => null,
    getSelectedElements: () => [{ id: 1, isConnected: false }],
    arrangeElementLayer(action) {
      calls.arrange.push(action);
    },
    removeSelectedElement() {
      calls.remove += 1;
    },
    duplicateSelectedElements() {
      calls.duplicate += 1;
    },
    nudgeSelectedElements(dx, dy) {
      calls.nudge.push([dx, dy]);
    }
  });

  const arrangeEvent = createKeyboardEvent({
    key: '[',
    code: 'BracketLeft',
    ctrlKey: true
  });
  handler(arrangeEvent);
  assert.deepEqual(calls.arrange, []);
  assert.equal(arrangeEvent.prevented, 0);
  assert.equal(arrangeEvent.stopped, 0);

  const deleteEvent = createKeyboardEvent({ key: 'Delete' });
  handler(deleteEvent);
  assert.equal(calls.remove, 0);
  assert.equal(deleteEvent.prevented, 0);
  assert.equal(deleteEvent.stopped, 0);

  const duplicateEvent = createKeyboardEvent({
    key: 'd',
    ctrlKey: true
  });
  handler(duplicateEvent);
  assert.equal(calls.duplicate, 0);
  assert.equal(duplicateEvent.prevented, 0);
  assert.equal(duplicateEvent.stopped, 0);

  const nudgeEvent = createKeyboardEvent({ key: 'ArrowUp' });
  handler(nudgeEvent);
  assert.deepEqual(calls.nudge, []);
  assert.equal(nudgeEvent.prevented, 0);
  assert.equal(nudgeEvent.stopped, 0);
});

test('createStudioFrameKeydownHandler still honors shortcuts for live selections', () => {
  const calls = {
    remove: 0,
    nudge: []
  };
  const handler = events.createStudioFrameKeydownHandler({
    getActiveElement: () => null,
    getSelectedElements: () => [
      { id: 1, isConnected: false },
      { id: 2, isConnected: true }
    ],
    removeSelectedElement() {
      calls.remove += 1;
    },
    nudgeSelectedElements(dx, dy) {
      calls.nudge.push([dx, dy]);
    }
  });

  const deleteEvent = createKeyboardEvent({ key: 'Delete' });
  handler(deleteEvent);
  assert.equal(calls.remove, 1);
  assert.equal(deleteEvent.prevented, 1);
  assert.equal(deleteEvent.stopped, 1);

  const nudgeEvent = createKeyboardEvent({
    key: 'ArrowRight',
    shiftKey: true
  });
  handler(nudgeEvent);
  assert.deepEqual(calls.nudge, [[10, 0]]);
  assert.equal(nudgeEvent.prevented, 1);
  assert.equal(nudgeEvent.stopped, 1);
});

test('createStudioGlobalKeydownHandler ignores stale disconnected selections for selection-only shortcuts', () => {
  const calls = {
    arrange: [],
    remove: 0,
    duplicate: 0,
    nudge: []
  };
  const handler = events.createStudioGlobalKeydownHandler({
    isEditorActive: () => true,
    getActiveElement: () => null,
    getSelectedElements: () => [{ id: 1, isConnected: false }],
    arrangeElementLayer(action) {
      calls.arrange.push(action);
    },
    removeSelectedElement() {
      calls.remove += 1;
    },
    duplicateSelectedElements() {
      calls.duplicate += 1;
    },
    nudgeSelectedElements(dx, dy) {
      calls.nudge.push([dx, dy]);
    }
  });

  const arrangeEvent = createKeyboardEvent({
    key: ']',
    code: 'BracketRight',
    ctrlKey: true
  });
  handler(arrangeEvent);
  assert.deepEqual(calls.arrange, []);
  assert.equal(arrangeEvent.prevented, 0);

  const deleteEvent = createKeyboardEvent({ key: 'Delete' });
  handler(deleteEvent);
  assert.equal(calls.remove, 0);
  assert.equal(deleteEvent.prevented, 0);

  const duplicateEvent = createKeyboardEvent({
    key: 'd',
    ctrlKey: true
  });
  handler(duplicateEvent);
  assert.equal(calls.duplicate, 0);
  assert.equal(duplicateEvent.prevented, 0);

  const nudgeEvent = createKeyboardEvent({ key: 'ArrowLeft' });
  handler(nudgeEvent);
  assert.deepEqual(calls.nudge, []);
  assert.equal(nudgeEvent.prevented, 0);
});

test('createStudioGlobalKeydownHandler still honors shortcuts for live selections', () => {
  const calls = {
    arrange: [],
    duplicate: 0,
    nudge: []
  };
  const handler = events.createStudioGlobalKeydownHandler({
    isEditorActive: () => true,
    getActiveElement: () => null,
    getSelectedElements: () => [
      { id: 1, isConnected: false },
      { id: 2, isConnected: true }
    ],
    arrangeElementLayer(action) {
      calls.arrange.push(action);
    },
    duplicateSelectedElements() {
      calls.duplicate += 1;
    },
    nudgeSelectedElements(dx, dy) {
      calls.nudge.push([dx, dy]);
    }
  });

  const arrangeEvent = createKeyboardEvent({
    key: ']',
    code: 'BracketRight',
    ctrlKey: true,
    shiftKey: true
  });
  handler(arrangeEvent);
  assert.deepEqual(calls.arrange, ['front']);
  assert.equal(arrangeEvent.prevented, 1);

  const duplicateEvent = createKeyboardEvent({
    key: 'd',
    ctrlKey: true
  });
  handler(duplicateEvent);
  assert.equal(calls.duplicate, 1);
  assert.equal(duplicateEvent.prevented, 1);

  const nudgeEvent = createKeyboardEvent({
    key: 'ArrowLeft',
    shiftKey: true
  });
  handler(nudgeEvent);
  assert.deepEqual(calls.nudge, [[-10, 0]]);
  assert.equal(nudgeEvent.prevented, 1);
});

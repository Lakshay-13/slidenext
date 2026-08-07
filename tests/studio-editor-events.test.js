const test = require('node:test');
const assert = require('node:assert/strict');

const events = require('../shared/studio-editor-events.js');

test('attachStudioFrameInteractionHandlers binds frame click and keyboard listeners', () => {
  const listeners = new Map();
  const doc = {
    addEventListener(type, handler, capture) {
      listeners.set(type, { handler, capture });
    }
  };
  const clickHandler = () => {};
  const keydownHandler = () => {};

  assert.equal(events.attachStudioFrameInteractionHandlers(doc, {
    clickHandler,
    keydownHandler
  }), true);
  assert.deepEqual(listeners.get('click'), { handler: clickHandler, capture: true });
  assert.deepEqual(listeners.get('keydown'), { handler: keydownHandler, capture: true });
});

test('attachStudioFrameInteractionHandlers tolerates missing frame documents', () => {
  assert.equal(events.attachStudioFrameInteractionHandlers(null), false);
  assert.equal(events.attachStudioFrameInteractionHandlers({}), false);
});

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
    copy: 0,
    paste: 0,
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
    copySelectedElements() {
      calls.copy += 1;
    },
    pasteClipboardElements() {
      calls.paste += 1;
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

  const copyEvent = createKeyboardEvent({
    key: 'c',
    ctrlKey: true
  });
  handler(copyEvent);
  assert.equal(calls.copy, 0);
  assert.equal(copyEvent.prevented, 0);
  assert.equal(copyEvent.stopped, 0);

  const pasteEvent = createKeyboardEvent({
    key: 'v',
    ctrlKey: true
  });
  handler(pasteEvent);
  assert.equal(calls.paste, 1);
  assert.equal(pasteEvent.prevented, 1);
  assert.equal(pasteEvent.stopped, 1);

  const nudgeEvent = createKeyboardEvent({ key: 'ArrowUp' });
  handler(nudgeEvent);
  assert.deepEqual(calls.nudge, []);
  assert.equal(nudgeEvent.prevented, 0);
  assert.equal(nudgeEvent.stopped, 0);
});

test('createStudioFrameClickHandler consumes one suppressed click without changing selection', () => {
  const calls = [];
  let suppress = true;
  const handler = events.createStudioFrameClickHandler({
    consumeClickSuppression() {
      const current = suppress;
      suppress = false;
      return current;
    },
    resolveEditableTarget: (target) => target,
    selectElement(target) {
      calls.push(['select', target]);
    },
    deselectElement() {
      calls.push(['deselect']);
    }
  });

  handler({ target: { id: 'first' } });
  handler({ target: { id: 'second' } });
  assert.deepEqual(calls, [['select', { id: 'second' }]]);
});

test('createStudioFrameKeydownHandler still honors shortcuts for live selections', () => {
  const calls = {
    remove: 0,
    copy: 0,
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
    copySelectedElements() {
      calls.copy += 1;
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

  const copyEvent = createKeyboardEvent({
    key: 'c',
    ctrlKey: true
  });
  handler(copyEvent);
  assert.equal(calls.copy, 1);
  assert.equal(copyEvent.prevented, 1);
  assert.equal(copyEvent.stopped, 1);

  const nudgeEvent = createKeyboardEvent({
    key: 'ArrowRight',
    shiftKey: true
  });
  handler(nudgeEvent);
  assert.deepEqual(calls.nudge, [[10, 0]]);
  assert.equal(nudgeEvent.prevented, 1);
  assert.equal(nudgeEvent.stopped, 1);
});

test('createStudioFrameKeydownHandler skips deck-level paste and select-all shortcuts until the active slide is ready', () => {
  const calls = {
    arrange: [],
    copy: 0,
    duplicate: 0,
    nudge: [],
    remove: 0,
    undo: 0,
    redo: 0,
    paste: 0,
    selectAll: 0
  };
  const handler = events.createStudioFrameKeydownHandler({
    getActiveElement: () => null,
    getSelectedElements: () => [{ id: 1, isConnected: true }],
    canMutateDeck: () => false,
    arrangeElementLayer(action) {
      calls.arrange.push(action);
    },
    copySelectedElements() {
      calls.copy += 1;
    },
    duplicateSelectedElements() {
      calls.duplicate += 1;
    },
    nudgeSelectedElements(dx, dy) {
      calls.nudge.push([dx, dy]);
    },
    removeSelectedElement() {
      calls.remove += 1;
    },
    editorUndo() {
      calls.undo += 1;
    },
    editorRedo() {
      calls.redo += 1;
    },
    pasteClipboardElements() {
      calls.paste += 1;
    },
    selectAllElementsOnActiveSlide() {
      calls.selectAll += 1;
    }
  });

  const pasteEvent = createKeyboardEvent({
    key: 'v',
    ctrlKey: true
  });
  handler(pasteEvent);
  assert.equal(calls.paste, 0);
  assert.equal(pasteEvent.prevented, 0);
  assert.equal(pasteEvent.stopped, 0);

  const selectAllEvent = createKeyboardEvent({
    key: 'a',
    ctrlKey: true
  });
  handler(selectAllEvent);
  assert.equal(calls.selectAll, 0);
  assert.equal(selectAllEvent.prevented, 0);
  assert.equal(selectAllEvent.stopped, 0);

  const undoEvent = createKeyboardEvent({
    key: 'z',
    ctrlKey: true
  });
  handler(undoEvent);
  assert.equal(calls.undo, 0);
  assert.equal(undoEvent.prevented, 0);
  assert.equal(undoEvent.stopped, 0);

  const redoEvent = createKeyboardEvent({
    key: 'y',
    ctrlKey: true
  });
  handler(redoEvent);
  assert.equal(calls.redo, 0);
  assert.equal(redoEvent.prevented, 0);
  assert.equal(redoEvent.stopped, 0);

  const copyEvent = createKeyboardEvent({
    key: 'c',
    ctrlKey: true
  });
  handler(copyEvent);
  assert.equal(calls.copy, 0);
  assert.equal(copyEvent.prevented, 0);
  assert.equal(copyEvent.stopped, 0);

  const duplicateEvent = createKeyboardEvent({
    key: 'd',
    ctrlKey: true
  });
  handler(duplicateEvent);
  assert.equal(calls.duplicate, 0);
  assert.equal(duplicateEvent.prevented, 0);
  assert.equal(duplicateEvent.stopped, 0);

  const arrangeEvent = createKeyboardEvent({
    key: ']',
    code: 'BracketRight',
    ctrlKey: true
  });
  handler(arrangeEvent);
  assert.deepEqual(calls.arrange, []);
  assert.equal(arrangeEvent.prevented, 0);
  assert.equal(arrangeEvent.stopped, 0);

  const deleteEvent = createKeyboardEvent({
    key: 'Delete'
  });
  handler(deleteEvent);
  assert.equal(calls.remove, 0);
  assert.equal(deleteEvent.prevented, 0);
  assert.equal(deleteEvent.stopped, 0);

  const nudgeEvent = createKeyboardEvent({
    key: 'ArrowRight'
  });
  handler(nudgeEvent);
  assert.deepEqual(calls.nudge, []);
  assert.equal(nudgeEvent.prevented, 0);
  assert.equal(nudgeEvent.stopped, 0);

  const nextSlideEvent = createKeyboardEvent({
    key: 'PageDown'
  });
  handler(nextSlideEvent);
  assert.equal(nextSlideEvent.prevented, 0);
  assert.equal(nextSlideEvent.stopped, 0);
});

test('createStudioFrameKeydownHandler still suppresses frame navigation keys when the active slide is ready', () => {
  const handler = events.createStudioFrameKeydownHandler({
    getActiveElement: () => null,
    getSelectedElements: () => [],
    canMutateDeck: () => true
  });

  const nextSlideEvent = createKeyboardEvent({
    key: 'PageDown'
  });
  handler(nextSlideEvent);
  assert.equal(nextSlideEvent.prevented, 1);
  assert.equal(nextSlideEvent.stopped, 1);
});

test('createStudioFrameKeydownHandler routes unmodified navigation keys without stealing selected-element nudges', () => {
  const calls = {
    navigation: [],
    nudge: []
  };
  const handler = events.createStudioFrameKeydownHandler({
    getActiveElement: () => null,
    getSelectedElements: () => [],
    canMutateDeck: () => true,
    navigateSlide(direction) {
      calls.navigation.push(direction);
    },
    nudgeSelectedElements(dx, dy) {
      calls.nudge.push([dx, dy]);
    }
  });

  for (const [key, direction] of [['PageDown', 1], ['PageUp', -1], ['ArrowRight', 1], ['ArrowLeft', -1], [' ', 1]]) {
    const event = createKeyboardEvent({ key });
    handler(event);
    assert.equal(event.prevented, 1);
    assert.equal(event.stopped, 1);
    assert.equal(calls.navigation.at(-1), direction);
  }

  const selectedHandler = events.createStudioFrameKeydownHandler({
    getActiveElement: () => null,
    getSelectedElements: () => [{ id: 'node-1', isConnected: true }],
    canMutateDeck: () => true,
    navigateSlide(direction) {
      calls.navigation.push(direction);
    },
    nudgeSelectedElements(dx, dy) {
      calls.nudge.push([dx, dy]);
    }
  });
  const nudgeEvent = createKeyboardEvent({ key: 'ArrowRight' });
  selectedHandler(nudgeEvent);

  assert.deepEqual(calls.nudge, [[1, 0]]);
  assert.equal(calls.navigation.length, 5);
  assert.equal(nudgeEvent.prevented, 1);
  assert.equal(nudgeEvent.stopped, 1);
});

test('createStudioFrameKeydownHandler leaves modified arrow and page shortcuts untouched', () => {
  const calls = {
    navigation: [],
    nudge: []
  };
  const handler = events.createStudioFrameKeydownHandler({
    getActiveElement: () => null,
    getSelectedElements: () => [{ id: 'node-1', isConnected: true }],
    canMutateDeck: () => true,
    navigateSlide(direction) {
      calls.navigation.push(direction);
    },
    nudgeSelectedElements(dx, dy) {
      calls.nudge.push([dx, dy]);
    }
  });

  const modifiedArrowEvent = createKeyboardEvent({ key: 'ArrowRight', ctrlKey: true });
  handler(modifiedArrowEvent);
  const modifiedPageEvent = createKeyboardEvent({ key: 'PageDown', altKey: true });
  handler(modifiedPageEvent);

  assert.deepEqual(calls, { navigation: [], nudge: [] });
  assert.equal(modifiedArrowEvent.prevented, 0);
  assert.equal(modifiedArrowEvent.stopped, 0);
  assert.equal(modifiedPageEvent.prevented, 0);
  assert.equal(modifiedPageEvent.stopped, 0);
});

test('createStudioFrameKeydownHandler does not intercept undo and redo while typing', () => {
  const calls = {
    undo: 0,
    redo: 0
  };
  const handler = events.createStudioFrameKeydownHandler({
    getActiveElement: () => ({ tagName: 'TEXTAREA' }),
    editorUndo() {
      calls.undo += 1;
    },
    editorRedo() {
      calls.redo += 1;
    }
  });

  const undoEvent = createKeyboardEvent({
    key: 'z',
    ctrlKey: true
  });
  handler(undoEvent);
  assert.equal(calls.undo, 0);
  assert.equal(undoEvent.prevented, 0);
  assert.equal(undoEvent.stopped, 0);

  const redoEvent = createKeyboardEvent({
    key: 'y',
    ctrlKey: true
  });
  handler(redoEvent);
  assert.equal(calls.redo, 0);
  assert.equal(redoEvent.prevented, 0);
  assert.equal(redoEvent.stopped, 0);
});

test('createStudioFrameKeydownHandler does not nudge while an inspector select is focused', () => {
  const calls = [];
  const handler = events.createStudioFrameKeydownHandler({
    getActiveElement: () => ({ tagName: 'SELECT' }),
    getSelectedElements: () => [{ id: 'node-1', isConnected: true }],
    nudgeSelectedElements(dx, dy) {
      calls.push([dx, dy]);
    }
  });

  const event = createKeyboardEvent({ key: 'ArrowDown' });
  handler(event);
  assert.deepEqual(calls, []);
  assert.equal(event.prevented, 0);
  assert.equal(event.stopped, 0);
});

test('createStudioGlobalKeydownHandler ignores stale disconnected selections for selection-only shortcuts', () => {
  const calls = {
    arrange: [],
    remove: 0,
    copy: 0,
    paste: 0,
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
    copySelectedElements() {
      calls.copy += 1;
    },
    pasteClipboardElements() {
      calls.paste += 1;
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

  const copyEvent = createKeyboardEvent({
    key: 'c',
    ctrlKey: true
  });
  handler(copyEvent);
  assert.equal(calls.copy, 0);
  assert.equal(copyEvent.prevented, 0);

  const pasteEvent = createKeyboardEvent({
    key: 'v',
    ctrlKey: true
  });
  handler(pasteEvent);
  assert.equal(calls.paste, 1);
  assert.equal(pasteEvent.prevented, 1);

  const nudgeEvent = createKeyboardEvent({ key: 'ArrowLeft' });
  handler(nudgeEvent);
  assert.deepEqual(calls.nudge, []);
  assert.equal(nudgeEvent.prevented, 0);
});

test('createStudioGlobalKeydownHandler still honors shortcuts for live selections', () => {
  const calls = {
    arrange: [],
    copy: 0,
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
    copySelectedElements() {
      calls.copy += 1;
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

  const copyEvent = createKeyboardEvent({
    key: 'c',
    ctrlKey: true
  });
  handler(copyEvent);
  assert.equal(calls.copy, 1);
  assert.equal(copyEvent.prevented, 1);

  const nudgeEvent = createKeyboardEvent({
    key: 'ArrowLeft',
    shiftKey: true
  });
  handler(nudgeEvent);
  assert.deepEqual(calls.nudge, [[-10, 0]]);
  assert.equal(nudgeEvent.prevented, 1);
});

test('createStudioGlobalKeydownHandler skips deck-level paste and select-all shortcuts until the active slide is ready', () => {
  const calls = {
    arrange: [],
    copy: 0,
    duplicate: 0,
    nudge: [],
    remove: 0,
    undo: 0,
    redo: 0,
    paste: 0,
    selectAll: 0
  };
  const handler = events.createStudioGlobalKeydownHandler({
    isEditorActive: () => true,
    getActiveElement: () => null,
    getSelectedElements: () => [{ id: 1, isConnected: true }],
    canMutateDeck: () => false,
    arrangeElementLayer(action) {
      calls.arrange.push(action);
    },
    copySelectedElements() {
      calls.copy += 1;
    },
    duplicateSelectedElements() {
      calls.duplicate += 1;
    },
    nudgeSelectedElements(dx, dy) {
      calls.nudge.push([dx, dy]);
    },
    removeSelectedElement() {
      calls.remove += 1;
    },
    editorUndo() {
      calls.undo += 1;
    },
    editorRedo() {
      calls.redo += 1;
    },
    pasteClipboardElements() {
      calls.paste += 1;
    },
    selectAllElementsOnActiveSlide() {
      calls.selectAll += 1;
    }
  });

  const pasteEvent = createKeyboardEvent({
    key: 'v',
    ctrlKey: true
  });
  handler(pasteEvent);
  assert.equal(calls.paste, 0);
  assert.equal(pasteEvent.prevented, 0);

  const selectAllEvent = createKeyboardEvent({
    key: 'a',
    ctrlKey: true
  });
  handler(selectAllEvent);
  assert.equal(calls.selectAll, 0);
  assert.equal(selectAllEvent.prevented, 0);

  const undoEvent = createKeyboardEvent({
    key: 'z',
    ctrlKey: true
  });
  handler(undoEvent);
  assert.equal(calls.undo, 0);
  assert.equal(undoEvent.prevented, 0);

  const redoEvent = createKeyboardEvent({
    key: 'y',
    ctrlKey: true
  });
  handler(redoEvent);
  assert.equal(calls.redo, 0);
  assert.equal(redoEvent.prevented, 0);

  const copyEvent = createKeyboardEvent({
    key: 'c',
    ctrlKey: true
  });
  handler(copyEvent);
  assert.equal(calls.copy, 0);
  assert.equal(copyEvent.prevented, 0);

  const duplicateEvent = createKeyboardEvent({
    key: 'd',
    ctrlKey: true
  });
  handler(duplicateEvent);
  assert.equal(calls.duplicate, 0);
  assert.equal(duplicateEvent.prevented, 0);

  const arrangeEvent = createKeyboardEvent({
    key: ']',
    code: 'BracketRight',
    ctrlKey: true
  });
  handler(arrangeEvent);
  assert.deepEqual(calls.arrange, []);
  assert.equal(arrangeEvent.prevented, 0);

  const deleteEvent = createKeyboardEvent({
    key: 'Delete'
  });
  handler(deleteEvent);
  assert.equal(calls.remove, 0);
  assert.equal(deleteEvent.prevented, 0);

  const nudgeEvent = createKeyboardEvent({
    key: 'ArrowRight'
  });
  handler(nudgeEvent);
  assert.deepEqual(calls.nudge, []);
  assert.equal(nudgeEvent.prevented, 0);
});

test('createStudioGlobalKeydownHandler does not intercept undo and redo while typing', () => {
  const calls = {
    undo: 0,
    redo: 0
  };
  const handler = events.createStudioGlobalKeydownHandler({
    isEditorActive: () => true,
    getActiveElement: () => ({ isContentEditable: true }),
    editorUndo() {
      calls.undo += 1;
    },
    editorRedo() {
      calls.redo += 1;
    }
  });

  const undoEvent = createKeyboardEvent({
    key: 'z',
    ctrlKey: true
  });
  handler(undoEvent);
  assert.equal(calls.undo, 0);
  assert.equal(undoEvent.prevented, 0);

  const redoEvent = createKeyboardEvent({
    key: 'z',
    ctrlKey: true,
    shiftKey: true
  });
  handler(redoEvent);
  assert.equal(calls.redo, 0);
  assert.equal(redoEvent.prevented, 0);
});

test('createStudioGlobalKeydownHandler does not nudge while an inspector select is focused', () => {
  const calls = [];
  const handler = events.createStudioGlobalKeydownHandler({
    isEditorActive: () => true,
    getActiveElement: () => ({ tagName: 'SELECT' }),
    getSelectedElements: () => [{ id: 'node-1', isConnected: true }],
    nudgeSelectedElements(dx, dy) {
      calls.push([dx, dy]);
    }
  });

  const event = createKeyboardEvent({ key: 'ArrowDown' });
  handler(event);
  assert.deepEqual(calls, []);
  assert.equal(event.prevented, 0);
});

test('createStudioGlobalKeydownHandler routes page navigation when the editor is active', () => {
  const calls = [];
  const handler = events.createStudioGlobalKeydownHandler({
    isEditorActive: () => true,
    getActiveElement: () => null,
    getSelectedElements: () => [],
    canMutateDeck: () => true,
    navigateSlide(direction) {
      calls.push(direction);
    }
  });

  const event = createKeyboardEvent({ key: 'PageUp' });
  handler(event);

  assert.deepEqual(calls, [-1]);
  assert.equal(event.prevented, 1);
});

test('createStudioGlobalKeydownHandler leaves modified nudge shortcuts untouched', () => {
  const calls = [];
  const handler = events.createStudioGlobalKeydownHandler({
    isEditorActive: () => true,
    getActiveElement: () => null,
    getSelectedElements: () => [{ id: 'node-1', isConnected: true }],
    canMutateDeck: () => true,
    nudgeSelectedElements(dx, dy) {
      calls.push([dx, dy]);
    }
  });

  const event = createKeyboardEvent({ key: 'ArrowLeft', metaKey: true });
  handler(event);

  assert.deepEqual(calls, []);
  assert.equal(event.prevented, 0);
});

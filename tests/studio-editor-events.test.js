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

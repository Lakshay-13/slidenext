const test = require('node:test');
const assert = require('node:assert/strict');

const clipboardState = require('../shared/studio-editor-clipboard.js');

test('canStudioCopySelection rejects empty selections and locked selections', () => {
  assert.equal(clipboardState.canStudioCopySelection([], {
    isLocked: () => false
  }), false);

  assert.equal(clipboardState.canStudioCopySelection([{ id: 1 }, { id: 2 }], {
    isLocked: (element) => element.id === 2
  }), false);
});

test('canStudioCopySelection allows unlocked selections', () => {
  assert.equal(clipboardState.canStudioCopySelection([{ id: 1 }, { id: 2 }], {
    isLocked: () => false
  }), true);
});

test('getStudioClipboardSelection filters stale selections and preserves ordered selection', () => {
  const stale = { id: 1, isConnected: false };
  const first = { id: 2, isConnected: true };
  const second = { id: 3, isConnected: true };

  assert.deepEqual(clipboardState.getStudioClipboardSelection(
    [stale, second, first],
    {
      orderedElements: [first, second]
    }
  ), [first, second]);

  assert.deepEqual(clipboardState.getStudioClipboardSelection(
    [second, first],
    {}
  ), [second, first]);
});

test('canStudioCopySelection ignores disconnected stale selections', () => {
  assert.equal(clipboardState.canStudioCopySelection([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ], {
    isLocked: (element) => element.id === 1
  }), true);

  assert.equal(clipboardState.canStudioCopySelection([
    { id: 1, isConnected: false }
  ], {
    isLocked: () => false
  }), false);
});

test('hasStudioClipboardItems reflects whether clipboard items exist', () => {
  assert.equal(clipboardState.hasStudioClipboardItems(null), false);
  assert.equal(clipboardState.hasStudioClipboardItems({ items: [] }), false);
  assert.equal(clipboardState.hasStudioClipboardItems({ items: [{ id: 1 }] }), true);
});

test('buildStudioClipboardActionState combines lock-aware copy state with clipboard paste state', () => {
  assert.deepEqual(clipboardState.buildStudioClipboardActionState(
    [{ id: 1 }, { id: 2 }],
    { items: [{ id: 'copy' }] },
    {
      isLocked: (element) => element.id === 2
    }
  ), {
    selection: [{ id: 1 }, { id: 2 }],
    canCopy: false,
    canDuplicate: false,
    canPaste: true
  });

  assert.deepEqual(clipboardState.buildStudioClipboardActionState(
    [{ id: 1 }],
    null,
    {
      isLocked: () => false
    }
  ), {
    selection: [{ id: 1 }],
    canCopy: true,
    canDuplicate: true,
    canPaste: false
  });

  assert.deepEqual(clipboardState.buildStudioClipboardActionState(
    [{ id: 1, isConnected: false }],
    { items: [{ id: 'copy' }] },
    {
      isLocked: () => false
    }
  ), {
    selection: [],
    canCopy: false,
    canDuplicate: false,
    canPaste: true
  });
});

test('buildStudioClipboardMutationPlan reuses the live unlocked selection for copy and duplicate actions', () => {
  const stale = { id: 'stale', isConnected: false, locked: false };
  const live = { id: 'live', isConnected: true, locked: false };
  const locked = { id: 'locked', isConnected: true, locked: true };

  assert.deepEqual(clipboardState.buildStudioClipboardMutationPlan([stale, live], null, {
    isLocked: (element) => !!element.locked
  }), {
    selection: [live],
    canCopy: true,
    canDuplicate: true,
    canPaste: false
  });

  assert.deepEqual(clipboardState.buildStudioClipboardMutationPlan([live, locked], null, {
    isLocked: (element) => !!element.locked
  }), {
    selection: [live, locked],
    canCopy: false,
    canDuplicate: false,
    canPaste: false
  });
});

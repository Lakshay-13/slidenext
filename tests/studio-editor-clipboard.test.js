const test = require('node:test');
const assert = require('node:assert/strict');

const clipboardState = require('../shared/studio-editor-clipboard.js');

function createClassList() {
  const values = new Set();
  return {
    add(value) {
      values.add(value);
    },
    contains(value) {
      return values.has(value);
    }
  };
}

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

test('buildStudioClipboardPayloadItem captures sanitized absolute payload geometry', () => {
  const template = {
    classList: createClassList()
  };
  const parent = { id: 'parent' };
  const element = {
    id: 'source',
    cloneNode(deep) {
      assert.equal(deep, true);
      return template;
    }
  };

  const result = clipboardState.buildStudioClipboardPayloadItem(element, {
    sanitizeElement(clone) {
      clone.sanitized = true;
    },
    getComputedStyle(currentElement) {
      assert.equal(currentElement, element);
      return { position: 'absolute' };
    },
    getClosestPositionedAncestor(currentElement) {
      assert.equal(currentElement, element);
      return parent;
    },
    buildPositionedLayoutItem(currentElement, options) {
      assert.equal(currentElement, element);
      assert.deepEqual(options, { slideMetrics: { logicalWidth: 1920 } });
      return {
        absLeft: 120,
        absTop: 80,
        width: 300,
        height: 160
      };
    },
    positionedLayoutOptions: {
      slideMetrics: { logicalWidth: 1920 }
    }
  });

  assert.equal(template.sanitized, true);
  assert.equal(template.classList.contains('editor-hoverable'), true);
  assert.deepEqual(result, {
    template,
    isAbsolutelyPositioned: true,
    sourceElement: element,
    sourceParent: parent,
    startAbsLeft: 120,
    startAbsTop: 80,
    width: 300,
    height: 160
  });
});

test('buildStudioClipboardPayloadItems aborts when any selected element cannot produce a payload item', () => {
  const firstTemplate = { classList: createClassList() };
  const secondTemplate = { classList: createClassList() };
  const first = {
    id: 'first',
    cloneNode() {
      return firstTemplate;
    }
  };
  const second = {
    id: 'second',
    cloneNode() {
      return secondTemplate;
    }
  };

  assert.deepEqual(clipboardState.buildStudioClipboardPayloadItems([first, second], {
    getComputedStyle() {
      return { position: 'absolute' };
    },
    buildPositionedLayoutItem(element) {
      if (element === first) {
        return {
          absLeft: 10,
          absTop: 20,
          width: 30,
          height: 40
        };
      }
      return null;
    }
  }), []);
});

test('resolveStudioClipboardInsertionTarget preserves live insertion anchors and falls back from stale ones', () => {
  const slide = { id: 'slide', isConnected: true };
  const liveParent = { id: 'parent', isConnected: true };
  const staleParent = { id: 'stale-parent', isConnected: false };
  const liveSource = { id: 'source', isConnected: true };
  const staleSource = { id: 'stale-source', isConnected: false };

  assert.deepEqual(clipboardState.resolveStudioClipboardInsertionTarget({
    isAbsolutelyPositioned: true,
    sourceParent: liveParent
  }, {
    slide,
    isOnActiveSlide: (element) => element === liveParent
  }), {
    mode: 'absolute',
    parent: liveParent
  });

  assert.deepEqual(clipboardState.resolveStudioClipboardInsertionTarget({
    isAbsolutelyPositioned: true,
    sourceParent: staleParent
  }, {
    slide,
    isOnActiveSlide: () => false
  }), {
    mode: 'absolute',
    parent: slide
  });

  assert.deepEqual(clipboardState.resolveStudioClipboardInsertionTarget({
    isAbsolutelyPositioned: false,
    sourceElement: liveSource
  }, {
    slide,
    isOnActiveSlide: (element) => element === liveSource
  }), {
    mode: 'after-source',
    anchor: liveSource,
    parent: slide
  });

  assert.deepEqual(clipboardState.resolveStudioClipboardInsertionTarget({
    isAbsolutelyPositioned: false,
    sourceElement: staleSource
  }, {
    slide,
    isOnActiveSlide: () => false
  }), {
    mode: 'append-to-slide',
    parent: slide
  });
});

test('buildStudioClipboardAbsolutePlacement offsets and clamps absolute insertions within slide bounds', () => {
  assert.deepEqual(clipboardState.buildStudioClipboardAbsolutePlacement({
    startAbsLeft: 100,
    startAbsTop: 120,
    width: 200,
    height: 80
  }, 2, {
    offsetPx: 16,
    slideWidth: 1920,
    slideHeight: 1080,
    parentLeft: 20,
    parentTop: 30
  }), {
    nextAbsLeft: 132,
    nextAbsTop: 152,
    nextLeft: 112,
    nextTop: 122
  });

  assert.deepEqual(clipboardState.buildStudioClipboardAbsolutePlacement({
    startAbsLeft: 1810,
    startAbsTop: 1010,
    width: 150,
    height: 60
  }, 3, {
    offsetPx: 16,
    slideWidth: 1920,
    slideHeight: 1080,
    parentLeft: 10,
    parentTop: 20
  }), {
    nextAbsLeft: 1770,
    nextAbsTop: 1020,
    nextLeft: 1760,
    nextTop: 1000
  });
});

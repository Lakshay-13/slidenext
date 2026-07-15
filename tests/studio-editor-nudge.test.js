const test = require('node:test');
const assert = require('node:assert/strict');

const nudge = require('../shared/studio-editor-nudge.js');

test('buildStudioNudgeSelectionState filters stale selections and requires unlocked freeform targets', () => {
  const stale = { id: 'stale', isConnected: false };
  const freeform = { id: 'freeform', isConnected: true, locked: false, freeform: true };
  const locked = { id: 'locked', isConnected: true, locked: true, freeform: true };

  assert.deepEqual(nudge.buildStudioNudgeSelectionState([stale, freeform], {
    isLocked: (element) => !!element.locked,
    isFreeformPositioned: (element) => !!element.freeform
  }), {
    selection: [freeform],
    canNudge: true
  });

  assert.deepEqual(nudge.buildStudioNudgeSelectionState([freeform, locked], {
    isLocked: (element) => !!element.locked,
    isFreeformPositioned: (element) => !!element.freeform
  }), {
    selection: [freeform, locked],
    canNudge: false
  });
});

test('buildStudioNudgedLayout offsets item positions and preserves parent-relative coordinates', () => {
  const result = nudge.buildStudioNudgedLayout([
    {
      id: 'headline',
      absLeft: 100,
      absTop: 120,
      width: 200,
      height: 80,
      parentLeft: 20,
      parentTop: 30
    }
  ], { dx: 15, dy: -10 }, { width: 1920, height: 1080 });

  assert.deepEqual(result, {
    didChange: true,
    nextItems: [
      {
        id: 'headline',
        absLeft: 100,
        absTop: 120,
        width: 200,
        height: 80,
        parentLeft: 20,
        parentTop: 30,
        nextAbsLeft: 115,
        nextAbsTop: 110,
        nextLeft: 95,
        nextTop: 80
      }
    ]
  });
});

test('applyStudioNudgedLayout applies positions and creates an optional transaction', () => {
  const element = {
    dataset: { editorId: 'node-1' },
    style: { left: '10px', top: '20px' }
  };
  let transactionItems = null;
  const result = nudge.applyStudioNudgedLayout([{
    element,
    startLeft: '10px',
    startTop: '20px',
    nextLeft: 120,
    nextTop: 80
  }], {
    createPositionTransaction(items) {
      transactionItems = items;
      return { type: 'position' };
    },
    getElementId(target) {
      return target.dataset.editorId;
    }
  });

  assert.equal(result.didApply, true);
  assert.deepEqual(element.style, { left: '120px', top: '80px' });
  assert.equal(transactionItems[0].element, element);
  assert.deepEqual(result.transaction, { type: 'position' });
});

test('buildStudioNudgeDeltaFromKey resolves fine and coarse arrow-key deltas', () => {
  assert.deepEqual(nudge.buildStudioNudgeDeltaFromKey('ArrowUp'), { dx: 0, dy: -1 });
  assert.deepEqual(nudge.buildStudioNudgeDeltaFromKey('ArrowRight', { shiftKey: true }), { dx: 10, dy: 0 });
  assert.equal(nudge.buildStudioNudgeDeltaFromKey('Enter'), null);
});

test('buildStudioNudgeActionState derives geometry readiness from the resolved slide metrics and layout items', () => {
  const selectionState = {
    selection: [{ id: 'node-1' }],
    canNudge: true
  };
  const slideMetrics = {
    logicalWidth: 1920,
    logicalHeight: 1080
  };

  assert.deepEqual(nudge.buildStudioNudgeActionState(selectionState, {
    doc: { id: 'doc' },
    slide: { id: 'slide-1' },
    slideMetrics,
    buildPositionedLayoutItems(selection, currentSlideMetrics) {
      assert.deepEqual(selection, selectionState.selection);
      assert.equal(currentSlideMetrics, slideMetrics);
      return [{ element: selection[0] }];
    }
  }), {
    doc: { id: 'doc' },
    slide: { id: 'slide-1' },
    slideMetrics,
    slideBounds: {
      width: 1920,
      height: 1080
    },
    nudgeSelectionState: selectionState,
    nudgeLayoutItems: [{ element: selectionState.selection[0] }],
    canResolveNudgeLayout: true,
    canNudge: true
  });

  assert.deepEqual(nudge.buildStudioNudgeActionState(selectionState, {
    doc: null,
    slide: { id: 'slide-1' },
    slideMetrics
  }), {
    doc: null,
    slide: { id: 'slide-1' },
    slideMetrics,
    slideBounds: {
      width: 1920,
      height: 1080
    },
    nudgeSelectionState: selectionState,
    nudgeLayoutItems: [],
    canResolveNudgeLayout: false,
    canNudge: false
  });
});

test('renderStudioNudgeToolbarState applies the nudge readiness to all directional controls', () => {
  const buttons = {
    nudgeSelectionUpBtn: { disabled: true },
    nudgeSelectionLeftBtn: { disabled: true },
    nudgeSelectionRightBtn: { disabled: true },
    nudgeSelectionDownBtn: { disabled: true }
  };

  assert.equal(nudge.renderStudioNudgeToolbarState({
    documentRef: {
      getElementById(id) {
        return buttons[id] || null;
      }
    },
    canNudge: true
  }), true);
  assert.deepEqual(Object.values(buttons).map((button) => button.disabled), [false, false, false, false]);
});

test('buildStudioNudgedLayout clamps to slide bounds and skips no-op edge nudges', () => {
  assert.deepEqual(nudge.buildStudioNudgedLayout([
    {
      id: 'edge',
      absLeft: 0,
      absTop: 0,
      width: 150,
      height: 60,
      parentLeft: 0,
      parentTop: 0
    }
  ], { dx: -5, dy: -5 }, { width: 1920, height: 1080 }), {
    didChange: false,
    nextItems: [
      {
        id: 'edge',
        absLeft: 0,
        absTop: 0,
        width: 150,
        height: 60,
        parentLeft: 0,
        parentTop: 0,
        nextAbsLeft: 0,
        nextAbsTop: 0,
        nextLeft: 0,
        nextTop: 0
      }
    ]
  });

  assert.deepEqual(nudge.buildStudioNudgedLayout([
    {
      id: 'edge',
      absLeft: 1810,
      absTop: 1010,
      width: 150,
      height: 60,
      parentLeft: 10,
      parentTop: 20
    }
  ], { dx: 50, dy: 50 }, { width: 1920, height: 1080 }), {
    didChange: true,
    nextItems: [
      {
        id: 'edge',
        absLeft: 1810,
        absTop: 1010,
        width: 150,
        height: 60,
        parentLeft: 10,
        parentTop: 20,
        nextAbsLeft: 1770,
        nextAbsTop: 1020,
        nextLeft: 1760,
        nextTop: 1000
      }
    ]
  });
});

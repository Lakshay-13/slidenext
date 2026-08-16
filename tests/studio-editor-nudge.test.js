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

test('buildStudioNudgeSelectionState excludes hidden elements from movement eligibility', () => {
  const visible = { id: 'visible', isConnected: true, freeform: true };
  const hidden = { id: 'hidden', isConnected: true, freeform: true };

  assert.deepEqual(nudge.buildStudioNudgeSelectionState([visible, hidden], {
    isHidden: (element) => element === hidden,
    isLocked: () => false,
    isFreeformPositioned: (element) => !!element.freeform
  }), {
    selection: [visible],
    canNudge: true
  });
});

test('buildStudioNudgeSelectionState fails closed when canonical readers throw', () => {
  const hiddenReaderError = { id: 'hidden-reader-error', isConnected: true };
  const lockedReaderError = { id: 'locked-reader-error', isConnected: true };

  assert.deepEqual(nudge.buildStudioNudgeSelectionState([hiddenReaderError], {
    isHidden: () => {
      throw new Error('stale hidden state');
    },
    isLocked: () => false,
    isFreeformPositioned: () => true
  }), {
    selection: [],
    canNudge: false
  });

  assert.deepEqual(nudge.buildStudioNudgeSelectionState([lockedReaderError], {
    isHidden: () => false,
    isLocked: () => {
      throw new Error('stale locked state');
    },
    isFreeformPositioned: () => true
  }), {
    selection: [lockedReaderError],
    canNudge: false
  });
});

test('buildStudioNudgedLayout clamps a multi-selection as one group', () => {
  const result = nudge.buildStudioNudgedLayout([
    {
      id: 'first',
      absLeft: 100,
      absTop: 40,
      width: 100,
      height: 50,
      parentLeft: 0,
      parentTop: 0
    },
    {
      id: 'second',
      absLeft: 300,
      absTop: 40,
      width: 100,
      height: 50,
      parentLeft: 0,
      parentTop: 0
    }
  ], { dx: 200, dy: 10 }, { width: 500, height: 200 });

  assert.deepEqual(result.nextItems.map((item) => ({
    id: item.id,
    nextAbsLeft: item.nextAbsLeft,
    nextTop: item.nextTop
  })), [
    { id: 'first', nextAbsLeft: 200, nextTop: 50 },
    { id: 'second', nextAbsLeft: 400, nextTop: 50 }
  ]);
  assert.equal(result.didChange, true);
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

test('applyStudioNudgedLayout preserves missing coordinates', () => {
  const first = { style: { left: '10px', top: '20px' } };
  const second = { style: { left: '30px', top: '40px' } };

  const result = nudge.applyStudioNudgedLayout([
    { element: first, nextLeft: 120 },
    { element: second, nextLeft: 'invalid', nextTop: undefined }
  ]);

  assert.equal(result.didApply, true);
  assert.deepEqual(first.style, { left: '120px', top: '20px' });
  assert.deepEqual(second.style, { left: '30px', top: '40px' });
});

test('buildStudioNudgeDeltaFromKey resolves fine and coarse arrow-key deltas', () => {
  assert.deepEqual(nudge.buildStudioNudgeDeltaFromKey('ArrowUp'), { dx: 0, dy: -1 });
  assert.deepEqual(nudge.buildStudioNudgeDeltaFromKey('ArrowRight', { shiftKey: true }), { dx: 10, dy: 0 });
  assert.equal(nudge.buildStudioNudgeDeltaFromKey('Enter'), null);
});

test('buildStudioNudgeDeltaFromKey falls back for non-positive custom steps', () => {
  assert.deepEqual(nudge.buildStudioNudgeDeltaFromKey('ArrowRight', { fineStepPx: 0 }), { dx: 1, dy: 0 });
  assert.deepEqual(nudge.buildStudioNudgeDeltaFromKey('ArrowDown', {
    shiftKey: true,
    coarseStepPx: -5
  }), { dx: 0, dy: 10 });
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

test('createStudioNudgeActionStateBuilder resolves editor geometry through shared callbacks', () => {
  const doc = { id: 'doc' };
  const slide = { id: 'slide-1' };
  const selectionState = { selection: [{ id: 'node-1' }], canNudge: true };
  const slideMetrics = { logicalWidth: 1920, logicalHeight: 1080 };
  const layoutItems = [{ element: selectionState.selection[0] }];
  const calls = [];
  const buildActionState = nudge.createStudioNudgeActionStateBuilder({
    getDocument() {
      calls.push('document');
      return doc;
    },
    getActiveSlide(currentDoc) {
      calls.push(['active-slide', currentDoc]);
      return slide;
    },
    getNudgeSelectionState(elements, currentDoc) {
      calls.push(['selection', elements, currentDoc]);
      return selectionState;
    },
    getSlideMetrics(currentSlide) {
      calls.push(['metrics', currentSlide]);
      return slideMetrics;
    },
    buildPositionedLayoutItems(selection, currentMetrics) {
      calls.push(['layout', selection, currentMetrics]);
      return layoutItems;
    }
  });

  const result = buildActionState();

  assert.equal(result.doc, doc);
  assert.equal(result.slide, slide);
  assert.equal(result.slideMetrics, slideMetrics);
  assert.equal(result.nudgeLayoutItems, layoutItems);
  assert.equal(result.canNudge, true);
  assert.deepEqual(calls, [
    'document',
    ['active-slide', doc],
    ['selection', undefined, doc],
    ['metrics', slide],
    ['layout', selectionState.selection, slideMetrics]
  ]);
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

test('syncStudioNudgeToolbarState builds and renders directional controls in one shared operation', () => {
  const buttons = {
    nudgeSelectionUpBtn: { disabled: true },
    nudgeSelectionLeftBtn: { disabled: true },
    nudgeSelectionRightBtn: { disabled: true },
    nudgeSelectionDownBtn: { disabled: true }
  };

  assert.equal(nudge.syncStudioNudgeToolbarState({
    documentRef: {
      getElementById(id) {
        return buttons[id] || null;
      }
    },
    canNudge: true
  }), true);
  assert.deepEqual(Object.values(buttons).map((button) => button.disabled), [false, false, false, false]);
});

test('createStudioNudgeToolbarStateSync resolves live action state through callbacks', () => {
  const doc = { id: 'iframe-doc' };
  const buttons = {
    nudgeSelectionUpBtn: { disabled: true },
    nudgeSelectionLeftBtn: { disabled: true },
    nudgeSelectionRightBtn: { disabled: true },
    nudgeSelectionDownBtn: { disabled: true }
  };
  const calls = [];
  const syncToolbar = nudge.createStudioNudgeToolbarStateSync({
    getDocument() {
      calls.push('document');
      return doc;
    },
    getActionState(currentDoc) {
      calls.push(['action-state', currentDoc]);
      return { canNudge: true };
    },
    getDocumentRef() {
      calls.push('document-ref');
      return {
        getElementById(id) {
          return buttons[id] || null;
        }
      };
    }
  });

  assert.equal(syncToolbar(), true);
  assert.deepEqual(Object.values(buttons).map((button) => button.disabled), [false, false, false, false]);
  assert.deepEqual(calls, [
    'document',
    ['action-state', doc],
    'document-ref'
  ]);
});

test('createStudioNudgeToolbarStateSync fails closed when action-state resolution throws', () => {
  const syncToolbar = nudge.createStudioNudgeToolbarStateSync({
    getActionState() {
      throw new Error('action state unavailable');
    }
  });

  assert.equal(syncToolbar(), false);
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

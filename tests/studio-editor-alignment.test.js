const test = require('node:test');
const assert = require('node:assert/strict');

const alignment = require('../shared/studio-editor-alignment.js');

function buildItems() {
  return [
    {
      id: 'first',
      absLeft: 100,
      absTop: 120,
      width: 80,
      height: 40,
      parentLeft: 20,
      parentTop: 30
    },
    {
      id: 'second',
      absLeft: 260,
      absTop: 220,
      width: 120,
      height: 60,
      parentLeft: 40,
      parentTop: 50
    }
  ];
}

test('getStudioAlignmentSelection filters locked items and requires two unlocked items to align', () => {
  const first = { element: { id: 'first', locked: false } };
  const second = { element: { id: 'second', locked: true } };
  const third = { element: { id: 'third', locked: false } };

  assert.deepEqual(alignment.getStudioAlignmentSelection([first, second, third], {
    isLocked: (element) => element.locked
  }), [first, third]);
  assert.deepEqual(alignment.buildStudioAlignmentActionState([first, second, third], {
    isLocked: (element) => element.locked
  }), {
    selection: [first, third],
    canAlign: true
  });
  assert.equal(alignment.buildStudioAlignmentActionState([first, second], {
    isLocked: (element) => element.locked
  }).canAlign, false);
});

test('buildStudioAlignedLayout aligns horizontal edges and preserves parent-relative positions', () => {
  assert.deepEqual(alignment.buildStudioAlignedLayout(buildItems(), 'right'), {
    didChange: true,
    nextItems: [
      {
        ...buildItems()[0],
        nextAbsLeft: 300,
        nextAbsTop: 120,
        nextLeft: 280,
        nextTop: 90
      },
      {
        ...buildItems()[1],
        nextAbsLeft: 260,
        nextAbsTop: 220,
        nextLeft: 220,
        nextTop: 170
      }
    ]
  });
});

test('buildStudioAlignedLayout aligns vertical centers and keeps unrelated axes unchanged', () => {
  assert.deepEqual(alignment.buildStudioAlignedLayout(buildItems(), 'middle'), {
    didChange: true,
    nextItems: [
      {
        ...buildItems()[0],
        nextAbsLeft: 100,
        nextAbsTop: 180,
        nextLeft: 80,
        nextTop: 150
      },
      {
        ...buildItems()[1],
        nextAbsLeft: 260,
        nextAbsTop: 170,
        nextLeft: 220,
        nextTop: 120
      }
    ]
  });
});

test('buildStudioAlignedLayout returns a no-op for unsupported actions or incomplete geometry', () => {
  const items = buildItems();
  assert.deepEqual(alignment.buildStudioAlignedLayout(items, 'distribute'), {
    didChange: false,
    nextItems: items
  });
  assert.deepEqual(alignment.buildStudioAlignedLayout([items[0], { id: 'invalid' }], 'left'), {
    didChange: false,
    nextItems: [items[0], { id: 'invalid' }]
  });
});

test('buildStudioDistributedLayout equalizes horizontal gaps while preserving visual order', () => {
  const items = [
    { id: 'middle', absLeft: 260, absTop: 40, width: 40, height: 20, parentLeft: 10, parentTop: 10 },
    { id: 'last', absLeft: 500, absTop: 80, width: 60, height: 30, parentLeft: 20, parentTop: 20 },
    { id: 'first', absLeft: 100, absTop: 120, width: 80, height: 40, parentLeft: 30, parentTop: 30 }
  ];

  const result = alignment.buildStudioDistributedLayout(items, 'horizontal');
  assert.equal(result.didChange, true);
  const byId = Object.fromEntries(result.nextItems.map((item) => [item.id, item]));
  assert.deepEqual({
    first: [byId.first.nextAbsLeft, byId.first.nextLeft],
    middle: [byId.middle.nextAbsLeft, byId.middle.nextLeft],
    last: [byId.last.nextAbsLeft, byId.last.nextLeft]
  }, {
    first: [100, 70],
    middle: [320, 310],
    last: [500, 480]
  });
});

test('buildStudioDistributedLayout equalizes vertical gaps and requires at least three items', () => {
  const items = [
    { id: 'first', absLeft: 40, absTop: 100, width: 20, height: 40, parentLeft: 10, parentTop: 5 },
    { id: 'middle', absLeft: 80, absTop: 260, width: 30, height: 20, parentLeft: 20, parentTop: 15 },
    { id: 'last', absLeft: 120, absTop: 500, width: 40, height: 60, parentLeft: 30, parentTop: 25 }
  ];

  const result = alignment.buildStudioDistributedLayout(items, 'vertical');
  assert.equal(result.didChange, true);
  assert.deepEqual(result.nextItems.map((item) => [item.id, item.nextAbsTop, item.nextTop]), [
    ['first', 100, 95],
    ['middle', 310, 295],
    ['last', 500, 475]
  ]);
  assert.deepEqual(alignment.buildStudioDistributedLayout(items.slice(0, 2), 'vertical'), {
    didChange: false,
    nextItems: items.slice(0, 2)
  });
});

test('renderStudioAlignmentToolbarState separates alignment and distribution readiness', () => {
  const ids = [
    'alignSelectionLeftBtn',
    'alignSelectionCenterBtn',
    'alignSelectionRightBtn',
    'alignSelectionTopBtn',
    'alignSelectionMiddleBtn',
    'alignSelectionBottomBtn',
    'distributeSelectionHorizontalBtn',
    'distributeSelectionVerticalBtn'
  ];
  const buttons = Object.fromEntries(ids.map((id) => [id, { disabled: true }]));

  assert.equal(alignment.renderStudioAlignmentToolbarState({
    documentRef: {
      getElementById(id) {
        return buttons[id] || null;
      }
    },
    canAlign: true,
    selectionCount: 3
  }), true);
  assert.deepEqual(Object.values(buttons).map((button) => button.disabled), ids.map(() => false));
});

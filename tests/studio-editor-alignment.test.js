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

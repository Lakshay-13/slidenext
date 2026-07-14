const test = require('node:test');
const assert = require('node:assert/strict');

const group = require('../shared/studio-editor-group.js');

function buildItems() {
  return [
    {
      id: 'first',
      element: { id: 'first', locked: false, freeform: true },
      absLeft: 100,
      absTop: 120,
      width: 80,
      height: 40,
      parentLeft: 0,
      parentTop: 0
    },
    {
      id: 'second',
      element: { id: 'second', locked: false, freeform: true },
      absLeft: 260,
      absTop: 220,
      width: 120,
      height: 60,
      parentLeft: 0,
      parentTop: 0
    }
  ];
}

test('getStudioGroupableSelection excludes locked and flow-positioned items', () => {
  const items = buildItems();
  const locked = { element: { locked: true, freeform: true } };
  const flow = { element: { locked: false, freeform: false } };

  assert.deepEqual(group.getStudioGroupableSelection([...items, locked, flow], {
    isLocked: (element) => element.locked,
    isFreeformPositioned: (element) => element.freeform
  }), items);
});

test('buildStudioGroupPlan computes a group bounds and child-relative positions', () => {
  const items = buildItems();
  assert.deepEqual(group.buildStudioGroupPlan(items, {
    isFreeformPositioned: (element) => element.freeform
  }), {
    canGroup: true,
    selection: items,
    bounds: {
      left: 100,
      top: 120,
      width: 280,
      height: 160
    },
    nextItems: [
      {
        ...items[0],
        nextAbsLeft: 100,
        nextAbsTop: 120,
        nextLeft: 0,
        nextTop: 0
      },
      {
        ...items[1],
        nextAbsLeft: 260,
        nextAbsTop: 220,
        nextLeft: 160,
        nextTop: 100
      }
    ]
  });
});

test('buildStudioGroupPlan rejects insufficient, invalid, or ineligible selections', () => {
  const items = buildItems();
  assert.equal(group.buildStudioGroupPlan(items.slice(0, 1)).canGroup, false);
  assert.equal(group.buildStudioGroupPlan([{ ...items[0], width: NaN }, items[1]]).canGroup, false);
  assert.equal(group.buildStudioGroupPlan(items, {
    isFreeformPositioned: () => false
  }).canGroup, false);
});

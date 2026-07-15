const test = require('node:test');
const assert = require('node:assert/strict');

const group = require('../shared/studio-editor-group.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');

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

test('buildStudioUngroupedLayout restores absolute positions from group-relative coordinates', () => {
  assert.deepEqual(group.buildStudioUngroupedLayout({ left: 100, top: 120 }, [
    { id: 'first', relativeLeft: 0, relativeTop: 0, parentLeft: 0, parentTop: 0 },
    { id: 'second', relativeLeft: 160, relativeTop: 100, parentLeft: 20, parentTop: 30 }
  ]), {
    canUngroup: true,
    nextItems: [
      {
        id: 'first',
        relativeLeft: 0,
        relativeTop: 0,
        parentLeft: 0,
        parentTop: 0,
        nextAbsLeft: 100,
        nextAbsTop: 120,
        nextLeft: 100,
        nextTop: 120
      },
      {
        id: 'second',
        relativeLeft: 160,
        relativeTop: 100,
        parentLeft: 20,
        parentTop: 30,
        nextAbsLeft: 260,
        nextAbsTop: 220,
        nextLeft: 240,
        nextTop: 190
      }
    ]
  });
});

test('renderStudioGroupToolbarState applies group and ungroup readiness', () => {
  const buttons = {
    groupSelectionBtn: { disabled: true },
    ungroupSelectionBtn: { disabled: true }
  };

  assert.equal(group.renderStudioGroupToolbarState({
    documentRef: {
      getElementById(id) {
        return buttons[id] || null;
      }
    },
    canGroup: true,
    canUngroup: false
  }), true);
  assert.equal(buttons.groupSelectionBtn.disabled, false);
  assert.equal(buttons.ungroupSelectionBtn.disabled, true);
});

test('syncStudioGroupToolbarState builds and renders group controls in one shared operation', () => {
  const buttons = {
    groupSelectionBtn: { disabled: true },
    ungroupSelectionBtn: { disabled: true }
  };

  assert.equal(group.syncStudioGroupToolbarState({
    documentRef: {
      getElementById(id) {
        return buttons[id] || null;
      }
    },
    canGroup: true,
    canUngroup: false
  }), true);
  assert.equal(buttons.groupSelectionBtn.disabled, false);
  assert.equal(buttons.ungroupSelectionBtn.disabled, true);
});

test('applyStudioGroupMutation wraps ordered children and captures the parent markup transaction', () => {
  const first = { style: {}, parentElement: null };
  const second = { style: {}, parentElement: null };
  const groupChildren = [];
  const groupNode = {
    style: {},
    setAttribute(name, value) {
      this[name] = value;
    },
    appendChild(child) {
      groupChildren.push(child);
      child.parentElement = this;
      return child;
    }
  };
  const parent = {
    dataset: { editorId: 'parent-1' },
    innerHTML: '<div data-editor-id="first"></div><div data-editor-id="second"></div>',
    insertBefore(groupNode, firstChild) {
      assert.equal(firstChild, first);
      this.innerHTML = '<div data-editor-id="group-1"></div>';
      groupNode.parentElement = this;
      return groupNode;
    },
    appendChild(child) {
      child.parentElement = this;
      return child;
    }
  };
  first.parentElement = parent;
  second.parentElement = parent;

  const result = group.applyStudioGroupMutation({
    documentRef: {
      createElement() {
        return groupNode;
      }
    },
    parent,
    parentBounds: { left: 0, top: 0 },
    orderedSelection: [first, second],
    groupPlan: {
      bounds: { left: 100, top: 120, width: 280, height: 160 },
      nextItems: [
        { element: first, nextLeft: 0, nextTop: 0 },
        { element: second, nextLeft: 160, nextTop: 100 }
      ]
    },
    getElementId(element) {
      return element.dataset && element.dataset.editorId;
    },
    assignElementId(element) {
      element.editorId = 'group-1';
    },
    prepareGroup() {},
    createMarkupTransactionCapture(items, options) {
      return studioTransaction.createStudioMarkupTransactionCapture(items, options);
    }
  });

  assert.equal(result.didApply, true);
  assert.equal(result.group, groupNode);
  assert.deepEqual(groupNode.style, {
    position: 'absolute',
    left: '100px',
    top: '120px',
    width: '280px',
    height: '160px',
    overflow: 'visible',
    boxSizing: 'border-box'
  });
  assert.equal(groupNode['data-editor-group'], 'true');
  assert.equal(first.parentElement, groupNode);
  assert.equal(second.parentElement, groupNode);
  assert.deepEqual(result.transaction, {
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [{
      type: 'markup',
      elementId: 'parent-1',
      before: '<div data-editor-id="first"></div><div data-editor-id="second"></div>',
      after: '<div data-editor-id="group-1"></div>'
    }]
  });
});

test('applyStudioUngroupMutation restores child positions and captures the parent markup transaction', () => {
  const child = {
    style: {},
    getBoundingClientRect() {
      return { left: 110, top: 135, right: 190, bottom: 175 };
    }
  };
  const parent = {
    dataset: { editorId: 'parent-2' },
    innerHTML: '<div data-editor-id="group-1"><div data-editor-id="child-1"></div></div>',
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 500, bottom: 400 };
    },
    insertBefore(element) {
      element.parentElement = this;
      this.innerHTML = '<div data-editor-id="child-1"></div>';
      return element;
    }
  };
  const groupNode = {
    children: [child],
    parentElement: parent,
    getBoundingClientRect() {
      return { left: 100, top: 120, right: 380, bottom: 280 };
    },
    remove() {
      this.removed = true;
      parent.innerHTML = '<div data-editor-id="child-1"></div>';
    }
  };

  const result = group.applyStudioUngroupMutation({
    groups: [groupNode],
    slideMetrics: { scaleX: 1 },
    getRectOnSlide: (rect) => rect,
    getElementId(element) {
      return element.dataset && element.dataset.editorId;
    },
    createMarkupTransactionCapture(items, options) {
      return studioTransaction.createStudioMarkupTransactionCapture(items, options);
    }
  });

  assert.equal(result.didApply, true);
  assert.equal(result.restoredElements.length, 1);
  assert.equal(result.restoredElements[0], child);
  assert.deepEqual(child.style, {
    position: 'absolute',
    margin: '0',
    left: '110px',
    top: '135px'
  });
  assert.equal(child.parentElement, parent);
  assert.equal(groupNode.removed, true);
  assert.deepEqual(result.transaction, {
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [{
      type: 'markup',
      elementId: 'parent-2',
      before: '<div data-editor-id="group-1"><div data-editor-id="child-1"></div></div>',
      after: '<div data-editor-id="child-1"></div>'
    }]
  });
});

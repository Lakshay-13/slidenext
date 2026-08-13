const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const group = require('../shared/studio-editor-group.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('editor forwards the group and ungroup documents into the selection reader', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    source,
    /const studioEditorGroupStateController =[\s\S]+?createStudioEditorGroupStateController\(\{[\s\S]+?getDocument: \(\) => getIframeDoc\(\),[\s\S]+?getSelectedElements: \(sourceDoc\) => getStudioSelectedElements\(sourceDoc\),/
  );
  assert.match(
    source,
    /studioEditorGroupStateController\.buildActionState\(doc\)/
  );
  assert.match(
    source,
    /const studioEditorUngroupStateController =[\s\S]+?createStudioEditorUngroupStateController\(\{[\s\S]+?getDocument: \(\) => getIframeDoc\(\),[\s\S]+?getSelectedElements: \(sourceDoc\) => getStudioSelectedElements\(sourceDoc\),/
  );
  assert.match(
    source,
    /studioEditorUngroupStateController\.buildActionState\(doc\)/
  );
});
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
  assert.equal(group.buildStudioGroupPlan(items).canGroup, false);
  assert.equal(group.buildStudioGroupPlan(items, {
    isFreeformPositioned: () => false
  }).canGroup, false);
});

test('buildStudioGroupSelectionActionState resolves same-parent geometry before enabling grouping', () => {
  const doc = { id: 'doc' };
  const slide = { id: 'slide' };
  const parent = { id: 'parent' };
  const first = { id: 'first', parentElement: parent };
  const second = { id: 'second', parentElement: parent };
  const selection = [first, second];
  const layoutItems = [
    { element: first, absLeft: 10, absTop: 20, width: 40, height: 30, parentLeft: 0, parentTop: 0 },
    { element: second, absLeft: 80, absTop: 60, width: 50, height: 20, parentLeft: 0, parentTop: 0 }
  ];

  const result = group.buildStudioGroupSelectionActionState(selection, {
    doc,
    getActiveSlide(currentDoc) {
      assert.equal(currentDoc, doc);
      return slide;
    },
    getLiveSelectedElements(elements, currentDoc) {
      assert.equal(elements, selection);
      assert.equal(currentDoc, doc);
      return selection;
    },
    getSlideMetrics(currentSlide) {
      assert.equal(currentSlide, slide);
      return { logicalWidth: 1920, logicalHeight: 1080 };
    },
    buildPositionedLayoutItems(elements, options) {
      assert.equal(elements, selection);
      assert.equal(options.slideMetrics.logicalWidth, 1920);
      return layoutItems;
    },
    getClosestPositionedAncestor(element) {
      return element ? parent : null;
    },
    isFreeformPositioned() {
      return true;
    }
  });

  assert.equal(result.slide, slide);
  assert.equal(result.parent, parent);
  assert.equal(result.layoutItems, layoutItems);
  assert.equal(result.canGroup, true);
  assert.equal(result.groupPlan.canGroup, true);
});

test('createStudioGroupSelectionActionStateBuilder resolves editor callbacks through shared state', () => {
  const doc = { id: 'doc' };
  const slide = { id: 'slide' };
  const parent = { id: 'parent' };
  const first = { id: 'first', parentElement: parent };
  const second = { id: 'second', parentElement: parent };
  const selection = [first, second];
  const layoutItems = [
    { element: first, absLeft: 10, absTop: 20, width: 40, height: 30, parentLeft: 0, parentTop: 0 },
    { element: second, absLeft: 80, absTop: 60, width: 50, height: 20, parentLeft: 0, parentTop: 0 }
  ];
  const buildActionState = group.createStudioGroupSelectionActionStateBuilder({
    getDocument: () => doc,
    getSelectedElements: (currentDoc) => {
      assert.equal(currentDoc, doc);
      return selection;
    },
    getActiveSlide: () => slide,
    getLiveSelectedElements: (elements) => elements,
    getSlideMetrics: () => ({ logicalWidth: 1920, logicalHeight: 1080 }),
    buildPositionedLayoutItems: () => layoutItems,
    getClosestPositionedAncestor: () => parent,
    isFreeformPositioned: () => true
  });

  const result = buildActionState();

  assert.equal(result.slide, slide);
  assert.equal(result.parent, parent);
  assert.equal(result.layoutItems, layoutItems);
  assert.equal(result.canGroup, true);
  assert.equal(result.groupPlan.canGroup, true);
});

test('createStudioGroupSelectionActionStateBuilder resolves document-aware freeform state', () => {
  const doc = { id: 'doc' };
  const slide = { id: 'slide' };
  const parent = { id: 'parent' };
  const first = { id: 'first', parentElement: parent };
  const second = { id: 'second', parentElement: parent };
  const layoutItems = [
    { element: first, absLeft: 10, absTop: 20, width: 40, height: 30, parentLeft: 0, parentTop: 0 },
    { element: second, absLeft: 80, absTop: 60, width: 50, height: 20, parentLeft: 0, parentTop: 0 }
  ];
  let readerDocument = null;
  const buildActionState = group.createStudioGroupSelectionActionStateBuilder({
    getDocument: () => doc,
    getSelectedElements: (currentDoc) => {
      assert.equal(currentDoc, doc);
      return [first, second];
    },
    getActiveSlide: () => slide,
    getLiveSelectedElements: (elements) => elements,
    getSlideMetrics: () => ({ logicalWidth: 1920, logicalHeight: 1080 }),
    buildPositionedLayoutItems: () => layoutItems,
    getClosestPositionedAncestor: () => parent,
    getFreeformPositioned(currentDoc) {
      readerDocument = currentDoc;
      return (element) => element === first;
    },
    isFreeformPositioned: () => true
  });

  const result = buildActionState();

  assert.equal(readerDocument, doc);
  assert.equal(result.canGroup, false);
  assert.equal(result.groupPlan.selection.length, 1);
});

test('buildStudioUngroupSelectionActionState keeps only valid selected group wrappers', () => {
  const doc = { id: 'doc' };
  const slide = { id: 'slide' };
  const parent = { id: 'parent' };
  const groupNode = { id: 'group', parentElement: parent, children: [{}] };
  const invalidGroup = { id: 'invalid', parentElement: parent, children: [] };
  const selection = [groupNode, invalidGroup];

  const result = group.buildStudioUngroupSelectionActionState(selection, {
    doc,
    getActiveSlide(currentDoc) {
      assert.equal(currentDoc, doc);
      return slide;
    },
    getLiveSelectedElements(elements, currentDoc) {
      assert.equal(elements, selection);
      assert.equal(currentDoc, doc);
      return selection;
    },
    isEditorGroupElement(element) {
      return element === groupNode || element === invalidGroup;
    }
  });

  assert.equal(result.slide, slide);
  assert.deepEqual(result.selection, selection);
  assert.deepEqual(result.groups, [groupNode]);
  assert.equal(result.canUngroup, false);
});

test('createStudioUngroupSelectionActionStateBuilder resolves editor callbacks through shared state', () => {
  const doc = { id: 'doc' };
  const slide = { id: 'slide' };
  const parent = { id: 'parent' };
  const groupNode = { id: 'group', parentElement: parent, children: [{}] };
  const selection = [groupNode];
  const buildActionState = group.createStudioUngroupSelectionActionStateBuilder({
    getDocument: () => doc,
    getSelectedElements: (currentDoc) => {
      assert.equal(currentDoc, doc);
      return selection;
    },
    getActiveSlide: () => slide,
    getLiveSelectedElements: (elements) => elements,
    isEditorGroupElement: (element) => element === groupNode
  });

  const result = buildActionState();

  assert.equal(result.slide, slide);
  assert.deepEqual(result.selection, selection);
  assert.deepEqual(result.groups, [groupNode]);
  assert.equal(result.canUngroup, true);
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

test('createStudioGroupToolbarStateSync resolves group and ungroup readiness through callbacks', () => {
  const doc = { id: 'iframe-doc' };
  const buttons = {
    groupSelectionBtn: { disabled: true },
    ungroupSelectionBtn: { disabled: true }
  };
  const calls = [];
  const syncToolbar = group.createStudioGroupToolbarStateSync({
    getDocument() {
      calls.push('document');
      return doc;
    },
    getGroupActionState(currentDoc) {
      calls.push(['group-state', currentDoc]);
      return { canGroup: true };
    },
    getUngroupActionState(currentDoc) {
      calls.push(['ungroup-state', currentDoc]);
      return { canUngroup: true };
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
  assert.equal(buttons.groupSelectionBtn.disabled, false);
  assert.equal(buttons.ungroupSelectionBtn.disabled, false);
  assert.deepEqual(calls, [
    'document',
    ['group-state', doc],
    ['ungroup-state', doc],
    'document-ref'
  ]);
});

test('createStudioGroupToolbarStateSync fails closed when a readiness resolver throws', () => {
  const syncToolbar = group.createStudioGroupToolbarStateSync({
    getGroupActionState() {
      throw new Error('group state unavailable');
    }
  });

  assert.equal(syncToolbar(), false);
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
  assert.deepEqual(result.restoredGroups, [{
    group: groupNode,
    parent,
    restoredElements: [child]
  }]);
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

test('applyStudioUngroupMutation prefers scoped presence transactions for serializable wrappers', () => {
  const child = {
    dataset: { editorId: 'child-1' },
    style: {},
    outerHTML: '<div data-editor-id="child-1">Child</div>',
    getBoundingClientRect() {
      return { left: 110, top: 135, right: 190, bottom: 175 };
    }
  };
  const parent = {
    dataset: { editorId: 'parent-2' },
    children: [],
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 500, bottom: 400 };
    },
    insertBefore(element, beforeNode) {
      const index = this.children.indexOf(beforeNode);
      this.children.splice(index < 0 ? this.children.length : index, 0, element);
      element.parentElement = this;
    }
  };
  const groupNode = {
    dataset: { editorId: 'group-1' },
    children: [child],
    parentElement: parent,
    outerHTML: '<div data-editor-id="group-1"><div data-editor-id="child-1">Child</div></div>',
    getBoundingClientRect() {
      return { left: 100, top: 120, right: 380, bottom: 280 };
    },
    remove() {
      const index = parent.children.indexOf(this);
      if (index >= 0) parent.children.splice(index, 1);
      this.parentElement = null;
    }
  };
  child.parentElement = groupNode;
  parent.children = [groupNode];
  let markupCaptureCalls = 0;

  const result = group.applyStudioUngroupMutation({
    groups: [groupNode],
    slideMetrics: { scaleX: 1 },
    getRectOnSlide: (rect) => rect,
    getElementId: (element) => element && element.dataset && element.dataset.editorId,
    createMarkupTransactionCapture() {
      markupCaptureCalls += 1;
      return null;
    },
    createElementPresenceTransaction: studioTransaction.createStudioElementPresenceTransaction
  });

  assert.equal(result.didApply, true);
  assert.deepEqual(result.transaction.operations, [
    {
      type: 'element-presence',
      elementId: 'group-1',
      parentId: 'parent-2',
      before: {
        exists: true,
        index: 0,
        markup: '<div data-editor-id="group-1"><div data-editor-id="child-1">Child</div></div>'
      },
      after: { exists: false, index: 0, markup: '' }
    },
    {
      type: 'element-presence',
      elementId: 'child-1',
      parentId: 'parent-2',
      before: { exists: false, index: 0, markup: '' },
      after: {
        exists: true,
        index: 0,
        markup: '<div data-editor-id="child-1">Child</div>'
      }
    }
  ]);
  assert.equal(markupCaptureCalls, 0);
});

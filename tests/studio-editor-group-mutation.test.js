const test = require('node:test');
const assert = require('node:assert/strict');

const groupMutation = require('../shared/studio-editor-group-mutation.js');
const studioGroup = require('../shared/studio-editor-group.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');

test('applyStudioGroupMutationWithTransaction delegates group and markup transaction dependencies', () => {
  let delegated = null;
  const options = {
    documentRef: {},
    parent: {},
    groupPlan: { bounds: {}, nextItems: [] },
    parentBounds: {},
    orderedSelection: [],
    groupApi: {
      applyStudioGroupMutation(nextOptions) {
        delegated = nextOptions;
        return { didApply: true, group: { id: 'group-1' }, transaction: { id: 'tx-group' } };
      }
    },
    transactionApi: {
      createStudioMarkupTransactionCapture: studioTransaction.createStudioMarkupTransactionCapture
    },
    getElementId: () => 'node-1',
    assignElementId() {},
    prepareGroup() {}
  };

  const result = groupMutation.applyStudioGroupMutationWithTransaction(options);

  assert.deepEqual(result, {
    didApply: true,
    group: { id: 'group-1' },
    transaction: { id: 'tx-group' }
  });
  assert.equal(typeof delegated.createMarkupTransactionCapture, 'function');
  assert.equal(delegated.createElementPresenceTransaction, null);
  assert.equal(typeof delegated.getElementId, 'function');
  assert.equal(typeof delegated.assignElementId, 'function');
  assert.equal(typeof delegated.prepareGroup, 'function');
});

test('applyStudioGroupMutationWithTransaction forwards scoped presence transaction dependencies', () => {
  const createStudioElementPresenceTransaction = () => ({ id: 'tx-presence' });
  let delegated = null;
  groupMutation.applyStudioGroupMutationWithTransaction({
    groupApi: {
      applyStudioGroupMutation(options) {
        delegated = options;
        return { didApply: true, group: {}, transaction: null };
      }
    },
    transactionApi: { createStudioElementPresenceTransaction }
  });

  assert.equal(delegated.createElementPresenceTransaction, createStudioElementPresenceTransaction);
});

test('applyStudioGroupMutationWithTransaction preserves the shared group behavior', () => {
  const parent = {
    children: [],
    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
    },
    insertBefore(child) {
      child.parentElement = this;
      this.children.unshift(child);
    }
  };
  const documentRef = {
    createElement() {
      return {
        dataset: {},
        style: {},
        children: [],
        appendChild(child) {
          child.parentElement = this;
          this.children.push(child);
        },
        setAttribute() {}
      };
    }
  };
  const child = { style: {}, parentElement: parent };
  const result = groupMutation.applyStudioGroupMutationWithTransaction({
    documentRef,
    parent,
    groupPlan: {
      bounds: { left: 0, top: 0, width: 10, height: 10 },
      nextItems: [{ element: child, nextLeft: 0, nextTop: 0 }]
    },
    parentBounds: { left: 0, top: 0 },
    orderedSelection: [child],
    groupApi: studioGroup,
    prepareGroup() {}
  });

  assert.equal(result.didApply, true);
  assert.equal(result.group.children[0], child);
  assert.equal(child.parentElement, result.group);
});

test('applyStudioGroupMutation prefers scoped presence transactions for serializable grouping', () => {
  const childOne = {
    dataset: { editorId: 'child-1' },
    style: {},
    parentElement: null,
    outerHTML: '<div data-editor-id="child-1">One</div>'
  };
  const childTwo = {
    dataset: { editorId: 'child-2' },
    style: {},
    parentElement: null,
    outerHTML: '<div data-editor-id="child-2">Two</div>'
  };
  const parent = {
    dataset: { editorId: 'parent-1' },
    children: [childOne, childTwo],
    insertBefore(child, beforeNode) {
      const currentIndex = this.children.indexOf(child);
      if (currentIndex >= 0) this.children.splice(currentIndex, 1);
      const index = beforeNode ? this.children.indexOf(beforeNode) : this.children.length;
      this.children.splice(index < 0 ? this.children.length : index, 0, child);
      child.parentElement = this;
    },
    appendChild(child) {
      const currentIndex = this.children.indexOf(child);
      if (currentIndex >= 0) this.children.splice(currentIndex, 1);
      this.children.push(child);
      child.parentElement = this;
    }
  };
  childOne.parentElement = parent;
  childTwo.parentElement = parent;
  let markupCaptureCalls = 0;
  const documentRef = {
    createElement() {
      const group = {
        dataset: {},
        style: {},
        children: [],
        appendChild(child) {
          const currentIndex = parent.children.indexOf(child);
          if (currentIndex >= 0) parent.children.splice(currentIndex, 1);
          child.parentElement = this;
          this.children.push(child);
        },
        setAttribute() {},
        get outerHTML() {
          return `<div data-editor-id="${this.dataset.editorId}">${this.children.map((child) => child.outerHTML).join('')}</div>`;
        }
      };
      return group;
    }
  };
  const result = studioGroup.applyStudioGroupMutation({
    documentRef,
    parent,
    groupPlan: {
      bounds: { left: 0, top: 0, width: 100, height: 100 },
      nextItems: [
        { element: childOne, nextLeft: 0, nextTop: 0 },
        { element: childTwo, nextLeft: 20, nextTop: 20 }
      ]
    },
    parentBounds: { left: 0, top: 0 },
    orderedSelection: [childOne, childTwo],
    createMarkupTransactionCapture() {
      markupCaptureCalls += 1;
      return null;
    },
    createElementPresenceTransaction: studioTransaction.createStudioElementPresenceTransaction,
    getElementId(element) {
      return element.dataset.editorId || '';
    },
    assignElementId(element) {
      element.dataset.editorId = 'group-1';
      return 'group-1';
    }
  });

  assert.equal(result.didApply, true);
  assert.deepEqual(result.transaction.operations.map((operation) => operation.type), [
    'element-presence',
    'element-presence',
    'element-presence'
  ]);
  assert.deepEqual(result.transaction.operations[0], {
    type: 'element-presence',
    elementId: 'child-1',
    parentId: 'parent-1',
    before: { exists: true, index: 0, markup: childOne.outerHTML },
    after: { exists: false, index: 0, markup: '' }
  });
  assert.equal(result.transaction.operations[2].elementId, 'group-1');
  assert.equal(result.transaction.operations[2].before.index, 0);
  assert.match(result.transaction.operations[2].after.markup, /child-1/);
  assert.equal(markupCaptureCalls, 0);
});

test('applyStudioGroupMutationWithTransaction fails closed without a shared group adapter', () => {
  assert.deepEqual(
    groupMutation.applyStudioGroupMutationWithTransaction({}),
    { didApply: false, group: null, transaction: null }
  );
});

test('applyStudioUngroupMutationWithTransaction delegates layout and markup transaction dependencies', () => {
  let delegated = null;
  const result = groupMutation.applyStudioUngroupMutationWithTransaction({
    groups: [{ id: 'group-1' }],
    groupApi: {
      buildStudioUngroupedLayout() {
        return { canUngroup: true, nextItems: [] };
      },
      applyStudioUngroupMutation(nextOptions) {
        delegated = nextOptions;
        return { didApply: true, restoredElements: [], restoredGroups: [], transaction: { id: 'tx-ungroup' } };
      }
    },
    transactionApi: {
      createStudioMarkupTransactionCapture: studioTransaction.createStudioMarkupTransactionCapture
    },
    getElementId: () => 'node-1'
  });

  assert.deepEqual(result, {
    didApply: true,
    restoredElements: [],
    restoredGroups: [],
    transaction: { id: 'tx-ungroup' }
  });
  assert.equal(typeof delegated.buildUngroupedLayout, 'function');
  assert.equal(typeof delegated.createMarkupTransactionCapture, 'function');
  assert.equal(delegated.createElementPresenceTransaction, null);
  assert.equal(typeof delegated.getElementId, 'function');
});

test('applyStudioUngroupMutationWithTransaction forwards scoped presence transaction dependencies', () => {
  const createStudioElementPresenceTransaction = () => ({ id: 'tx-presence' });
  let delegated = null;
  groupMutation.applyStudioUngroupMutationWithTransaction({
    groupApi: {
      buildStudioUngroupedLayout() {
        return { canUngroup: true, nextItems: [] };
      },
      applyStudioUngroupMutation(options) {
        delegated = options;
        return { didApply: true, restoredElements: [], restoredGroups: [], transaction: null };
      }
    },
    transactionApi: { createStudioElementPresenceTransaction }
  });

  assert.equal(delegated.createElementPresenceTransaction, createStudioElementPresenceTransaction);
});

test('applyStudioUngroupMutationWithTransaction fails closed without a shared group adapter', () => {
  assert.deepEqual(
    groupMutation.applyStudioUngroupMutationWithTransaction({}),
    { didApply: false, restoredElements: [], restoredGroups: [], transaction: null }
  );
});

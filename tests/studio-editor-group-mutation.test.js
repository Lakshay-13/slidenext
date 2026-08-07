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
  assert.equal(typeof delegated.getElementId, 'function');
  assert.equal(typeof delegated.assignElementId, 'function');
  assert.equal(typeof delegated.prepareGroup, 'function');
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
  assert.equal(typeof delegated.getElementId, 'function');
});

test('applyStudioUngroupMutationWithTransaction fails closed without a shared group adapter', () => {
  assert.deepEqual(
    groupMutation.applyStudioUngroupMutationWithTransaction({}),
    { didApply: false, restoredElements: [], restoredGroups: [], transaction: null }
  );
});

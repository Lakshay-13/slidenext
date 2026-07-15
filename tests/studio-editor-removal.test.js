const test = require('node:test');
const assert = require('node:assert/strict');

const removal = require('../shared/studio-editor-removal.js');
const transactionState = require('../shared/studio-editor-transaction.js');

test('getStudioRemovableSelection ignores disconnected stale selections', () => {
  assert.deepEqual(removal.getStudioRemovableSelection([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ]), [
    { id: 2, isConnected: true }
  ]);
});

test('buildStudioRemovalActionState derives delete availability from live unlocked selections only', () => {
  assert.deepEqual(removal.buildStudioRemovalActionState([
    { id: 1, isConnected: false, locked: false },
    { id: 2, isConnected: true, locked: false }
  ], {
    isLocked: (element) => !!element.locked
  }), {
    selection: [{ id: 2, isConnected: true, locked: false }],
    hasSelection: true,
    canRemove: true
  });

  assert.deepEqual(removal.buildStudioRemovalActionState([
    { id: 1, isConnected: true, locked: true }
  ], {
    isLocked: (element) => !!element.locked
  }), {
    selection: [{ id: 1, isConnected: true, locked: true }],
    hasSelection: true,
    canRemove: false
  });

  assert.deepEqual(removal.buildStudioRemovalActionState([
    { id: 1, isConnected: false, locked: false }
  ], {
    isLocked: (element) => !!element.locked
  }), {
    selection: [],
    hasSelection: false,
    canRemove: false
  });

  assert.deepEqual(removal.buildStudioRemovalActionState([
    { id: 1, isConnected: true, locked: false }
  ], {
    isLocked: (element) => !!element.locked,
    canMutateDeck: () => false
  }), {
    selection: [{ id: 1, isConnected: true, locked: false }],
    hasSelection: true,
    canRemove: false
  });
});

test('buildStudioRemovalToolbarState derives delete button state from the removal action state', () => {
  assert.deepEqual(removal.buildStudioRemovalToolbarState([
    { id: 1, isConnected: true, locked: false }
  ], {
    isLocked: (element) => !!element.locked
  }), {
    selection: [{ id: 1, isConnected: true, locked: false }],
    hasSelection: true,
    canRemove: true,
    buttonStates: {
      removeSelectionBtn: true
    }
  });
});

test('removeStudioElements removes live targets and creates an optional parent markup transaction', () => {
  const parent = {
    dataset: { editorId: 'slide-1' },
    innerHTML: '<div data-editor-id="node-1">A</div>'
  };
  const element = {
    isConnected: true,
    parentElement: parent,
    remove() {
      this.isConnected = false;
      parent.innerHTML = '';
    }
  };
  const result = removal.removeStudioElements([element], {
    createMarkupTransactionCapture: transactionState.createStudioMarkupTransactionCapture,
    getElementId: (target) => target.dataset.editorId
  });

  assert.equal(result.didRemove, true);
  assert.equal(result.removedCount, 1);
  assert.equal(parent.innerHTML, '');
  assert.deepEqual(result.transaction.operations[0], {
    type: 'markup',
    elementId: 'slide-1',
    before: '<div data-editor-id="node-1">A</div>',
    after: ''
  });
});

test('renderStudioRemovalToolbarState applies the delete button state', () => {
  const removeSelectionBtn = { disabled: true };
  assert.equal(removal.renderStudioRemovalToolbarState({
    documentRef: {
      getElementById(id) {
        return id === 'removeSelectionBtn' ? removeSelectionBtn : null;
      }
    },
    actionState: { canRemove: true }
  }), true);
  assert.equal(removeSelectionBtn.disabled, false);
});

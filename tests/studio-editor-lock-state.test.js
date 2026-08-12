const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lockState = require('../shared/studio-editor-lock-state.js');
const transactionState = require('../shared/studio-editor-transaction.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('editor forwards the lock toolbar document into the selection reader', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    source,
    /lockState\.createStudioLockToolbarStateSync\(\{\s+getDocument: \(\) => getIframeDoc\(\),\s+getSelectedElements: \(doc\) => getStudioSelectedElements\(doc\),/
  );
});

test('getStudioLockSelection ignores disconnected stale selections', () => {
  assert.deepEqual(lockState.getStudioLockSelection([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ]), [
    { id: 2, isConnected: true }
  ]);
});

test('buildStudioLockActionState derives button state from live selections only', () => {
  assert.deepEqual(lockState.buildStudioLockActionState([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ], {
    isLocked: () => false
  }), {
    hasSelection: true,
    canToggle: true,
    allLocked: false,
    canRemove: true
  });

  assert.deepEqual(lockState.buildStudioLockActionState([
    { id: 1, isConnected: true }
  ], {
    isLocked: () => true
  }), {
    hasSelection: true,
    canToggle: true,
    allLocked: true,
    canRemove: false
  });

  assert.deepEqual(lockState.buildStudioLockActionState([
    { id: 1, isConnected: false }
  ], {
    isLocked: () => false
  }), {
    hasSelection: false,
    canToggle: false,
    allLocked: false,
    canRemove: false
  });

  assert.deepEqual(lockState.buildStudioLockActionState([
    { id: 1, isConnected: true, locked: true }
  ], {
    isLocked: (element) => !!element.locked,
    canMutateDeck: () => false
  }), {
    hasSelection: true,
    canToggle: false,
    allLocked: false,
    canRemove: false
  });
});

test('buildStudioLockToolbarState derives lock control chrome from the live selection state', () => {
  assert.deepEqual(lockState.buildStudioLockToolbarState([
    { id: 1, isConnected: true, locked: false }
  ], {
    isLocked: (element) => !!element.locked
  }), {
    hasSelection: true,
    canToggle: true,
    allLocked: false,
    canRemove: true,
    iconText: 'lock',
    labelText: 'Lock Selected'
  });

  assert.deepEqual(lockState.buildStudioLockToolbarState([
    { id: 1, isConnected: true, locked: true }
  ], {
    isLocked: (element) => !!element.locked
  }), {
    hasSelection: true,
    canToggle: true,
    allLocked: true,
    canRemove: false,
    iconText: 'lock_open',
    labelText: 'Unlock Selected'
  });
});

test('buildStudioLockMutationPlan derives the next lock toggle from the live selection only', () => {
  const unlocked = { id: 1, isConnected: true, locked: false };
  const locked = { id: 2, isConnected: true, locked: true };

  assert.deepEqual(lockState.buildStudioLockMutationPlan([
    { id: 'stale', isConnected: false, locked: false },
    unlocked
  ], {
    isLocked: (element) => !!element.locked
  }), {
    selection: [unlocked],
    shouldLock: true,
    didChange: true,
    versionLabel: 'Auto: Locked Element'
  });

  assert.deepEqual(lockState.buildStudioLockMutationPlan([locked], {
    isLocked: (element) => !!element.locked
  }), {
    selection: [locked],
    shouldLock: false,
    didChange: true,
    versionLabel: 'Auto: Unlocked Element'
  });

  assert.deepEqual(lockState.buildStudioLockMutationPlan([
    { id: 'stale', isConnected: false, locked: false }
  ], {
    isLocked: (element) => !!element.locked
  }), {
    selection: [],
    shouldLock: false,
    didChange: false,
    versionLabel: ''
  });

  assert.deepEqual(lockState.buildStudioLockMutationPlan([unlocked], {
    isLocked: (element) => !!element.locked,
    canMutateDeck: () => false
  }), {
    selection: [unlocked],
    shouldLock: false,
    didChange: false,
    versionLabel: ''
  });
});

test('renderStudioLockToolbarState applies lock button, icon, and label chrome', () => {
  const nodes = {
    toggleLockSelectionBtn: { disabled: true },
    toggleLockSelectionIcon: { textContent: '' },
    toggleLockSelectionLabel: { textContent: '' }
  };

  assert.equal(lockState.renderStudioLockToolbarState({
    documentRef: {
      getElementById(id) {
        return nodes[id] || null;
      }
    },
    actionState: {
      canToggle: true,
      allLocked: true
    }
  }), true);
  assert.equal(nodes.toggleLockSelectionBtn.disabled, false);
  assert.equal(nodes.toggleLockSelectionIcon.textContent, 'lock_open');
  assert.equal(nodes.toggleLockSelectionLabel.textContent, 'Unlock Selected');
});

test('syncStudioLockToolbarState builds and renders lock controls in one shared operation', () => {
  const button = { disabled: true };
  const icon = { textContent: '' };
  const label = { textContent: '' };
  const element = { isConnected: true, locked: true };

  assert.equal(lockState.syncStudioLockToolbarState({
    documentRef: {
      getElementById(id) {
        return {
          toggleLockSelectionBtn: button,
          toggleLockSelectionIcon: icon,
          toggleLockSelectionLabel: label
        }[id] || null;
      }
    },
    elements: [element],
    isLocked: (target) => !!target.locked,
    canMutateDeck: () => true
  }), true);
  assert.equal(button.disabled, false);
  assert.equal(icon.textContent, 'lock_open');
  assert.equal(label.textContent, 'Unlock Selected');
});

test('createStudioLockToolbarStateSync resolves live selection and slide readiness through callbacks', () => {
  const doc = { id: 'doc' };
  const slide = { id: 'slide' };
  const selectedElements = [{ id: 'node-1', isConnected: true }];
  const nodes = {
    toggleLockSelectionBtn: { disabled: true },
    toggleLockSelectionIcon: { textContent: '' },
    toggleLockSelectionLabel: { textContent: '' }
  };
  const calls = [];
  const syncToolbar = lockState.createStudioLockToolbarStateSync({
    getDocument() {
      calls.push('document');
      return doc;
    },
    getSelectedElements(currentDoc) {
      calls.push('selection');
      assert.equal(currentDoc, doc);
      return selectedElements;
    },
    getActiveSlide(currentDoc) {
      calls.push(['active-slide', currentDoc]);
      return slide;
    },
    getLockedState(currentDoc) {
      calls.push(['locked-state', currentDoc]);
      return () => false;
    },
    getDocumentRef() {
      calls.push('document-ref');
      return {
        getElementById(id) {
          return nodes[id] || null;
        }
      };
    }
  });

  assert.equal(syncToolbar(), true);
  assert.equal(nodes.toggleLockSelectionBtn.disabled, false);
  assert.equal(nodes.toggleLockSelectionIcon.textContent, 'lock');
  assert.equal(nodes.toggleLockSelectionLabel.textContent, 'Lock Selected');
  assert.deepEqual(calls, [
    'document',
    'document-ref',
    'selection',
    ['locked-state', doc],
    ['active-slide', doc]
  ]);
});

test('applyStudioLockMutation applies live lock changes and creates an optional dataset transaction', () => {
  const element = {
    isConnected: true,
    dataset: { editorId: 'node-1' }
  };
  const result = lockState.applyStudioLockMutation([element], true, {
    createDatasetTransaction: transactionState.createStudioDatasetTransaction,
    getElementId: (target) => target.dataset.editorId
  });

  assert.equal(result.didApply, true);
  assert.equal(result.changedCount, 1);
  assert.equal(element.dataset.editorLocked, 'true');
  assert.deepEqual(result.transaction.operations[0], {
    type: 'dataset',
    elementId: 'node-1',
    property: 'editorLocked',
    before: '',
    after: 'true'
  });
});

test('applyStudioLockWithTransaction delegates lock mutation dependencies', () => {
  const selection = [{ id: 'node-1' }];
  const calls = [];
  const result = lockState.applyStudioLockWithTransaction(selection, true, {
    applyStudioLockMutation(...args) {
      calls.push(args);
      return { didApply: true, transaction: { type: 'dataset' } };
    },
    createStudioDatasetTransaction() {},
    isLocked() {},
    setLocked() {},
    getElementId() {}
  });

  assert.deepEqual(result, { didApply: true, transaction: { type: 'dataset' } });
  assert.deepEqual(calls[0].slice(0, 2), [selection, true]);
});

test('applyStudioLockWithTransaction preserves fallback dataset mutation and transaction capture', () => {
  const element = {
    isConnected: true,
    dataset: { editorId: 'node-1' }
  };
  const result = lockState.applyStudioLockWithTransaction([element], true, {
    isLocked: (target) => target.dataset.editorLocked === 'true',
    setLocked: (target, shouldLock) => {
      if (shouldLock) target.dataset.editorLocked = 'true';
    },
    createStudioDatasetTransaction(items) {
      return { items };
    },
    getElementId: (target) => target.dataset.editorId
  });

  assert.equal(result.didApply, true);
  assert.equal(element.dataset.editorLocked, 'true');
  assert.equal(result.transaction.items[0].property, 'editorLocked');
});

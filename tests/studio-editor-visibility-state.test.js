const test = require('node:test');
const assert = require('node:assert/strict');

const visibilityState = require('../shared/studio-editor-visibility-state.js');
const elementState = require('../shared/studio-element-state.js');
const transactionState = require('../shared/studio-editor-transaction.js');

test('getStudioVisibilitySelection ignores disconnected stale selections', () => {
  assert.deepEqual(visibilityState.getStudioVisibilitySelection([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ]), [
    { id: 2, isConnected: true }
  ]);
});

test('buildStudioVisibilityActionState derives visibility button state from live selections only', () => {
  assert.deepEqual(visibilityState.buildStudioVisibilityActionState([
    { id: 1, isConnected: false },
    { id: 2, isConnected: true }
  ], {
    isHidden: () => false
  }), {
    hasSelection: true,
    canToggle: true,
    allHidden: false
  });

  assert.deepEqual(visibilityState.buildStudioVisibilityActionState([
    { id: 1, isConnected: true }
  ], {
    isHidden: () => true
  }), {
    hasSelection: true,
    canToggle: true,
    allHidden: true
  });

  assert.deepEqual(visibilityState.buildStudioVisibilityActionState([
    { id: 1, isConnected: false }
  ], {
    isHidden: () => false
  }), {
    hasSelection: false,
    canToggle: false,
    allHidden: false
  });

  assert.deepEqual(visibilityState.buildStudioVisibilityActionState([
    { id: 1, isConnected: true, hidden: true }
  ], {
    isHidden: (element) => !!element.hidden,
    canMutateDeck: () => false
  }), {
    hasSelection: true,
    canToggle: false,
    allHidden: false
  });
});

test('buildStudioVisibilityToolbarState derives visibility control chrome from the live selection state', () => {
  assert.deepEqual(visibilityState.buildStudioVisibilityToolbarState([
    { id: 1, isConnected: true, hidden: false }
  ], {
    isHidden: (element) => !!element.hidden
  }), {
    hasSelection: true,
    canToggle: true,
    allHidden: false,
    iconText: 'visibility_off',
    labelText: 'Hide Selected'
  });

  assert.deepEqual(visibilityState.buildStudioVisibilityToolbarState([
    { id: 1, isConnected: true, hidden: true }
  ], {
    isHidden: (element) => !!element.hidden
  }), {
    hasSelection: true,
    canToggle: true,
    allHidden: true,
    iconText: 'visibility',
    labelText: 'Show Selected'
  });
});

test('renderStudioVisibilityToolbarState applies visibility button, icon, and label chrome', () => {
  const nodes = {
    toggleVisibilitySelectionBtn: { disabled: true },
    toggleVisibilitySelectionIcon: { textContent: '' },
    toggleVisibilitySelectionLabel: { textContent: '' }
  };

  assert.equal(visibilityState.renderStudioVisibilityToolbarState({
    documentRef: {
      getElementById(id) {
        return nodes[id] || null;
      }
    },
    actionState: {
      canToggle: true,
      allHidden: true
    }
  }), true);
  assert.equal(nodes.toggleVisibilitySelectionBtn.disabled, false);
  assert.equal(nodes.toggleVisibilitySelectionIcon.textContent, 'visibility');
  assert.equal(nodes.toggleVisibilitySelectionLabel.textContent, 'Show Selected');
});

test('syncStudioVisibilityToolbarState builds and renders visibility controls in one shared operation', () => {
  const button = { disabled: true };
  const icon = { textContent: '' };
  const label = { textContent: '' };
  const element = { isConnected: true, hidden: true };

  assert.equal(visibilityState.syncStudioVisibilityToolbarState({
    documentRef: {
      getElementById(id) {
        return {
          toggleVisibilitySelectionBtn: button,
          toggleVisibilitySelectionIcon: icon,
          toggleVisibilitySelectionLabel: label
        }[id] || null;
      }
    },
    elements: [element],
    isHidden: (target) => !!target.hidden,
    canMutateDeck: () => true
  }), true);
  assert.equal(button.disabled, false);
  assert.equal(icon.textContent, 'visibility');
  assert.equal(label.textContent, 'Show Selected');
});

test('createStudioVisibilityToolbarStateSync resolves live selection and slide readiness through callbacks', () => {
  const doc = { id: 'doc' };
  const slide = { id: 'slide' };
  const selectedElements = [{ id: 'node-1', isConnected: true }];
  const nodes = {
    toggleVisibilitySelectionBtn: { disabled: true },
    toggleVisibilitySelectionIcon: { textContent: '' },
    toggleVisibilitySelectionLabel: { textContent: '' }
  };
  const calls = [];
  const syncToolbar = visibilityState.createStudioVisibilityToolbarStateSync({
    getDocument() {
      calls.push('document');
      return doc;
    },
    getSelectedElements() {
      calls.push('selection');
      return selectedElements;
    },
    getActiveSlide(currentDoc) {
      calls.push(['active-slide', currentDoc]);
      return slide;
    },
    getHiddenState(currentDoc) {
      calls.push(['hidden-state', currentDoc]);
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
  assert.equal(nodes.toggleVisibilitySelectionBtn.disabled, false);
  assert.equal(nodes.toggleVisibilitySelectionIcon.textContent, 'visibility_off');
  assert.equal(nodes.toggleVisibilitySelectionLabel.textContent, 'Hide Selected');
  assert.deepEqual(calls, [
    'document',
    'document-ref',
    'selection',
    ['hidden-state', doc],
    ['active-slide', doc]
  ]);
});

test('buildStudioVisibilityMutationPlan derives the next visibility toggle from the live selection only', () => {
  const visible = { id: 1, isConnected: true, hidden: false };
  const hidden = { id: 2, isConnected: true, hidden: true };

  assert.deepEqual(visibilityState.buildStudioVisibilityMutationPlan([
    { id: 'stale', isConnected: false, hidden: false },
    visible
  ], {
    isHidden: (element) => !!element.hidden
  }), {
    selection: [visible],
    shouldHide: true,
    didChange: true,
    versionLabel: 'Auto: Hid Element'
  });

  assert.deepEqual(visibilityState.buildStudioVisibilityMutationPlan([hidden], {
    isHidden: (element) => !!element.hidden
  }), {
    selection: [hidden],
    shouldHide: false,
    didChange: true,
    versionLabel: 'Auto: Showed Element'
  });

  assert.deepEqual(visibilityState.buildStudioVisibilityMutationPlan([
    { id: 'stale', isConnected: false, hidden: false }
  ], {
    isHidden: (element) => !!element.hidden
  }), {
    selection: [],
    shouldHide: false,
    didChange: false,
    versionLabel: ''
  });

  assert.deepEqual(visibilityState.buildStudioVisibilityMutationPlan([visible], {
    isHidden: (element) => !!element.hidden,
    canMutateDeck: () => false
  }), {
    selection: [visible],
    shouldHide: false,
    didChange: false,
    versionLabel: ''
  });
});

test('applyStudioVisibilityMutation applies live visibility changes and creates an optional transaction', () => {
  const element = {
    isConnected: true,
    dataset: { editorId: 'node-1' },
    style: { display: '' },
    hidden: false
  };
  const result = visibilityState.applyStudioVisibilityMutation([element], true, {
    isHidden: elementState.isStudioElementHidden,
    setHidden: elementState.setStudioElementHiddenState,
    getVisibilityState: elementState.getStudioElementVisibilityState,
    createVisibilityTransaction: transactionState.createStudioVisibilityTransaction,
    getElementId: (target) => target.dataset.editorId
  });

  assert.equal(result.didApply, true);
  assert.equal(result.changedCount, 1);
  assert.equal(element.hidden, true);
  assert.deepEqual(result.transaction.operations[0].elementId, 'node-1');
  assert.equal(result.transaction.operations[0].before.hidden, false);
  assert.equal(result.transaction.operations[0].after.hidden, true);
});

test('applyStudioVisibilityWithTransaction delegates visibility mutation dependencies', () => {
  const selection = [{ id: 'node-1' }];
  const calls = [];
  const result = visibilityState.applyStudioVisibilityWithTransaction(selection, true, {
    applyStudioVisibilityMutation(...args) {
      calls.push(args);
      return { didApply: true, transaction: { type: 'visibility' } };
    },
    createStudioVisibilityTransaction() {},
    isHidden() {},
    setHidden() {},
    getVisibilityState() {},
    getElementId() {}
  });

  assert.deepEqual(result, { didApply: true, transaction: { type: 'visibility' } });
  assert.deepEqual(calls[0].slice(0, 2), [selection, true]);
});

test('applyStudioVisibilityWithTransaction preserves fallback state capture', () => {
  const element = { isConnected: true, hidden: false };
  const result = visibilityState.applyStudioVisibilityWithTransaction([element], true, {
    isHidden: (target) => target.hidden,
    setHidden: (target, shouldHide) => {
      target.hidden = shouldHide;
    },
    getVisibilityState: (target) => ({ hidden: target.hidden }),
    createStudioVisibilityTransaction(items) {
      return { items };
    },
    getElementId: () => 'node-1'
  });

  assert.equal(result.didApply, true);
  assert.equal(element.hidden, true);
  assert.deepEqual(result.transaction.items, [{
    element,
    elementId: 'node-1',
    before: { hidden: false },
    after: { hidden: true }
  }]);
});

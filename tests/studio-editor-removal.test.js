const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const removal = require('../shared/studio-editor-removal.js');
const transactionState = require('../shared/studio-editor-transaction.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const REMOVAL_STATE_PATH = path.join(
  __dirname,
  '..',
  'shared',
  'studio-editor-removal-state.js'
);

test('editor forwards the removal action document into the selection reader', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const removalStateSource = fs.readFileSync(REMOVAL_STATE_PATH, 'utf8');

  assert.match(
    source,
    /<script src="\/shared\/studio-editor-removal-state-shell-runtime\.js"><\/script>/
  );
  assert.match(
    source,
    /<script src="\/shared\/studio-editor-removal-state-accessors\.js"><\/script>/
  );
  assert.match(
    source,
    /studioEditorRemovalStateShellCompositionApi\s*\.\s*createStudioEditorRemovalStateShellComposition\(/
  );
  assert.match(
    source,
    /studioEditorRemovalStateController = studioEditorRemovalStateShellComposition/
  );
  assert.match(removalStateSource, /getSelectedElements\(doc\)/);
  assert.match(removalStateSource, /getDocumentRef: \(\) => documentRef/);
});

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

test('buildStudioRemovalActionState disables deletion when lock state throws', () => {
  const live = { id: 'live', isConnected: true };

  assert.deepEqual(removal.buildStudioRemovalActionState([live], {
    isLocked: () => {
      throw new Error('stale locked state');
    }
  }), {
    selection: [live],
    hasSelection: true,
    canRemove: false
  });
});

test('createStudioRemovalActionStateBuilder resolves selection and slide readiness through shared callbacks', () => {
  const doc = { id: 'doc' };
  const slide = { id: 'slide-1' };
  const selection = [{ id: 'node-1', isConnected: true }];
  const calls = [];
  const buildActionState = removal.createStudioRemovalActionStateBuilder({
    getDocument() {
      calls.push('document');
      return doc;
    },
    getSelectedElements(currentDoc) {
      calls.push('selection');
      assert.equal(currentDoc, doc);
      return selection;
    },
    getActiveSlide(currentDoc) {
      calls.push(['active-slide', currentDoc]);
      return slide;
    },
    getLockedState(currentDoc) {
      calls.push(['locked-state', currentDoc]);
      return () => false;
    }
  });

  const result = buildActionState();

  assert.deepEqual(result.selection, selection);
  assert.equal(result.canRemove, true);
  assert.deepEqual(calls, [
    'document',
    'selection',
    ['locked-state', doc],
    ['active-slide', doc]
  ]);
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

test('removeStudioElements prefers scoped element-presence transactions for serializable live targets', () => {
  const parent = {
    dataset: { editorId: 'slide:slide-1' },
    children: [],
    innerHTML: '<div data-editor-id="node-1">A</div>'
  };
  const element = {
    isConnected: true,
    dataset: { editorId: 'node-1' },
    parentElement: parent,
    outerHTML: '<div data-editor-id="node-1">A</div>',
    remove() {
      this.isConnected = false;
      parent.children = [];
      parent.innerHTML = '';
    }
  };
  parent.children = [element];
  let markupCaptureCalls = 0;

  const result = removal.removeStudioElements([element], {
    createMarkupTransactionCapture() {
      markupCaptureCalls += 1;
      return transactionState.createStudioMarkupTransactionCapture(...arguments);
    },
    createElementPresenceTransaction: transactionState.createStudioElementPresenceTransaction,
    getElementId: (target) => target && target.dataset && target.dataset.editorId
  });

  assert.equal(result.didRemove, true);
  assert.equal(markupCaptureCalls, 0);
  assert.deepEqual(result.transaction.operations[0], {
    type: 'element-presence',
    elementId: 'node-1',
    parentId: 'slide:slide-1',
    before: {
      exists: true,
      index: 0,
      markup: '<div data-editor-id="node-1">A</div>'
    },
    after: { exists: false, index: 0, markup: '' }
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

test('syncStudioRemovalToolbarState builds and renders deletion controls in one shared operation', () => {
  const removeSelectionBtn = { disabled: true };
  const element = { isConnected: true, locked: false };

  assert.equal(removal.syncStudioRemovalToolbarState({
    documentRef: {
      getElementById(id) {
        return id === 'removeSelectionBtn' ? removeSelectionBtn : null;
      }
    },
    elements: [element],
    isLocked: (target) => !!target.locked,
    canMutateDeck: () => true
  }), true);
  assert.equal(removeSelectionBtn.disabled, false);
});

test('createStudioRemovalToolbarStateSync resolves the removal action state through callbacks', () => {
  const doc = { id: 'iframe-doc' };
  const removeSelectionBtn = { disabled: true };
  const calls = [];
  const syncToolbar = removal.createStudioRemovalToolbarStateSync({
    getDocument() {
      calls.push('document');
      return doc;
    },
    getActionState(currentDoc) {
      calls.push(['action-state', currentDoc]);
      return { canRemove: true };
    },
    getDocumentRef() {
      calls.push('document-ref');
      return {
        getElementById(id) {
          return id === 'removeSelectionBtn' ? removeSelectionBtn : null;
        }
      };
    }
  });

  assert.equal(syncToolbar(), true);
  assert.equal(removeSelectionBtn.disabled, false);
  assert.deepEqual(calls, [
    'document',
    ['action-state', doc],
    'document-ref'
  ]);
});

test('createStudioRemovalToolbarStateSync fails closed when action-state resolution throws', () => {
  const syncToolbar = removal.createStudioRemovalToolbarStateSync({
    getActionState() {
      throw new Error('removal state unavailable');
    }
  });

  assert.equal(syncToolbar(), false);
});

test('finalizeStudioRemovalActionResult refreshes removal state and preserves the result', () => {
  const doc = { id: 'doc' };
  const calls = [];

  assert.equal(removal.finalizeStudioRemovalActionResult(false, {
    doc,
    updateRemovalActionState(currentDoc) {
      calls.push(currentDoc);
    }
  }), false);
  assert.deepEqual(calls, [doc]);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const canonicalDeckModel = require('../shared/canonical-deck.js');
const canonicalVisibility = require('../shared/studio-editor-canonical-visibility.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const studioElementState = require('../shared/studio-element-state.js');
const lockState = require('../shared/studio-editor-lock-state.js');
const lockMutation = require('../shared/studio-editor-lock-mutation.js');
const lockTransaction = require('../shared/studio-editor-lock-transaction.js');
const lockVisibilityRollback = require('../shared/studio-editor-lock-visibility-rollback.js');
const deckMutation = require('../shared/studio-editor-deck-mutation.js');
const lockVisibilityController = require('../shared/studio-editor-lock-visibility-controller.js');
const selectionFixture = require('./helpers/studio-selection-state-fixture.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const source = selectionFixture.extractSelectionAwareFunctionSource(
    fileContent,
    startMarker,
    endMarker
  );
  assert.notEqual(source, null, `Missing function markers: ${startMarker}`);
  return source;
}

function loadFinalizeEditorDeckMutation(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function finalizeEditorDeckMutation(versionLabel, options = {}) {',
    '\n\n    // Apply styles immediately to active selected elements'
  );
  context.SlideNextStudioEditorDeckMutation = deckMutation;
  vm.runInContext(helperSource, context);
}

function loadSyncSelectionUiAfterMutation(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'const studioEditorSelectionUiMutationSynchronizer =',
    '\n\n    function finalizeSelectionToggleMutation(versionLabel, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadFinalizeSelectionToggleMutation(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function finalizeSelectionToggleMutation(versionLabel, options = {}) {',
    '\n\n    function toggleSelectedElementsLockState() {'
  );
  context.SlideNextStudioEditorDeckMutation = deckMutation;
  vm.runInContext(helperSource, context);
}

function loadLockMutationHelper(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyEditorLockMutationWithTransaction(selection, shouldLock, options = {}) {',
    'function toggleSelectedElementsLockState() {'
  );
  context.SlideNextStudioEditorLockMutation = lockMutation;
  context.SlideNextStudioEditorLockTransaction = lockTransaction;
  vm.runInContext(helperSource, context);
}

function loadLockVisibilityRollbackHelper(fileContent, context) {
  context.SlideNextStudioEditorLockVisibilityRollback = lockVisibilityRollback;
  const helperSource = extractFunctionSource(
    fileContent,
    'function rollbackEditorLockVisibilityMutation(transaction, sourceDoc = getIframeDoc()) {',
    'function toggleSelectedElementsVisibility(options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function installLockVisibilityController(context) {
  context.studioEditorLockVisibilityController = lockVisibilityController.createStudioEditorLockVisibilityController({
    lockStateApi: context.SlideNextStudioEditorLockState,
    visibilityStateApi: context.SlideNextStudioEditorVisibilityState,
    canonicalDeckApi: context.SlideNextCanonicalDeck,
    canonicalVisibilityApi: context.SlideNextStudioEditorCanonicalVisibility,
    getSelectedElements: () => context.selectedElements,
    getIframeDoc: context.getIframeDoc,
    getActiveSlide: context.getActiveSlide,
    isLocked: context.isElementLocked,
    isHidden: context.isElementHidden,
    setLocked: context.setElementLockedState
      || (context.SlideNextStudioElementState
        && context.SlideNextStudioElementState.setStudioElementLockedState),
    setHidden: context.setElementHiddenState,
    getVisibilityState: context.SlideNextStudioElementState
      && context.SlideNextStudioElementState.getStudioElementVisibilityState,
    assignLockElementId: context.assignEditorElementId,
    assignVisibilityElementId: context.assignEditorElementId,
    buildCanonicalDeck: context.buildEditorCanonicalDeck,
    applyLockMutation: context.applyEditorLockMutationWithTransaction,
    applyVisibilityMutation: context.applyEditorVisibilityMutationWithTransaction,
    finalizeSelectionToggleMutation: context.finalizeSelectionToggleMutation,
    rollbackSelectionToggleMutation: context.rollbackEditorLockVisibilityMutation
  });
}

test('syncSelectionUiAfterMutation refreshes selection classes before syncing selection chrome', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(fileContent, /const studioEditorSelectionUiMutationSynchronizer =/);
  assert.match(fileContent, /typeof studioEditorSelectionUiMutationSynchronizer !== 'function'/);
  const selectedElements = [{ id: 'node-1' }];
  const documentRef = { id: 'editor-document' };
  const calls = [];
  const context = {
    selectedElements,
    getIframeDoc() {
      return documentRef;
    },
    SlideNextStudioEditorSelection: {
      syncStudioSelectionUiAfterMutation(selection, options) {
        options.refreshSelectionClasses();
        calls.push(['syncStudioSelectionUiAfterMutation', selection, Object.keys(options).sort()]);
        return selection;
      }
    },
    refreshSelectionClasses() {
      calls.push(['refreshSelectionClasses']);
    },
    syncInspectorForSelection() {},
    syncSelectionOverlay() {},
    updateLayersList() {}
  };

  vm.createContext(context);
  loadSyncSelectionUiAfterMutation(fileContent, context);

  const result = context.syncSelectionUiAfterMutation();

  assert.equal(result, selectedElements);
  assert.deepEqual(calls, [
    ['refreshSelectionClasses'],
    ['syncStudioSelectionUiAfterMutation', selectedElements, ['doc', 'refreshSelectionClasses', 'syncInspectorForSelection', 'syncSelectionOverlay', 'updateLayersList']]
  ]);
});

test('syncSelectionUiAfterMutation forwards an explicit document to selection refresh callbacks', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const defaultDocument = { id: 'default-document' };
  const requestedDocument = { id: 'requested-document' };
  const selectedElements = [{ id: 'node-1' }];
  let selectedDocument = null;
  let refreshedDocument = null;
  const context = {
    selectedElements,
    getIframeDoc() {
      return defaultDocument;
    },
    SlideNextStudioEditorSelection: {
      syncStudioSelectionUiAfterMutation(selection, options) {
        options.refreshSelectionClasses();
        return selection;
      }
    },
    refreshSelectionClasses(doc) {
      refreshedDocument = doc;
    },
    syncInspectorForSelection() {},
    syncSelectionOverlay() {},
    updateLayersList() {}
  };

  vm.createContext(context);
  loadSyncSelectionUiAfterMutation(fileContent, context);
  context.getStudioSelectedElements = (doc) => {
    selectedDocument = doc;
    return selectedElements;
  };

  assert.deepEqual(context.syncSelectionUiAfterMutation(requestedDocument), selectedElements);
  assert.equal(selectedDocument, requestedDocument);
  assert.equal(refreshedDocument, requestedDocument);
});

test('syncSelectionUiAfterMutation fails closed when the shared selection API is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const selectedElements = [{ id: 'node-1' }];
  const context = {
    selectedElements,
    SlideNextStudioEditorSelection: null,
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  loadSyncSelectionUiAfterMutation(fileContent, context);

  assert.equal(context.syncSelectionUiAfterMutation(), selectedElements);
});

test('finalizeSelectionToggleMutation syncs selection chrome and delegates persistence without thumbnail refresh', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    finalizeEditorDeckMutation(versionLabel, options) {
      calls.push(['finalizeEditorDeckMutation', versionLabel, options]);
    },
    syncSelectionUiAfterMutation() {
      calls.push(['syncSelectionUiAfterMutation']);
    }
  };

  vm.createContext(context);
  loadFinalizeSelectionToggleMutation(fileContent, context);

  assert.equal(context.finalizeSelectionToggleMutation('Auto: Locked Element'), true);
  assert.deepEqual(calls.map(([name, versionLabel]) => [name, versionLabel]), [
    ['syncSelectionUiAfterMutation', undefined],
    ['finalizeEditorDeckMutation', 'Auto: Locked Element']
  ]);
  assert.equal(calls[1][2].refreshThumbnails, false);
});

test('finalizeSelectionToggleMutation forwards the mutation document to selection UI sync', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const documentRef = { id: 'editor-document' };
  const calls = [];
  const context = {
    finalizeEditorDeckMutation() {},
    syncSelectionUiAfterMutation(doc) {
      calls.push(doc);
    }
  };

  vm.createContext(context);
  loadFinalizeSelectionToggleMutation(fileContent, context);

  assert.equal(context.finalizeSelectionToggleMutation('Auto: Locked Element', { doc: documentRef }), true);
  assert.deepEqual(calls, [documentRef]);
});

test('updateLockActionState enables the lock control only when the iframe has a live active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateLockActionStateSource = extractFunctionSource(
    fileContent,
    'function updateLockActionState(doc = getIframeDoc()) {',
    '\n\n    function updateRemovalActionState(doc = getIframeDoc()) {'
  );

  const toggleLockSelectionBtn = { disabled: true };
  const toggleLockSelectionIcon = { textContent: '' };
  const toggleLockSelectionLabel = { textContent: '' };
  const context = {
    selectedElements: [{ id: 'selected' }],
    isElementLocked() {
      return true;
    },
    SlideNextStudioEditorLockState: {
      syncStudioLockToolbarState(options) {
        return lockState.syncStudioLockToolbarState(options);
      },
      buildStudioLockActionState(elements, options = {}) {
        const canToggle = typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true;
        return {
          canToggle,
          allLocked: canToggle
        };
      },
      renderStudioLockToolbarState(options) {
        return lockState.renderStudioLockToolbarState(options);
      }
    },
    document: {
      getElementById(id) {
        if (id === 'toggleLockSelectionBtn') return toggleLockSelectionBtn;
        if (id === 'toggleLockSelectionIcon') return toggleLockSelectionIcon;
        if (id === 'toggleLockSelectionLabel') return toggleLockSelectionLabel;
        return null;
      }
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateLockActionStateSource, context);

  context.updateLockActionState(null);
  assert.equal(toggleLockSelectionBtn.disabled, true);
  assert.equal(toggleLockSelectionIcon.textContent, 'lock');
  assert.equal(toggleLockSelectionLabel.textContent, 'Lock Selected');

  context.updateLockActionState({
    activeSlide: {}
  });
  assert.equal(toggleLockSelectionBtn.disabled, false);
  assert.equal(toggleLockSelectionIcon.textContent, 'lock_open');
  assert.equal(toggleLockSelectionLabel.textContent, 'Unlock Selected');
});

test('updateLockActionState reuses the shared lock toolbar helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateLockActionStateSource = extractFunctionSource(
    fileContent,
    'function updateLockActionState(doc = getIframeDoc()) {',
    '\n\n    function buildRemovalSelectionActionState(doc = null) {'
  );

  const calls = [];
  const toggleLockSelectionBtn = { disabled: true };
  const toggleLockSelectionIcon = { textContent: '' };
  const toggleLockSelectionLabel = { textContent: '' };
  const context = {
    selectedElements: [{ id: 'selected' }],
    isElementLocked() {
      return false;
    },
    SlideNextStudioEditorLockState: {
      syncStudioLockToolbarState(options) {
        const actionState = this.buildStudioLockToolbarState(options.elements, {
          isLocked: options.isLocked,
          canMutateDeck: options.canMutateDeck
        });
        return this.renderStudioLockToolbarState({
          documentRef: options.documentRef,
          actionState
        });
      },
      buildStudioLockActionState() {
        throw new Error('buildStudioLockActionState should not be used when shared toolbar helper exists');
      },
      buildStudioLockToolbarState(elements, options = {}) {
        calls.push({
          elements,
          hasCanMutateDeck: typeof options.canMutateDeck === 'function',
          canToggle: options.canMutateDeck()
        });
        return {
          canToggle: true,
          iconText: 'lock_open',
          labelText: 'Unlock Selected'
        };
      },
      renderStudioLockToolbarState(options) {
        return lockState.renderStudioLockToolbarState(options);
      }
    },
    document: {
      getElementById(id) {
        if (id === 'toggleLockSelectionBtn') return toggleLockSelectionBtn;
        if (id === 'toggleLockSelectionIcon') return toggleLockSelectionIcon;
        if (id === 'toggleLockSelectionLabel') return toggleLockSelectionLabel;
        return null;
      }
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateLockActionStateSource, context);

  context.updateLockActionState({
    activeSlide: {}
  });

  assert.equal(toggleLockSelectionBtn.disabled, false);
  assert.equal(toggleLockSelectionIcon.textContent, 'lock_open');
  assert.equal(toggleLockSelectionLabel.textContent, 'Unlock Selected');
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    elements: [{ id: 'selected' }],
    hasCanMutateDeck: true,
    canToggle: true
  }]);
});

test('updateLockActionState prefers canonical lock metadata when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateLockActionStateSource = extractFunctionSource(
    fileContent,
    'function isElementLocked(el) {',
    '\n\n    function buildRemovalSelectionActionState(doc = null) {'
  );
  const toggleLockSelectionBtn = { disabled: true };
  const toggleLockSelectionIcon = { textContent: '' };
  const toggleLockSelectionLabel = { textContent: '' };
  const selectedElement = {
    dataset: { editorId: 'node-1' }
  };
  const context = {
    selectedElements: [selectedElement],
    isElementLocked() {
      return false;
    },
    SlideNextStudioEditorCanonicalState: canonicalState,
    SlideNextCanonicalDeck: canonicalDeckModel,
    buildEditorCanonicalDeck() {
      return canonicalDeckModel.createCanonicalDeck({
        slides: [{
          id: 'slide-1',
          nodes: [{
            id: 'node-1',
            visibility: { locked: true }
          }]
        }]
      });
    },
    SlideNextStudioEditorLockState: lockState,
    document: {
      getElementById(id) {
        if (id === 'toggleLockSelectionBtn') return toggleLockSelectionBtn;
        if (id === 'toggleLockSelectionIcon') return toggleLockSelectionIcon;
        if (id === 'toggleLockSelectionLabel') return toggleLockSelectionLabel;
        return null;
      }
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateLockActionStateSource, context);

  context.updateLockActionState({ activeSlide: {} });
  assert.equal(toggleLockSelectionBtn.disabled, false);
  assert.equal(toggleLockSelectionIcon.textContent, 'lock_open');
  assert.equal(toggleLockSelectionLabel.textContent, 'Unlock Selected');
});

test('updateLockActionState delegates toolbar state assembly to the shared lock view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateLockActionStateSource = extractFunctionSource(
    fileContent,
    'function updateLockActionState(doc = getIframeDoc()) {',
    '\n\n    function buildRemovalSelectionActionState(doc = null) {'
  );
  const selectedElement = { id: 'selected' };
  const calls = [];
  const context = {
    selectedElements: [selectedElement],
    isElementLocked() {
      return false;
    },
    SlideNextStudioEditorLockState: {
      syncStudioLockToolbarState(options) {
        calls.push(options);
        return 'delegated';
      }
    },
    document: {},
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateLockActionStateSource, context);

  const doc = { activeSlide: {} };
  assert.equal(context.updateLockActionState(doc), 'delegated');
  assert.equal(calls.length, 1);
  assert.match(updateLockActionStateSource, /elements: getStudioSelectedElements\(doc\)/);
  assert.equal(calls[0].documentRef, context.document);
  assert.deepEqual(calls[0].elements, [selectedElement]);
  assert.equal(calls[0].isLocked, context.isElementLocked);
  assert.equal(calls[0].canMutateDeck(), true);
});

test('toggleSelectedElementsLockState returns false and skips persistence when planned targets disconnect before apply', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toggleSelectedElementsLockStateSource = extractFunctionSource(
    fileContent,
    'function toggleSelectedElementsLockState() {',
    '\n\n    function toggleSelectedElementsVisibility(options = {}) {'
  );

  const disconnectedTarget = { isConnected: false };
  const calls = [];
  const context = {
    selectedElements: [disconnectedTarget],
    SlideNextStudioEditorLockState: {
      applyStudioLockWithTransaction: lockState.applyStudioLockWithTransaction,
      buildStudioLockMutationPlan() {
        calls.push(['buildStudioLockMutationPlan']);
        return {
          didChange: true,
          selection: [disconnectedTarget],
          shouldLock: true,
          versionLabel: 'Auto: Locked Element'
        };
      }
    },
    SlideNextStudioEditorSelection: {
      syncStudioSelectionUi() {
        calls.push(['syncStudioSelectionUi']);
      }
    },
    SlideNextStudioElementState: {
      setStudioElementLockedState() {
        calls.push(['setStudioElementLockedState']);
      }
    },
    getActiveSlide() {
      calls.push(['getActiveSlide']);
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return { label: 'iframe-doc' };
    },
    isElementLocked() {
      calls.push(['isElementLocked']);
      return false;
    },
    refreshSelectionClasses() {
      calls.push(['refreshSelectionClasses']);
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    syncInspectorForSelection() {
      calls.push(['syncInspectorForSelection']);
    },
    syncSelectionOverlay() {
      calls.push(['syncSelectionOverlay']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  loadSyncSelectionUiAfterMutation(fileContent, context);
  loadFinalizeSelectionToggleMutation(fileContent, context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  loadLockMutationHelper(fileContent, context);
  installLockVisibilityController(context);
  vm.runInContext(toggleSelectedElementsLockStateSource, context);

  assert.equal(context.toggleSelectedElementsLockState(), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioLockMutationPlan']
  ]);
});

test('toggleSelectedElementsLockState returns true after locking live targets and persisting the change', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toggleSelectedElementsLockStateSource = extractFunctionSource(
    fileContent,
    'function toggleSelectedElementsLockState() {',
    '\n\n    function toggleSelectedElementsVisibility(options = {}) {'
  );

  const liveTarget = { isConnected: true };
  const calls = [];
  const context = {
    selectedElements: [liveTarget],
    SlideNextStudioEditorLockState: {
      applyStudioLockWithTransaction: lockState.applyStudioLockWithTransaction,
      buildStudioLockMutationPlan() {
        calls.push(['buildStudioLockMutationPlan']);
        return {
          didChange: true,
          selection: [liveTarget],
          shouldLock: true,
          versionLabel: 'Auto: Locked Element'
        };
      }
    },
    SlideNextStudioEditorSelection: {
      syncStudioSelectionUiAfterMutation(selection, options) {
        options.refreshSelectionClasses();
        calls.push(['syncStudioSelectionUiAfterMutation', selection, Object.keys(options).sort()]);
        return selection;
      }
    },
    SlideNextStudioElementState: {
      setStudioElementLockedState(element, shouldLock) {
        calls.push(['setStudioElementLockedState', element, shouldLock]);
      }
    },
    getActiveSlide() {
      calls.push(['getActiveSlide']);
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return { label: 'iframe-doc' };
    },
    isElementLocked(element) {
      calls.push(['isElementLocked', element]);
      return false;
    },
    refreshSelectionClasses() {
      calls.push(['refreshSelectionClasses']);
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    syncInspectorForSelection() {
      calls.push(['syncInspectorForSelection']);
    },
    syncSelectionOverlay() {
      calls.push(['syncSelectionOverlay']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  loadSyncSelectionUiAfterMutation(fileContent, context);
  loadFinalizeSelectionToggleMutation(fileContent, context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  loadLockMutationHelper(fileContent, context);
  installLockVisibilityController(context);
  vm.runInContext(toggleSelectedElementsLockStateSource, context);

  assert.equal(context.toggleSelectedElementsLockState(), true);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioLockMutationPlan'],
    ['isElementLocked', liveTarget],
    ['setStudioElementLockedState', liveTarget, true],
    ['refreshSelectionClasses'],
    ['syncStudioSelectionUiAfterMutation', [liveTarget], ['doc', 'refreshSelectionClasses', 'syncInspectorForSelection', 'syncSelectionOverlay', 'updateLayersList']],
    ['saveHistoryState'],
    ['triggerAutoSave'],
    ['triggerAutoVersion', 'Auto: Locked Element']
  ]);
});

test('toggleSelectedElementsLockState captures a reversible dataset transaction', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toggleSelectedElementsLockStateSource = extractFunctionSource(
    fileContent,
    'function toggleSelectedElementsLockState() {',
    '\n\n    function toggleSelectedElementsVisibility(options = {}) {'
  );
  const liveTarget = {
    isConnected: true,
    dataset: {}
  };
  let finalized = null;
  const context = {
    selectedElements: [liveTarget],
    SlideNextStudioEditorTransaction: studioTransaction,
    SlideNextStudioEditorLockState: {
      applyStudioLockWithTransaction: lockState.applyStudioLockWithTransaction,
      buildStudioLockMutationPlan() {
        return {
          didChange: true,
          selection: [liveTarget],
          shouldLock: true,
          versionLabel: 'Auto: Locked Element'
        };
      }
    },
    SlideNextStudioEditorSelection: {
      syncStudioSelectionUi() {}
    },
    SlideNextStudioElementState: {
      setStudioElementLockedState(element, shouldLock) {
        if (shouldLock) {
          element.dataset.editorLocked = 'true';
        } else {
          delete element.dataset.editorLocked;
        }
      }
    },
    assignEditorElementId(element) {
      element.dataset.editorId = 'node-1';
    },
    getActiveSlide() {
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      return { label: 'iframe-doc' };
    },
    isElementLocked(element) {
      return element.dataset.editorLocked === 'true';
    },
    refreshSelectionClasses() {},
    syncInspectorForSelection() {},
    syncSelectionOverlay() {},
    updateLayersList() {},
    finalizeEditorDeckMutation(versionLabel, options) {
      finalized = { versionLabel, options };
    }
  };

  vm.createContext(context);
  loadSyncSelectionUiAfterMutation(fileContent, context);
  loadFinalizeSelectionToggleMutation(fileContent, context);
  loadLockMutationHelper(fileContent, context);
  installLockVisibilityController(context);
  vm.runInContext(toggleSelectedElementsLockStateSource, context);

  assert.equal(context.toggleSelectedElementsLockState(), true);
  assert.equal(liveTarget.dataset.editorLocked, 'true');
  assert.deepEqual(JSON.parse(JSON.stringify(finalized)), {
    versionLabel: 'Auto: Locked Element',
    options: {
      refreshThumbnails: false,
      transaction: {
        kind: 'slidenext.editor.transaction',
        version: 1,
        operations: [{
          type: 'dataset',
          elementId: 'node-1',
          property: 'editorLocked',
          before: '',
          after: 'true'
        }]
      }
    }
  });
});

test('toggleSelectedElementsLockState forwards an immutable canonical visibility sidecar', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toggleSelectedElementsLockStateSource = extractFunctionSource(
    fileContent,
    'function toggleSelectedElementsLockState() {',
    '\n\n    function toggleSelectedElementsVisibility(options = {}) {'
  );
  const liveTarget = {
    isConnected: true,
    dataset: {}
  };
  const canonicalDeckBefore = canonicalDeckModel.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', visibility: { locked: false } }]
    }]
  });
  let finalized = null;
  const context = {
    selectedElements: [liveTarget],
    SlideNextCanonicalDeck: canonicalDeckModel,
    SlideNextStudioEditorCanonicalVisibility: canonicalVisibility,
    SlideNextStudioEditorTransaction: studioTransaction,
    SlideNextStudioEditorLockState: {
      applyStudioLockWithTransaction: lockState.applyStudioLockWithTransaction,
      buildStudioLockMutationPlan() {
        return {
          didChange: true,
          selection: [liveTarget],
          shouldLock: true,
          versionLabel: 'Auto: Locked Element'
        };
      }
    },
    SlideNextStudioElementState: {
      setStudioElementLockedState(element, shouldLock) {
        if (shouldLock) element.dataset.editorLocked = 'true';
      }
    },
    assignEditorElementId(element) {
      element.dataset.editorId = 'node-1';
      return 'node-1';
    },
    buildEditorCanonicalDeck() {
      return canonicalDeckBefore;
    },
    getActiveSlide() {
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      return { id: 'iframe-doc' };
    },
    isElementLocked() {
      return false;
    },
    syncSelectionUiAfterMutation() {},
    finalizeEditorDeckMutation(versionLabel, options) {
      finalized = { versionLabel, options };
    }
  };

  vm.createContext(context);
  loadFinalizeSelectionToggleMutation(fileContent, context);
  loadLockMutationHelper(fileContent, context);
  installLockVisibilityController(context);
  vm.runInContext(toggleSelectedElementsLockStateSource, context);

  assert.equal(context.toggleSelectedElementsLockState(), true);
  assert.equal(canonicalDeckBefore.slides[0].nodes[0].visibility.locked, false);
  assert.equal(finalized.options.canonicalDeck.slides[0].nodes[0].visibility.locked, true);
  assert.equal(finalized.options.transaction.operations[0].elementId, 'node-1');
});

test('toggleSelectedElementsLockState delegates lock application to the shared lock module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toggleSelectedElementsLockStateSource = extractFunctionSource(
    fileContent,
    'function toggleSelectedElementsLockState() {',
    '\n\n    function toggleSelectedElementsVisibility(options = {}) {'
  );
  const liveTarget = { isConnected: true, dataset: {} };
  const calls = [];
  const context = {
    selectedElements: [liveTarget],
    SlideNextStudioEditorLockState: {
      buildStudioLockMutationPlan() {
        return {
          didChange: true,
          selection: [liveTarget],
          shouldLock: true,
          versionLabel: 'Auto: Locked Element'
        };
      },
      applyStudioLockWithTransaction(selection, shouldLock, options) {
        calls.push(['applyStudioLockWithTransaction', selection, shouldLock, options]);
        return { didApply: true, transaction: { type: 'dataset' } };
      }
    },
    SlideNextStudioElementState: {
      setStudioElementLockedState() {}
    },
    getActiveSlide() {
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      return {};
    },
    isElementLocked() {
      return false;
    },
    syncSelectionUiAfterMutation() {},
    finalizeEditorDeckMutation(label, options) {
      calls.push(['finalizeEditorDeckMutation', label, options]);
    }
  };

  vm.createContext(context);
  loadFinalizeSelectionToggleMutation(fileContent, context);
  loadLockMutationHelper(fileContent, context);
  installLockVisibilityController(context);
  vm.runInContext(toggleSelectedElementsLockStateSource, context);

  assert.equal(context.toggleSelectedElementsLockState(), true);
  assert.equal(calls[0][0], 'applyStudioLockWithTransaction');
  assert.equal(calls[0][1][0], liveTarget);
  assert.equal(calls[0][2], true);
  assert.equal(typeof calls[0][3].getElementId, 'function');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1])), ['finalizeEditorDeckMutation', 'Auto: Locked Element', {
    refreshThumbnails: false,
    transaction: { type: 'dataset' }
  }]);
});

test('rollbackEditorLockVisibilityMutation reverses a rejected lock transaction', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const documentRef = { id: 'iframe-doc' };
  const target = { dataset: { editorId: 'node-1', editorLocked: 'true' } };
  const context = {
    SlideNextStudioEditorTransaction: studioTransaction,
    SlideNextStudioElementState: studioElementState,
    getIframeDoc() {
      return documentRef;
    },
    getElementByEditorId(editorId, sourceDoc) {
      return editorId === 'node-1' && sourceDoc === documentRef ? target : null;
    }
  };

  vm.createContext(context);
  loadLockVisibilityRollbackHelper(fileContent, context);
  const mutation = studioTransaction.createStudioDatasetTransaction([{
    element: target,
    property: 'editorLocked',
    before: null,
    after: 'true'
  }]);

  assert.equal(context.rollbackEditorLockVisibilityMutation(mutation, documentRef), true);
  assert.equal(target.dataset.editorLocked, undefined);
});

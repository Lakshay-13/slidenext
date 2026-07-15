const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const lockState = require('../shared/studio-editor-lock-state.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadFinalizeEditorDeckMutation(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function finalizeEditorDeckMutation(versionLabel, options = {}) {',
    '\n\n    // Apply styles immediately to active selected elements'
  );
  vm.runInContext(helperSource, context);
}

function loadSyncSelectionUiAfterMutation(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function syncSelectionUiAfterMutation() {',
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
  vm.runInContext(helperSource, context);
}

function loadLockMutationHelper(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyEditorLockMutationWithTransaction(selection, shouldLock, options = {}) {',
    'function toggleSelectedElementsLockState() {'
  );
  vm.runInContext(helperSource, context);
}

test('syncSelectionUiAfterMutation refreshes selection classes before syncing selection chrome', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const selectedElements = [{ id: 'node-1' }];
  const calls = [];
  const context = {
    selectedElements,
    SlideNextStudioEditorSelection: {
      syncStudioSelectionUi(selection, options) {
        calls.push(['syncStudioSelectionUi', selection, Object.keys(options).sort()]);
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
    ['syncStudioSelectionUi', selectedElements, ['syncInspectorForSelection', 'syncSelectionOverlay', 'updateLayersList']]
  ]);
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
      syncStudioSelectionUi(selection, options) {
        calls.push(['syncStudioSelectionUi', selection, Object.keys(options).sort()]);
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
  vm.runInContext(toggleSelectedElementsLockStateSource, context);

  assert.equal(context.toggleSelectedElementsLockState(), true);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioLockMutationPlan'],
    ['isElementLocked', liveTarget],
    ['setStudioElementLockedState', liveTarget, true],
    ['refreshSelectionClasses'],
    ['syncStudioSelectionUi', [liveTarget], ['syncInspectorForSelection', 'syncSelectionOverlay', 'updateLayersList']],
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
      applyStudioLockMutation(selection, shouldLock, options) {
        calls.push(['applyStudioLockMutation', selection, shouldLock, options]);
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
  vm.runInContext(toggleSelectedElementsLockStateSource, context);

  assert.equal(context.toggleSelectedElementsLockState(), true);
  assert.equal(calls[0][0], 'applyStudioLockMutation');
  assert.equal(calls[0][1][0], liveTarget);
  assert.equal(calls[0][2], true);
  assert.equal(typeof calls[0][3].getElementId, 'function');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1])), ['finalizeEditorDeckMutation', 'Auto: Locked Element', {
    refreshThumbnails: false,
    transaction: { type: 'dataset' }
  }]);
});

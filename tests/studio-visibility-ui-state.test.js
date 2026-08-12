const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const canonicalDeckModel = require('../shared/canonical-deck.js');
const canonicalVisibility = require('../shared/studio-editor-canonical-visibility.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const studioElementState = require('../shared/studio-element-state.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const visibilityState = require('../shared/studio-editor-visibility-state.js');
const visibilityMutation = require('../shared/studio-editor-visibility-mutation.js');
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

function loadVisibilityMutationHelper(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyEditorVisibilityMutationWithTransaction(selection, shouldHide, options = {}) {',
    'function toggleSelectedElementsVisibility(options = {}) {'
  );
  context.SlideNextStudioEditorVisibilityMutation = visibilityMutation;
  vm.runInContext(helperSource, context);
}

function installLockVisibilityController(context) {
  context.studioEditorLockVisibilityController = lockVisibilityController.createStudioEditorLockVisibilityController({
    lockStateApi: context.SlideNextStudioEditorLockState,
    visibilityStateApi: context.SlideNextStudioEditorVisibilityState,
    canonicalDeckApi: context.SlideNextCanonicalDeck,
    canonicalVisibilityApi: context.SlideNextStudioEditorCanonicalVisibility,
    canonicalStateApi: context.SlideNextStudioEditorCanonicalState,
    getSelectedElements: () => context.selectedElements,
    getIframeDoc: context.getIframeDoc,
    getActiveSlide: context.getActiveSlide,
    isLocked: context.isElementLocked,
    isHidden: context.isElementHidden,
    setLocked: context.setElementLockedState,
    setHidden: context.setElementHiddenState
      || (context.SlideNextStudioElementState
        && context.SlideNextStudioElementState.setStudioElementHiddenState),
    getVisibilityState: context.SlideNextStudioElementState
      && context.SlideNextStudioElementState.getStudioElementVisibilityState,
    assignLockElementId: context.assignEditorElementId,
    assignVisibilityElementId: context.assignEditorElementId,
    buildCanonicalDeck: context.buildEditorCanonicalDeck,
    applyLockMutation: context.applyEditorLockMutationWithTransaction,
    applyVisibilityMutation: context.applyEditorVisibilityMutationWithTransaction,
    finalizeSelectionToggleMutation: context.finalizeSelectionToggleMutation
  });
}

test('updateVisibilityActionState enables the visibility control only when the iframe has a live active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateVisibilityActionStateSource = extractFunctionSource(
    fileContent,
    'function updateVisibilityActionState(doc = getIframeDoc()) {',
    '\n\n    function updateMotionActionState(doc = getIframeDoc()) {'
  );

  const toggleVisibilitySelectionBtn = { disabled: true };
  const toggleVisibilitySelectionIcon = { textContent: '' };
  const toggleVisibilitySelectionLabel = { textContent: '' };
  const context = {
    selectedElements: [{ id: 'selected' }],
    isElementHidden() {
      return true;
    },
    SlideNextStudioEditorVisibilityState: {
      syncStudioVisibilityToolbarState(options) {
        return visibilityState.syncStudioVisibilityToolbarState(options);
      },
      buildStudioVisibilityActionState(elements, options = {}) {
        const canToggle = typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true;
        return {
          canToggle,
          allHidden: canToggle
        };
      },
      renderStudioVisibilityToolbarState(options) {
        return visibilityState.renderStudioVisibilityToolbarState(options);
      }
    },
    document: {
      getElementById(id) {
        if (id === 'toggleVisibilitySelectionBtn') return toggleVisibilitySelectionBtn;
        if (id === 'toggleVisibilitySelectionIcon') return toggleVisibilitySelectionIcon;
        if (id === 'toggleVisibilitySelectionLabel') return toggleVisibilitySelectionLabel;
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
  vm.runInContext(updateVisibilityActionStateSource, context);

  context.updateVisibilityActionState(null);
  assert.equal(toggleVisibilitySelectionBtn.disabled, true);
  assert.equal(toggleVisibilitySelectionIcon.textContent, 'visibility_off');
  assert.equal(toggleVisibilitySelectionLabel.textContent, 'Hide Selected');

  context.updateVisibilityActionState({
    activeSlide: {}
  });
  assert.equal(toggleVisibilitySelectionBtn.disabled, false);
  assert.equal(toggleVisibilitySelectionIcon.textContent, 'visibility');
  assert.equal(toggleVisibilitySelectionLabel.textContent, 'Show Selected');
});

test('updateVisibilityActionState reuses the shared visibility toolbar helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateVisibilityActionStateSource = extractFunctionSource(
    fileContent,
    'function updateVisibilityActionState(doc = getIframeDoc()) {',
    '\n\n    function updateMotionActionState(doc = getIframeDoc()) {'
  );

  const calls = [];
  const toggleVisibilitySelectionBtn = { disabled: true };
  const toggleVisibilitySelectionIcon = { textContent: '' };
  const toggleVisibilitySelectionLabel = { textContent: '' };
  const context = {
    selectedElements: [{ id: 'selected' }],
    isElementHidden() {
      return false;
    },
    SlideNextStudioEditorVisibilityState: {
      syncStudioVisibilityToolbarState(options) {
        const actionState = this.buildStudioVisibilityToolbarState(options.elements, {
          isHidden: options.isHidden,
          canMutateDeck: options.canMutateDeck
        });
        return this.renderStudioVisibilityToolbarState({
          documentRef: options.documentRef,
          actionState
        });
      },
      buildStudioVisibilityActionState() {
        throw new Error('buildStudioVisibilityActionState should not be used when shared toolbar helper exists');
      },
      buildStudioVisibilityToolbarState(elements, options = {}) {
        calls.push({
          elements,
          hasCanMutateDeck: typeof options.canMutateDeck === 'function',
          canToggle: options.canMutateDeck()
        });
        return {
          canToggle: true,
          iconText: 'visibility',
          labelText: 'Show Selected'
        };
      },
      renderStudioVisibilityToolbarState(options) {
        return visibilityState.renderStudioVisibilityToolbarState(options);
      }
    },
    document: {
      getElementById(id) {
        if (id === 'toggleVisibilitySelectionBtn') return toggleVisibilitySelectionBtn;
        if (id === 'toggleVisibilitySelectionIcon') return toggleVisibilitySelectionIcon;
        if (id === 'toggleVisibilitySelectionLabel') return toggleVisibilitySelectionLabel;
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
  vm.runInContext(updateVisibilityActionStateSource, context);

  context.updateVisibilityActionState({
    activeSlide: {}
  });

  assert.equal(toggleVisibilitySelectionBtn.disabled, false);
  assert.equal(toggleVisibilitySelectionIcon.textContent, 'visibility');
  assert.equal(toggleVisibilitySelectionLabel.textContent, 'Show Selected');
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    elements: [{ id: 'selected' }],
    hasCanMutateDeck: true,
    canToggle: true
  }]);
});

test('updateVisibilityActionState prefers canonical hidden metadata when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateVisibilityActionStateSource = extractFunctionSource(
    fileContent,
    'function isElementLocked(el) {',
    '\n\n    function updateMotionActionState(doc = getIframeDoc()) {'
  );
  const toggleVisibilitySelectionBtn = { disabled: true };
  const toggleVisibilitySelectionIcon = { textContent: '' };
  const toggleVisibilitySelectionLabel = { textContent: '' };
  const selectedElement = {
    dataset: { editorId: 'node-1' }
  };
  const context = {
    selectedElements: [selectedElement],
    SlideNextStudioEditorCanonicalState: canonicalState,
    SlideNextCanonicalDeck: canonicalDeckModel,
    buildEditorCanonicalDeck() {
      return canonicalDeckModel.createCanonicalDeck({
        slides: [{
          id: 'slide-1',
          nodes: [{
            id: 'node-1',
            visibility: { hidden: true }
          }]
        }]
      });
    },
    SlideNextStudioEditorElementState: {
      isStudioElementLocked() {
        return false;
      },
      isStudioElementHidden() {
        return false;
      }
    },
    isElementHidden() {
      return false;
    },
    SlideNextStudioEditorVisibilityState: visibilityState,
    document: {
      getElementById(id) {
        if (id === 'toggleVisibilitySelectionBtn') return toggleVisibilitySelectionBtn;
        if (id === 'toggleVisibilitySelectionIcon') return toggleVisibilitySelectionIcon;
        if (id === 'toggleVisibilitySelectionLabel') return toggleVisibilitySelectionLabel;
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
  vm.runInContext(updateVisibilityActionStateSource, context);

  context.updateVisibilityActionState({ activeSlide: {} });
  assert.equal(toggleVisibilitySelectionBtn.disabled, false);
  assert.equal(toggleVisibilitySelectionIcon.textContent, 'visibility');
  assert.equal(toggleVisibilitySelectionLabel.textContent, 'Show Selected');
});

test('updateVisibilityActionState delegates toolbar state assembly to the shared visibility view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateVisibilityActionStateSource = extractFunctionSource(
    fileContent,
    'function updateVisibilityActionState(doc = getIframeDoc()) {',
    '\n\n    function updateMotionActionState(doc = getIframeDoc()) {'
  );
  const selectedElement = { id: 'selected' };
  const calls = [];
  const context = {
    selectedElements: [selectedElement],
    isElementHidden() {
      return false;
    },
    SlideNextStudioEditorVisibilityState: {
      syncStudioVisibilityToolbarState(options) {
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
  vm.runInContext(updateVisibilityActionStateSource, context);

  const doc = { activeSlide: {} };
  assert.equal(context.updateVisibilityActionState(doc), 'delegated');
  assert.equal(calls.length, 1);
  assert.match(updateVisibilityActionStateSource, /elements: getStudioSelectedElements\(doc\)/);
  assert.equal(calls[0].documentRef, context.document);
  assert.deepEqual(calls[0].elements, [selectedElement]);
  assert.equal(calls[0].isHidden, context.isElementHidden);
  assert.equal(calls[0].canMutateDeck(), true);
});

test('toggleSelectedElementsVisibility returns false and skips persistence when planned targets disconnect before apply', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toggleSelectedElementsVisibilitySource = extractFunctionSource(
    fileContent,
    'function toggleSelectedElementsVisibility(options = {}) {',
    '\n\n    // Helper: RGB to hex converters'
  );

  const disconnectedTarget = { isConnected: false };
  const calls = [];
  const context = {
    selectedElements: [disconnectedTarget],
    SlideNextStudioEditorSelection: {
      syncStudioSelectionUi() {
        calls.push(['syncStudioSelectionUi']);
      }
    },
    SlideNextStudioEditorVisibilityState: {
      applyStudioVisibilityWithTransaction: visibilityState.applyStudioVisibilityWithTransaction,
      buildStudioVisibilityMutationPlan() {
        calls.push(['buildStudioVisibilityMutationPlan']);
        return {
          didChange: true,
          selection: [disconnectedTarget],
          shouldHide: true,
          versionLabel: 'Auto: Hid Element'
        };
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
    isElementHidden() {
      calls.push(['isElementHidden']);
      return false;
    },
    refreshSelectionClasses() {
      calls.push(['refreshSelectionClasses']);
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    setElementHiddenState() {
      calls.push(['setElementHiddenState']);
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
  loadVisibilityMutationHelper(fileContent, context);
  installLockVisibilityController(context);
  vm.runInContext(toggleSelectedElementsVisibilitySource, context);

  assert.equal(context.toggleSelectedElementsVisibility(), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioVisibilityMutationPlan']
  ]);
});

test('toggleSelectedElementsVisibility returns true after hiding live targets and persisting the change', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toggleSelectedElementsVisibilitySource = extractFunctionSource(
    fileContent,
    'function toggleSelectedElementsVisibility(options = {}) {',
    '\n\n    // Helper: RGB to hex converters'
  );

  const liveTarget = { isConnected: true };
  const calls = [];
  const context = {
    selectedElements: [liveTarget],
    SlideNextStudioEditorSelection: {
      syncStudioSelectionUiAfterMutation(selection, options) {
        options.refreshSelectionClasses();
        calls.push(['syncStudioSelectionUiAfterMutation', selection, Object.keys(options).sort()]);
        return selection;
      }
    },
    SlideNextStudioEditorVisibilityState: {
      applyStudioVisibilityWithTransaction: visibilityState.applyStudioVisibilityWithTransaction,
      buildStudioVisibilityMutationPlan() {
        calls.push(['buildStudioVisibilityMutationPlan']);
        return {
          didChange: true,
          selection: [liveTarget],
          shouldHide: true,
          versionLabel: 'Auto: Hid Element'
        };
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
    isElementHidden(element) {
      calls.push(['isElementHidden', element]);
      return false;
    },
    refreshSelectionClasses() {
      calls.push(['refreshSelectionClasses']);
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    setElementHiddenState(element, shouldHide) {
      calls.push(['setElementHiddenState', element, shouldHide]);
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
  loadVisibilityMutationHelper(fileContent, context);
  installLockVisibilityController(context);
  vm.runInContext(toggleSelectedElementsVisibilitySource, context);

  assert.equal(context.toggleSelectedElementsVisibility(), true);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioVisibilityMutationPlan'],
    ['isElementHidden', liveTarget],
    ['setElementHiddenState', liveTarget, true],
    ['refreshSelectionClasses'],
    ['syncStudioSelectionUiAfterMutation', [liveTarget], ['refreshSelectionClasses', 'syncInspectorForSelection', 'syncSelectionOverlay', 'updateLayersList']],
    ['saveHistoryState'],
    ['triggerAutoSave'],
    ['triggerAutoVersion', 'Auto: Hid Element']
  ]);
});

test('toggleSelectedElementsVisibility captures a reversible visibility transaction', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toggleSelectedElementsVisibilitySource = extractFunctionSource(
    fileContent,
    'function toggleSelectedElementsVisibility(options = {}) {',
    '\n\n    // Helper: RGB to hex converters'
  );
  const attributes = {};
  const classNames = new Set();
  const liveTarget = {
    isConnected: true,
    dataset: {},
    hidden: false,
    style: {
      display: '',
      removeProperty(name) {
        if (name === 'display') this.display = '';
      }
    },
    classList: {
      contains(name) {
        return classNames.has(name);
      },
      add(name) {
        classNames.add(name);
      },
      remove(name) {
        classNames.delete(name);
      }
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null;
    },
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    removeAttribute(name) {
      delete attributes[name];
    }
  };
  let finalized = null;
  const context = {
    selectedElements: [liveTarget],
    SlideNextStudioEditorTransaction: studioTransaction,
    SlideNextStudioEditorSelection: {
      syncStudioSelectionUi() {}
    },
    SlideNextStudioEditorVisibilityState: {
      applyStudioVisibilityWithTransaction: visibilityState.applyStudioVisibilityWithTransaction,
      buildStudioVisibilityMutationPlan() {
        return {
          didChange: true,
          selection: [liveTarget],
          shouldHide: true,
          versionLabel: 'Auto: Hid Element'
        };
      }
    },
    SlideNextStudioElementState: studioElementState,
    assignEditorElementId(element) {
      element.dataset.editorId = 'node-1';
    },
    getActiveSlide() {
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      return { label: 'iframe-doc' };
    },
    isElementHidden: studioElementState.isStudioElementHidden,
    refreshSelectionClasses() {},
    setElementHiddenState: studioElementState.setStudioElementHiddenState,
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
  loadVisibilityMutationHelper(fileContent, context);
  installLockVisibilityController(context);
  vm.runInContext(toggleSelectedElementsVisibilitySource, context);

  assert.equal(context.toggleSelectedElementsVisibility(), true);
  assert.equal(liveTarget.hidden, true);
  assert.deepEqual(JSON.parse(JSON.stringify(finalized)), {
    versionLabel: 'Auto: Hid Element',
    options: {
      refreshThumbnails: false,
      transaction: {
        kind: 'slidenext.editor.transaction',
        version: 1,
        operations: [{
          type: 'visibility',
          elementId: 'node-1',
          before: {
            hidden: false,
            display: '',
            ariaHidden: null,
            hasHiddenClass: false,
            dataset: {}
          },
          after: {
            hidden: true,
            display: 'none',
            ariaHidden: 'true',
            hasHiddenClass: true,
            dataset: {
              editorHidden: 'true',
              editorPrevDisplay: '',
              editorPrevAriaHidden: ''
            }
          }
        }]
      }
    }
  });
});

test('toggleSelectedElementsVisibility forwards an immutable canonical visibility sidecar', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toggleSelectedElementsVisibilitySource = extractFunctionSource(
    fileContent,
    'function toggleSelectedElementsVisibility(options = {}) {',
    '\n\n    // Helper: RGB to hex converters'
  );
  const liveTarget = { isConnected: true, dataset: {} };
  const canonicalDeckBefore = canonicalDeckModel.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', visibility: { hidden: false } }]
    }]
  });
  let finalized = null;
  const context = {
    selectedElements: [liveTarget],
    SlideNextCanonicalDeck: canonicalDeckModel,
    SlideNextStudioEditorCanonicalVisibility: canonicalVisibility,
    SlideNextStudioEditorVisibilityState: {
      applyStudioVisibilityWithTransaction: visibilityState.applyStudioVisibilityWithTransaction,
      buildStudioVisibilityMutationPlan() {
        return {
          didChange: true,
          selection: [liveTarget],
          shouldHide: true,
          versionLabel: 'Auto: Hid Element'
        };
      },
      applyStudioVisibilityMutation() {
        return { didApply: true, transaction: { id: 'tx-visibility' } };
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
    isElementHidden() {
      return false;
    },
    setElementHiddenState() {},
    syncSelectionUiAfterMutation() {},
    finalizeEditorDeckMutation(versionLabel, options) {
      finalized = { versionLabel, options };
    }
  };

  vm.createContext(context);
  loadFinalizeSelectionToggleMutation(fileContent, context);
  loadVisibilityMutationHelper(fileContent, context);
  installLockVisibilityController(context);
  vm.runInContext(toggleSelectedElementsVisibilitySource, context);

  assert.equal(context.toggleSelectedElementsVisibility(), true);
  assert.equal(canonicalDeckBefore.slides[0].nodes[0].visibility.hidden, false);
  assert.equal(finalized.options.canonicalDeck.slides[0].nodes[0].visibility.hidden, true);
  assert.deepEqual(finalized.options.transaction, { id: 'tx-visibility' });
});

test('toggleSelectedElementsVisibility can skip temporary selection UI sync when requested', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toggleSelectedElementsVisibilitySource = extractFunctionSource(
    fileContent,
    'function toggleSelectedElementsVisibility(options = {}) {',
    '\n\n    // Helper: RGB to hex converters'
  );

  const liveTarget = { isConnected: true };
  const calls = [];
  const context = {
    selectedElements: [liveTarget],
    SlideNextStudioEditorSelection: {
      syncStudioSelectionUi(selection, options) {
        calls.push(['syncStudioSelectionUi', selection, Object.keys(options).sort()]);
      }
    },
    SlideNextStudioEditorVisibilityState: {
      applyStudioVisibilityWithTransaction: visibilityState.applyStudioVisibilityWithTransaction,
      buildStudioVisibilityMutationPlan() {
        calls.push(['buildStudioVisibilityMutationPlan']);
        return {
          didChange: true,
          selection: [liveTarget],
          shouldHide: true,
          versionLabel: 'Auto: Hid Element'
        };
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
    isElementHidden(element) {
      calls.push(['isElementHidden', element]);
      return false;
    },
    refreshSelectionClasses() {
      calls.push(['refreshSelectionClasses']);
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    setElementHiddenState(element, shouldHide) {
      calls.push(['setElementHiddenState', element, shouldHide]);
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
  loadVisibilityMutationHelper(fileContent, context);
  installLockVisibilityController(context);
  vm.runInContext(toggleSelectedElementsVisibilitySource, context);

  assert.equal(context.toggleSelectedElementsVisibility({ skipSelectionUi: true }), true);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioVisibilityMutationPlan'],
    ['isElementHidden', liveTarget],
    ['setElementHiddenState', liveTarget, true],
    ['saveHistoryState'],
    ['triggerAutoSave'],
    ['triggerAutoVersion', 'Auto: Hid Element']
  ]);
});

test('toggleSelectedElementsVisibility delegates visibility application to the shared visibility module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toggleSelectedElementsVisibilitySource = extractFunctionSource(
    fileContent,
    'function toggleSelectedElementsVisibility(options = {}) {',
    '\n\n    // Helper: RGB to hex converters'
  );
  const liveTarget = { isConnected: true, dataset: {} };
  const calls = [];
  const context = {
    selectedElements: [liveTarget],
    SlideNextStudioEditorVisibilityState: {
      applyStudioVisibilityWithTransaction: visibilityState.applyStudioVisibilityWithTransaction,
      buildStudioVisibilityMutationPlan() {
        return {
          didChange: true,
          selection: [liveTarget],
          shouldHide: true,
          versionLabel: 'Auto: Hid Element'
        };
      },
      applyStudioVisibilityWithTransaction(selection, shouldHide, options) {
        calls.push(['applyStudioVisibilityWithTransaction', selection, shouldHide, options]);
        return { didApply: true, transaction: { type: 'visibility' } };
      }
    },
    SlideNextStudioElementState: {
      getStudioElementVisibilityState() {
        return {};
      }
    },
    getActiveSlide() {
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      return {};
    },
    isElementHidden() {
      return false;
    },
    setElementHiddenState() {},
    syncSelectionUiAfterMutation() {},
    finalizeEditorDeckMutation(label, options) {
      calls.push(['finalizeEditorDeckMutation', label, options]);
    }
  };

  vm.createContext(context);
  loadFinalizeSelectionToggleMutation(fileContent, context);
  loadVisibilityMutationHelper(fileContent, context);
  installLockVisibilityController(context);
  vm.runInContext(toggleSelectedElementsVisibilitySource, context);

  assert.equal(context.toggleSelectedElementsVisibility(), true);
  assert.equal(calls[0][0], 'applyStudioVisibilityWithTransaction');
  assert.equal(calls[0][1][0], liveTarget);
  assert.equal(calls[0][2], true);
  assert.equal(typeof calls[0][3].getVisibilityState, 'function');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1])), ['finalizeEditorDeckMutation', 'Auto: Hid Element', {
    refreshThumbnails: false,
    transaction: { type: 'visibility' }
  }]);
});

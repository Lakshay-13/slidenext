const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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
      buildStudioVisibilityActionState(elements, options = {}) {
        const canToggle = typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true;
        return {
          canToggle,
          allHidden: canToggle
        };
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

test('toggleSelectedElementsVisibility returns false and skips persistence when planned targets disconnect before apply', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toggleSelectedElementsVisibilitySource = extractFunctionSource(
    fileContent,
    'function toggleSelectedElementsVisibility() {',
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
  loadFinalizeEditorDeckMutation(fileContent, context);
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
    'function toggleSelectedElementsVisibility() {',
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
  loadFinalizeEditorDeckMutation(fileContent, context);
  vm.runInContext(toggleSelectedElementsVisibilitySource, context);

  assert.equal(context.toggleSelectedElementsVisibility(), true);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioVisibilityMutationPlan'],
    ['isElementHidden', liveTarget],
    ['setElementHiddenState', liveTarget, true],
    ['refreshSelectionClasses'],
    ['syncStudioSelectionUi', [liveTarget], ['syncInspectorForSelection', 'syncSelectionOverlay', 'updateLayersList']],
    ['saveHistoryState'],
    ['triggerAutoSave'],
    ['triggerAutoVersion', 'Auto: Hid Element']
  ]);
});

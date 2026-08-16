const test = require('node:test');
const assert = require('node:assert/strict');

const studioSelection = require('../shared/studio-editor-selection.js');

test('buildStudioEditorSelectionOptions scopes editable elements to the active slide', () => {
  const activeElement = { id: 'active' };
  const offSlideElement = { id: 'off-slide' };
  const activeSlide = {
    contains(element) {
      return element === activeElement;
    }
  };

  const options = studioSelection.buildStudioEditorSelectionOptions({
    doc: { id: 'editor-doc' },
    activeSlide,
    isEditableElement: (element) => !!element,
    getElementId: (element) => element.id,
    getElementById: () => null,
    getActiveSlide: () => activeSlide
  });

  assert.equal(options.selectionClassName, 'editor-selected');
  assert.equal(options.isEligibleElement(activeElement), true);
  assert.equal(options.isEligibleElement(offSlideElement), false);
  assert.equal(options.getElementId(activeElement), 'active');
});

test('getStudioSelectedElementIds reuses live selection normalization', () => {
  const first = { id: 'first', isConnected: true, eligible: true };
  const second = { id: 'second', isConnected: true, eligible: true };
  const stale = { id: 'stale', isConnected: false, eligible: true };

  assert.deepEqual(studioSelection.getStudioSelectedElementIds([
    first,
    stale,
    first,
    second
  ], {
    isEligibleElement: (element) => element.eligible,
    getElementId: (element) => element.id
  }), ['first', 'second']);
});

test('restoreStudioSelectionAfterSlideMutation preserves selection before restoring committed ids', () => {
  const calls = [];
  const activeElement = {
    isConnected: true,
    classList: {
      add() {},
      remove() {}
    }
  };
  const activeSlide = {
    contains(element) {
      return element === activeElement;
    }
  };
  const doc = {
    querySelectorAll() {
      return [];
    }
  };

  const result = studioSelection.restoreStudioSelectionAfterSlideMutation(['element-1'], doc, {
    preserveSelection() {
      calls.push('preserveSelection');
    },
    getActiveSlide() {
      calls.push('getActiveSlide');
      return activeSlide;
    },
    getElementById(id) {
      calls.push(['getElementById', id]);
      return id === 'element-1' ? activeElement : null;
    },
    applySelectionState() {
      calls.push('applySelectionState');
    },
    syncSelectionOverlay() {
      calls.push('syncSelectionOverlay');
    },
    syncInspectorForSelection() {
      calls.push('syncInspectorForSelection');
    },
    updateLayersList() {
      calls.push('updateLayersList');
    }
  });

  assert.equal(result.restored, true);
  assert.deepEqual(calls, [
    'preserveSelection',
    'getActiveSlide',
    ['getElementById', 'element-1'],
    'applySelectionState',
    'syncSelectionOverlay',
    'syncInspectorForSelection',
    'updateLayersList'
  ]);
});

test('syncStudioSelectionUiAfterMutation refreshes classes before selection chrome', () => {
  const selectedElements = [{ id: 'node-1' }];
  const calls = [];

  const result = studioSelection.syncStudioSelectionUiAfterMutation(selectedElements, {
    refreshSelectionClasses() {
      calls.push('refreshSelectionClasses');
    },
    syncSelectionOverlay() {
      calls.push('syncSelectionOverlay');
    },
    syncInspectorForSelection() {
      calls.push('syncInspectorForSelection');
    },
    updateLayersList() {
      calls.push('updateLayersList');
    }
  });

  assert.equal(result, selectedElements);
  assert.deepEqual(calls, [
    'refreshSelectionClasses',
    'syncSelectionOverlay',
    'syncInspectorForSelection',
    'updateLayersList'
  ]);
});

test('selection UI refreshes preserve the explicit editor document', () => {
  const documentRef = { id: 'iframe-document' };
  const selectedElement = { id: 'node-1', ownerDocument: documentRef };
  const receivedDocuments = [];
  const receivedUiDocuments = [];

  studioSelection.commitStudioSelectionState({
    selectedElements: [selectedElement],
    selectedElement
  }, {
    doc: documentRef,
    refreshSelectionClasses(doc) {
      receivedDocuments.push(doc);
    },
    syncSelectionOverlay(doc) {
      receivedUiDocuments.push(['overlay', doc]);
    },
    syncInspectorForSelection(doc) {
      receivedUiDocuments.push(['inspector', doc]);
    },
    updateLayersList(doc) {
      receivedUiDocuments.push(['layers', doc]);
    }
  });
  studioSelection.syncStudioSelectionUiAfterMutation([selectedElement], {
    refreshSelectionClasses(doc) {
      receivedDocuments.push(doc);
    },
    syncSelectionOverlay(doc) {
      receivedUiDocuments.push(['overlay', doc]);
    },
    syncInspectorForSelection(doc) {
      receivedUiDocuments.push(['inspector', doc]);
    },
    updateLayersList(doc) {
      receivedUiDocuments.push(['layers', doc]);
    }
  });

  assert.deepEqual(receivedDocuments, [documentRef, documentRef]);
  assert.deepEqual(receivedUiDocuments, [
    ['overlay', documentRef],
    ['inspector', documentRef],
    ['layers', documentRef],
    ['overlay', documentRef],
    ['inspector', documentRef],
    ['layers', documentRef]
  ]);
});

test('selectStudioElement resolves the target and commits additive selection state', () => {
  const currentSelection = [{ id: 'node-1' }];
  const target = { id: 'node-2' };
  const calls = [];

  assert.equal(studioSelection.selectStudioElement({
    element: { id: 'raw-node' },
    selectedElements: currentSelection,
    additive: true,
    resolveEditableTarget(element) {
      calls.push(['resolveEditableTarget', element]);
      return target;
    },
    getSelectionOptions() {
      calls.push(['getSelectionOptions']);
      return {};
    },
    commitSelectionState(nextSelectionState) {
      calls.push(['commitSelectionState', nextSelectionState]);
    }
  }), true);

  assert.deepEqual(calls.map(([name]) => name), [
    'resolveEditableTarget',
    'getSelectionOptions',
    'commitSelectionState'
  ]);
  assert.deepEqual(calls[2][1], {
    selectedElements: [currentSelection[0], target],
    selectedElement: currentSelection[0]
  });
});

test('selectStudioElement skips commit when the target is not editable', () => {
  const calls = [];

  assert.equal(studioSelection.selectStudioElement({
    element: { id: 'raw-node' },
    resolveEditableTarget() {
      calls.push('resolveEditableTarget');
      return null;
    },
    commitSelectionState() {
      calls.push('commitSelectionState');
    }
  }), false);
  assert.deepEqual(calls, ['resolveEditableTarget']);
});

test('selectStudioElement skips ineligible resolved targets before committing', () => {
  const calls = [];

  assert.equal(studioSelection.selectStudioElement({
    element: { id: 'decorative-canvas' },
    resolveEditableTarget(element) {
      calls.push(['resolveEditableTarget', element]);
      return element;
    },
    getSelectionOptions() {
      calls.push('getSelectionOptions');
      return {
        isEligibleElement: () => false
      };
    },
    commitSelectionState() {
      calls.push('commitSelectionState');
    }
  }), false);
  assert.deepEqual(calls.map((call) => Array.isArray(call) ? call[0] : call), [
    'resolveEditableTarget',
    'getSelectionOptions'
  ]);
});

test('deselectStudioElement clears selection and hides the drag HUD on clear', () => {
  const calls = [];
  const hideDragHud = () => {};

  assert.equal(studioSelection.deselectStudioElement({
    hideDragHud,
    commitSelectionState(nextSelectionState, options) {
      calls.push([nextSelectionState, options]);
    }
  }), true);

  assert.deepEqual(calls[0][0], {
    selectedElements: [],
    selectedElement: null
  });
  assert.equal(calls[0][1].hideDragHud, hideDragHud);
  assert.equal(calls[0][1].hideDragHudOnClear, true);
});

test('selectAllStudioElementsOnActiveSlide commits the normalized active-slide layer order', () => {
  const activeSlide = { id: 'slide-1' };
  const elements = [{ id: 'node-1' }, { id: 'node-2' }];
  const calls = [];

  assert.equal(studioSelection.selectAllStudioElementsOnActiveSlide({
    doc: { id: 'doc-1' },
    getActiveSlide(doc) {
      calls.push(['getActiveSlide', doc]);
      return activeSlide;
    },
    getElements(slide) {
      calls.push(['getElements', slide]);
      return elements;
    },
    getSelectionOptions(options) {
      calls.push(['getSelectionOptions', options]);
      return {};
    },
    commitSelectionState(nextSelectionState) {
      calls.push(['commitSelectionState', nextSelectionState]);
    }
  }), true);

  assert.deepEqual(calls.map(([name]) => name), [
    'getActiveSlide',
    'getElements',
    'getSelectionOptions',
    'commitSelectionState'
  ]);
  assert.equal(calls[2][1].activeSlide, activeSlide);
  assert.deepEqual(calls[3][1], {
    selectedElements: elements,
    selectedElement: elements[0]
  });
});

test('selectAllStudioElementsOnActiveSlide excludes elements rejected by the select-all filter', () => {
  const activeSlide = { id: 'slide-1' };
  const unlocked = { id: 'unlocked' };
  const locked = { id: 'locked' };
  const hidden = { id: 'hidden' };
  let committedSelection = null;

  assert.equal(studioSelection.selectAllStudioElementsOnActiveSlide({
    getActiveSlide() {
      return activeSlide;
    },
    getElements() {
      return [unlocked, locked, hidden];
    },
    isSelectableElement(element) {
      return element !== locked && element !== hidden;
    },
    commitSelectionState(nextSelectionState) {
      committedSelection = nextSelectionState;
    }
  }), true);

  assert.deepEqual(committedSelection, {
    selectedElements: [unlocked],
    selectedElement: unlocked
  });
});

test('selectAllStudioElementsOnActiveSlide returns false without an active slide or elements', () => {
  assert.equal(studioSelection.selectAllStudioElementsOnActiveSlide({
    getActiveSlide() {
      return null;
    },
    commitSelectionState() {
      throw new Error('should not commit without an active slide');
    }
  }), false);

  assert.equal(studioSelection.selectAllStudioElementsOnActiveSlide({
    getActiveSlide() {
      return { id: 'slide-1' };
    },
    getElements() {
      return [];
    },
    commitSelectionState() {
      throw new Error('should not commit without elements');
    }
  }), false);
});

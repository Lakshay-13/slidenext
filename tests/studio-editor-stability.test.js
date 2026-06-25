const test = require('node:test');
const assert = require('node:assert/strict');

const selection = require('../shared/studio-editor-selection.js');
const deckView = require('../shared/studio-deck-view.js');

function createClassList(initialValues = []) {
  const values = new Set(initialValues);
  return {
    add(...nextValues) {
      nextValues.forEach((value) => values.add(value));
    },
    remove(...nextValues) {
      nextValues.forEach((value) => values.delete(value));
    },
    contains(value) {
      return values.has(value);
    }
  };
}

function createElement(id, options = {}) {
  return {
    editorId: id,
    isConnected: options.isConnected !== false,
    classList: createClassList(options.classNames || []),
    ineligible: !!options.ineligible
  };
}

function createSlide(elements = []) {
  const elementSet = new Set(elements);
  return {
    contains(element) {
      return elementSet.has(element);
    }
  };
}

function createSelectionDoc(elements = []) {
  return {
    querySelectorAll(selector) {
      if (selector !== '.editor-selected') {
        return [];
      }
      return elements.filter((element) => element.classList.contains('editor-selected'));
    }
  };
}

function createSelectionOptions(activeSlide, elementsById) {
  return {
    selectionClassName: 'editor-selected',
    isEligibleElement: (element) => !element.ineligible,
    getElementId: (element) => element.editorId,
    getActiveSlide: () => activeSlide,
    getElementById: (id) => elementsById.get(id) || null
  };
}

test('restoreStudioSelectionByIdsOnActiveSlide restores only connected elements on the active slide', () => {
  const activeElement = createElement('active');
  const offSlideElement = createElement('off-slide', { classNames: ['editor-selected'] });
  const disconnectedElement = createElement('disconnected', { isConnected: false });
  const activeSlide = createSlide([activeElement, disconnectedElement]);
  const otherSlide = createSlide([offSlideElement]);
  const doc = createSelectionDoc([activeElement, offSlideElement, disconnectedElement]);
  const elementsById = new Map([
    ['active', activeElement],
    ['off-slide', offSlideElement],
    ['disconnected', disconnectedElement]
  ]);

  assert.equal(otherSlide.contains(offSlideElement), true);

  const result = selection.restoreStudioSelectionByIdsOnActiveSlide(
    ['active', 'off-slide', 'disconnected'],
    doc,
    createSelectionOptions(activeSlide, elementsById)
  );

  assert.equal(result.restored, true);
  assert.deepEqual(result.selectedElements, [activeElement]);
  assert.equal(result.selectedElement, activeElement);
  assert.equal(activeElement.classList.contains('editor-selected'), true);
  assert.equal(offSlideElement.classList.contains('editor-selected'), false);
  assert.equal(disconnectedElement.classList.contains('editor-selected'), false);
});

test('restoreStudioSelectionByIdsOnActiveSlide clears stale selection when there is nothing to restore', () => {
  const staleElement = createElement('stale', { classNames: ['editor-selected'] });
  const activeSlide = createSlide([]);
  const doc = createSelectionDoc([staleElement]);
  const elementsById = new Map([['stale', staleElement]]);

  const result = selection.restoreStudioSelectionByIdsOnActiveSlide(
    ['stale'],
    doc,
    createSelectionOptions(activeSlide, elementsById)
  );

  assert.equal(result.restored, false);
  assert.deepEqual(result.selectedElements, []);
  assert.equal(result.selectedElement, null);
  assert.equal(staleElement.classList.contains('editor-selected'), false);
});

test('commitStudioSelectionState triggers the expected UI sync hooks', () => {
  const selectedElement = createElement('selected');
  const calls = {
    applySelectionState: 0,
    refreshSelectionClasses: 0,
    syncSelectionOverlay: 0,
    hideDragHud: 0,
    syncInspectorForSelection: 0,
    updateLayersList: 0
  };
  let appliedState = null;

  const result = selection.commitStudioSelectionState(
    {
      selectedElements: [],
      selectedElement: null
    },
    {
      applySelectionState(nextState) {
        calls.applySelectionState += 1;
        appliedState = nextState;
      },
      refreshSelectionClasses() {
        calls.refreshSelectionClasses += 1;
      },
      syncSelectionOverlay() {
        calls.syncSelectionOverlay += 1;
      },
      hideDragHud() {
        calls.hideDragHud += 1;
      },
      hideDragHudOnClear: true,
      syncInspectorForSelection() {
        calls.syncInspectorForSelection += 1;
      },
      updateLayersList() {
        calls.updateLayersList += 1;
      }
    }
  );

  assert.deepEqual(result, { selectedElements: [], selectedElement: null });
  assert.deepEqual(appliedState, { selectedElements: [], selectedElement: null });
  assert.deepEqual(calls, {
    applySelectionState: 1,
    refreshSelectionClasses: 1,
    syncSelectionOverlay: 1,
    hideDragHud: 1,
    syncInspectorForSelection: 1,
    updateLayersList: 1
  });

  const retainedSelectionResult = selection.commitStudioSelectionState(
    {
      selectedElements: [selectedElement],
      selectedElement
    },
    {
      hideDragHud() {
        calls.hideDragHud += 1;
      },
      hideDragHudOnClear: true
    }
  );

  assert.deepEqual(retainedSelectionResult, {
    selectedElements: [selectedElement],
    selectedElement
  });
  assert.equal(calls.hideDragHud, 1);
});

test('restoreStudioDeckViewAfterSlideMutation prefers the preserved active slide before falling back', () => {
  const calls = {
    restoreActiveSlideById: [],
    restoreSelectionState: 0,
    setActiveSlideByIndex: []
  };

  const restored = deckView.restoreStudioDeckViewAfterSlideMutation({
    preservedActiveSlideId: 'slide-2',
    removedSlideId: 'slide-3',
    restoreActiveSlideById(slideId) {
      calls.restoreActiveSlideById.push(slideId);
      return slideId === 'slide-2';
    },
    restoreSelectionState() {
      calls.restoreSelectionState += 1;
    },
    fallbackIndex: 0,
    setActiveSlideByIndex(index) {
      calls.setActiveSlideByIndex.push(index);
    }
  });

  assert.deepEqual(restored, {
    didRestorePreservedActiveSlide: true,
    activeSlideId: 'slide-2',
    fallbackIndex: null
  });
  assert.deepEqual(calls, {
    restoreActiveSlideById: ['slide-2'],
    restoreSelectionState: 1,
    setActiveSlideByIndex: []
  });

  const fellBack = deckView.restoreStudioDeckViewAfterSlideMutation({
    preservedActiveSlideId: 'slide-2',
    removedSlideId: 'slide-2',
    restoreActiveSlideById(slideId) {
      calls.restoreActiveSlideById.push(slideId);
      return true;
    },
    restoreSelectionState() {
      calls.restoreSelectionState += 1;
    },
    fallbackIndex: 4,
    setActiveSlideByIndex(index) {
      calls.setActiveSlideByIndex.push(index);
    }
  });

  assert.deepEqual(fellBack, {
    didRestorePreservedActiveSlide: false,
    activeSlideId: '',
    fallbackIndex: 4
  });
  assert.deepEqual(calls, {
    restoreActiveSlideById: ['slide-2'],
    restoreSelectionState: 1,
    setActiveSlideByIndex: [4]
  });
});

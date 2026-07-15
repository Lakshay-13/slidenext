const test = require('node:test');
const assert = require('node:assert/strict');

const layerController = require('../shared/studio-editor-layer-controller.js');

test('resolveStudioLayerRowElement resolves live elements from stable row ids', () => {
  const row = { dataset: { editorElementId: 'node-1' } };
  const liveElement = { id: 'node-1' };
  const calls = [];

  assert.equal(layerController.resolveStudioLayerRowElement({
    row,
    getElementByEditorId(id) {
      calls.push(id);
      return liveElement;
    }
  }), liveElement);
  assert.deepEqual(calls, ['node-1']);
});

test('resolveStudioLayerRowElement returns null for stale or incomplete rows', () => {
  const calls = [];
  const getElementByEditorId = (id) => {
    calls.push(id);
    return { id };
  };

  assert.equal(layerController.resolveStudioLayerRowElement({
    row: null,
    getElementByEditorId
  }), null);
  assert.equal(layerController.resolveStudioLayerRowElement({
    row: { dataset: {} },
    getElementByEditorId
  }), null);
  assert.equal(layerController.resolveStudioLayerRowElement({
    row: { dataset: { editorElementId: 'missing' } },
    getElementByEditorId() {
      return null;
    }
  }), null);
  assert.deepEqual(calls, []);
});

test('selectStudioLayerElementByRef refreshes stale rows and preserves selection modifiers', () => {
  const row = { id: 'row-1' };
  const target = { id: 'node-1' };
  const calls = [];
  const createEvent = (shiftKey) => ({
    currentTarget: {
      closest(selector) {
        calls.push(['closest', selector]);
        return row;
      }
    },
    preventDefault() {
      calls.push(['preventDefault']);
    },
    stopPropagation() {
      calls.push(['stopPropagation']);
    },
    shiftKey
  });

  assert.equal(layerController.selectStudioLayerElementByRef({
    event: createEvent(false),
    resolveLayerRowElement(currentRow) {
      calls.push(['resolveLayerRowElement', currentRow]);
      return null;
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    },
    selectElement() {
      calls.push(['selectElement']);
    }
  }), false);

  assert.equal(layerController.selectStudioLayerElementByRef({
    event: createEvent(true),
    resolveLayerRowElement(currentRow) {
      calls.push(['resolveLayerRowElement', currentRow]);
      return target;
    },
    selectElement(nextTarget, options) {
      calls.push(['selectElement', nextTarget, options]);
    }
  }), true);

  assert.deepEqual(calls.map(([name]) => name), [
    'preventDefault',
    'stopPropagation',
    'closest',
    'resolveLayerRowElement',
    'updateLayersList',
    'preventDefault',
    'stopPropagation',
    'closest',
    'resolveLayerRowElement',
    'selectElement'
  ]);
  assert.equal(calls[8][1], row);
  assert.equal(calls[9][1], target);
  assert.deepEqual(calls[9][2], { additive: true, toggle: true });
});

test('toggleStudioLayerVisibilityByRef restores the committed selection after a failed toggle', () => {
  const row = { id: 'row-1' };
  const target = { id: 'node-1' };
  const calls = [];
  const event = {
    currentTarget: {
      closest(selector) {
        calls.push(['closest', selector]);
        return row;
      }
    },
    preventDefault() {
      calls.push(['preventDefault']);
    },
    stopPropagation() {
      calls.push(['stopPropagation']);
    }
  };

  assert.equal(layerController.toggleStudioLayerVisibilityByRef({
    event,
    resolveLayerRowElement(currentRow) {
      calls.push(['resolveLayerRowElement', currentRow]);
      return target;
    },
    getCommittedSelectedEditorElementIds() {
      calls.push(['getCommittedSelectedEditorElementIds']);
      return ['node-2'];
    },
    applyEditorSelectionState(nextState) {
      calls.push(['applyEditorSelectionState', nextState]);
    },
    refreshSelectionClasses() {
      calls.push(['refreshSelectionClasses']);
    },
    toggleSelectedElementsVisibility(options) {
      calls.push(['toggleSelectedElementsVisibility', options]);
      return false;
    },
    restoreCommittedSelectionByIdsOnActiveSlide(ids) {
      calls.push(['restoreCommittedSelectionByIdsOnActiveSlide', ids]);
    }
  }), false);

  assert.deepEqual(calls.map(([name]) => name), [
    'preventDefault',
    'stopPropagation',
    'closest',
    'resolveLayerRowElement',
    'getCommittedSelectedEditorElementIds',
    'applyEditorSelectionState',
    'refreshSelectionClasses',
    'toggleSelectedElementsVisibility',
    'restoreCommittedSelectionByIdsOnActiveSlide'
  ]);
  assert.equal(calls[5][1].selectedElement, target);
  assert.deepEqual(calls[7][1], { skipSelectionUi: true });
  assert.deepEqual(calls[8][1], ['node-2']);
});

test('toggleStudioLayerVisibilityByRef refreshes stale rows without mutating selection', () => {
  const row = { id: 'row-1' };
  const calls = [];
  const event = {
    currentTarget: {
      closest(selector) {
        calls.push(['closest', selector]);
        return row;
      }
    },
    preventDefault() {
      calls.push(['preventDefault']);
    },
    stopPropagation() {
      calls.push(['stopPropagation']);
    }
  };

  assert.equal(layerController.toggleStudioLayerVisibilityByRef({
    event,
    resolveLayerRowElement(currentRow) {
      calls.push(['resolveLayerRowElement', currentRow]);
      return null;
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    },
    getCommittedSelectedEditorElementIds() {
      calls.push(['getCommittedSelectedEditorElementIds']);
      return ['node-2'];
    }
  }), false);

  assert.deepEqual(calls.map(([name]) => name), [
    'preventDefault',
    'stopPropagation',
    'closest',
    'resolveLayerRowElement',
    'updateLayersList'
  ]);
});

test('syncStudioLayerList assembles live layer action state before shared rendering', () => {
  const iframeDoc = { id: 'iframe-doc' };
  const activeSlide = { id: 'slide-1' };
  const liveElement = { id: 'node-1' };
  const renderCalls = [];
  const documentRef = {
    getElementById() {
      return null;
    }
  };
  const deckSnapshot = {
    activeSlideId: 'slide-1',
    slides: [{
      id: 'slide-1',
      elements: [{ id: 'node-1', isLocked: false }]
    }]
  };

  assert.equal(layerController.syncStudioLayerList({
    documentRef,
    iframeDoc,
    layerView: {
      renderStudioLayersListInDocument(options) {
        renderCalls.push(options);
        return true;
      }
    },
    getActiveSlide(doc) {
      assert.equal(doc, iframeDoc);
      return activeSlide;
    },
    getNormalizedSlideLayerOrder(slide) {
      assert.equal(slide, activeSlide);
      return [liveElement];
    },
    buildEditorDeckSnapshot(doc, options) {
      assert.equal(doc, iframeDoc);
      assert.deepEqual(options, { includeLayers: true });
      return deckSnapshot;
    },
    getElementByEditorId(id, doc) {
      assert.equal(id, 'node-1');
      assert.equal(doc, iframeDoc);
      return liveElement;
    },
    buildLayerOrderSelectionActionState(elements, options) {
      assert.deepEqual(elements, [liveElement]);
      assert.equal(options.slide, activeSlide);
      assert.deepEqual(options.orderedElements, [liveElement]);
      assert.equal(options.canMutateDeck(), true);
      return { canBringForward: true };
    }
  }), true);

  assert.equal(renderCalls.length, 1);
  assert.equal(renderCalls[0].documentRef, documentRef);
  assert.equal(renderCalls[0].activeSlideSnapshot, deckSnapshot.slides[0]);
  assert.deepEqual(renderCalls[0].layers, deckSnapshot.slides[0].elements);
  assert.deepEqual(renderCalls[0].resolveLayerState(deckSnapshot.slides[0].elements[0]), {
    canRunLayerActions: true,
    layerOrderActionState: { canBringForward: true }
  });
});

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
  const iframeDocument = { id: 'iframe-document' };
  const target = { id: 'node-1', ownerDocument: iframeDocument };
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
    getCommittedSelectedEditorElementIds(doc) {
      calls.push(['getCommittedSelectedEditorElementIds', doc]);
      return ['node-2'];
    },
    applyEditorSelectionState(nextState) {
      calls.push(['applyEditorSelectionState', nextState]);
    },
    refreshSelectionClasses(doc) {
      calls.push(['refreshSelectionClasses', doc]);
    },
    toggleSelectedElementsVisibility(options) {
      calls.push(['toggleSelectedElementsVisibility', options]);
      return false;
    },
    restoreCommittedSelectionByIdsOnActiveSlide(ids, doc) {
      calls.push(['restoreCommittedSelectionByIdsOnActiveSlide', ids, doc]);
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
  assert.equal(calls[4][1], iframeDocument);
  assert.equal(calls[5][1].selectedElement, target);
  assert.equal(calls[6][1], iframeDocument);
  assert.deepEqual(calls[7][1], { skipSelectionUi: true, doc: iframeDocument });
  assert.deepEqual(calls[8][1], ['node-2']);
  assert.equal(calls[8][2], iframeDocument);
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

test('changeStudioLayerZIndexByRef refreshes locked rows without reordering', () => {
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

  assert.equal(layerController.changeStudioLayerZIndexByRef({
    event,
    action: 'forward',
    resolveLayerRowElement(currentRow) {
      calls.push(['resolveLayerRowElement', currentRow]);
      return target;
    },
    isElementLocked(element) {
      calls.push(['isElementLocked', element]);
      return true;
    },
    reorderSlideLayers() {
      calls.push(['reorderSlideLayers']);
      return true;
    },
    refreshLayerOrderUi(options) {
      calls.push(['refreshLayerOrderUi', options]);
    }
  }), false);

  assert.deepEqual(calls.map(([name]) => name), [
    'preventDefault',
    'stopPropagation',
    'closest',
    'resolveLayerRowElement',
    'isElementLocked',
    'refreshLayerOrderUi'
  ]);
  assert.deepEqual(calls[5][1], { refreshLayersList: true, result: null });
});

test('changeStudioLayerZIndexByRef finalizes successful reorders and syncs selected z-index', () => {
  const row = { id: 'row-1' };
  const target = { id: 'node-1' };
  const transaction = { id: 'tx-1' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
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

  assert.equal(layerController.changeStudioLayerZIndexByRef({
    event,
    action: 'backward',
    resolveLayerRowElement() {
      calls.push(['resolveLayerRowElement']);
      return target;
    },
    isElementLocked() {
      calls.push(['isElementLocked']);
      return false;
    },
    reorderSlideLayers(action, elements, options) {
      calls.push(['reorderSlideLayers', action, elements]);
      options.onTransaction(transaction);
      options.onCanonicalDeck(canonicalDeck);
      return true;
    },
    liveSelectionApi: {
      isStudioLiveSelectedElement(selection, element) {
        calls.push(['isStudioLiveSelectedElement', selection, element]);
        return true;
      }
    },
    selectedElements: [target],
    syncLayerOrderZIndexInput(element) {
      calls.push(['syncLayerOrderZIndexInput', element]);
    },
    finalizeLayerOrderMutation(label, options) {
      calls.push(['finalizeLayerOrderMutation', label, options]);
    }
  }), true);

  assert.deepEqual(calls.map(([name]) => name), [
    'preventDefault',
    'stopPropagation',
    'closest',
    'resolveLayerRowElement',
    'isElementLocked',
    'reorderSlideLayers',
    'isStudioLiveSelectedElement',
    'syncLayerOrderZIndexInput',
    'finalizeLayerOrderMutation'
  ]);
  assert.equal(calls[5][1], 'backward');
  assert.deepEqual(calls[5][2], [target]);
  assert.equal(calls[7][1], target);
  assert.deepEqual(calls[8][2], { transaction, canonicalDeck });
});

test('arrangeStudioElementLayer refreshes no-ops and finalizes successful reorders', () => {
  const selectedElements = [{ id: 'node-1' }, { id: 'node-2' }];
  const transaction = { id: 'tx-arrange' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const calls = [];

  assert.equal(layerController.arrangeStudioElementLayer({
    action: 'front',
    getSelectedElements() {
      calls.push(['getSelectedElements']);
      return [];
    },
    refreshLayerOrderUi(options) {
      calls.push(['refreshLayerOrderUi', options]);
      return false;
    }
  }), false);

  assert.equal(layerController.arrangeStudioElementLayer({
    action: 'backward',
    getSelectedElements() {
      calls.push(['getSelectedElements']);
      return selectedElements;
    },
    selectionHasLockedElements(elements) {
      calls.push(['selectionHasLockedElements', elements]);
      return false;
    },
    reorderSlideLayers(action, elements, options) {
      calls.push(['reorderSlideLayers', action, elements]);
      options.onTransaction(transaction);
      options.onCanonicalDeck(canonicalDeck);
      return true;
    },
    syncLayerOrderZIndexInput(element) {
      calls.push(['syncLayerOrderZIndexInput', element]);
    },
    finalizeLayerOrderMutation(label, options) {
      calls.push(['finalizeLayerOrderMutation', label, options]);
    }
  }), true);

  assert.deepEqual(calls.map(([name]) => name), [
    'getSelectedElements',
    'refreshLayerOrderUi',
    'getSelectedElements',
    'selectionHasLockedElements',
    'reorderSlideLayers',
    'syncLayerOrderZIndexInput',
    'finalizeLayerOrderMutation'
  ]);
  assert.deepEqual(calls[6][2], { transaction, canonicalDeck });
});

test('arrangeStudioElementLayer forwards the editor document to selection callbacks', () => {
  const documentRef = { id: 'editor-doc' };
  const selectedElements = [{ id: 'node-1' }];
  const calls = [];

  assert.equal(layerController.arrangeStudioElementLayer({
    action: 'front',
    getDocument() {
      calls.push(['getDocument']);
      return documentRef;
    },
    getSelectedElements(currentDoc) {
      calls.push(['getSelectedElements', currentDoc]);
      return selectedElements;
    },
    selectionHasLockedElements(elements, currentDoc) {
      calls.push(['selectionHasLockedElements', elements, currentDoc]);
      assert.equal(currentDoc, documentRef);
      return true;
    },
    refreshLayerOrderUi() {
      calls.push(['refreshLayerOrderUi']);
      return false;
    }
  }), false);

  assert.deepEqual(calls, [
    ['getDocument'],
    ['getSelectedElements', documentRef],
    ['selectionHasLockedElements', selectedElements, documentRef],
    ['refreshLayerOrderUi']
  ]);
});

test('refreshStudioLayerOrderUi preserves layer refresh ordering and result values', () => {
  const calls = [];
  assert.equal(layerController.refreshStudioLayerOrderUi({
    refreshLayersList: true,
    updateLayersList() {
      calls.push('layers');
    },
    updateLayerOrderActionState() {
      calls.push('controls');
    },
    result: true
  }), true);
  assert.deepEqual(calls, ['layers', 'controls']);

  assert.equal(layerController.refreshStudioLayerOrderUi({
    updateLayerOrderActionState() {
      calls.push('controls');
    }
  }), false);
  assert.deepEqual(calls, ['layers', 'controls', 'controls']);
});

test('syncStudioLayerOrderActionState composes active slide state for shared toolbar rendering', () => {
  const documentRef = { id: 'document' };
  const doc = { id: 'iframe-doc' };
  const slide = { id: 'slide-1' };
  const selectedElements = [{ id: 'node-1' }];
  const orderedElements = [{ id: 'node-1' }, { id: 'node-2' }];
  let delegatedOptions = null;

  assert.equal(layerController.syncStudioLayerOrderActionState({
    documentRef,
    doc,
    selectedElements,
    layerOrderApi: {
      syncStudioLayerOrderToolbarState(options) {
        delegatedOptions = options;
        return 'shared-toolbar';
      }
    },
    styleApi: {
      buildStudioStyleMutationPlan() {
        return { canApply: true };
      }
    },
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, doc);
      return slide;
    },
    getNormalizedSlideLayerOrder(nextSlide) {
      assert.equal(nextSlide, slide);
      return orderedElements;
    },
    isLocked() {}
  }), 'shared-toolbar');

  assert.equal(delegatedOptions.documentRef, documentRef);
  assert.deepEqual(delegatedOptions.elements, selectedElements);
  assert.deepEqual(delegatedOptions.orderedElements, orderedElements);
  assert.equal(delegatedOptions.canMutateDeck(), true);
  assert.equal(typeof delegatedOptions.isLocked, 'function');
  assert.equal(delegatedOptions.buildZIndexMutationPlan(selectedElements).canApply, true);
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
      elements: [{ id: 'node-1', isLocked: true }]
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
      assert.equal(options.includeLayers, true);
      assert.equal(options.preferCanonicalLayers, true);
      assert.equal(options.canonicalLayerOptions.isSelectedNode({ id: 'node-1' }), true);
      assert.equal(options.canonicalLayerOptions.isSelectedNode({ id: 'node-2' }), false);
      return deckSnapshot;
    },
    getSelectedElementIds(doc) {
      assert.equal(doc, iframeDoc);
      return ['node-1'];
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
      assert.equal(options.isLocked(liveElement), true);
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

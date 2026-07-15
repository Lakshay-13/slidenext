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

const test = require('node:test');
const assert = require('node:assert/strict');
const thumbnailController = require('../shared/studio-editor-thumbnail-controller.js');

function createController(overrides = {}) {
  const calls = [];
  const iframeDoc = { id: 'iframe-document' };
  const deckSnapshot = {
    activeSlideId: 'slide-1',
    slides: [{ id: 'slide-1', index: 0 }, { id: 'slide-2', index: 1 }]
  };
  const thumbnailView = {
    syncStudioEditorThumbnails(options) {
      calls.push(['syncEditor', options]);
      return true;
    },
    attachStudioThumbnailDragAndDrop(card, options) {
      calls.push(['attach', card, options]);
      return true;
    }
  };
  const controller = thumbnailController.createStudioEditorThumbnailController({
    thumbnailView,
    documentRef: { id: 'editor-document' },
    getDocument: () => iframeDoc,
    buildDeckSnapshot: () => deckSnapshot,
    getActiveSlideIndex: () => 1,
    onSelectSlide: (slideId) => calls.push(['select', slideId]),
    reorderSlidesById: (sourceSlideId, targetSlideId) => calls.push(['reorder', sourceSlideId, targetSlideId]),
    ...overrides
  });
  return { calls, controller, deckSnapshot, iframeDoc };
}

test('thumbnail controller assembles shared render and drag dependencies', () => {
  const { calls, controller, deckSnapshot, iframeDoc } = createController();
  const card = { addEventListener() {} };

  assert.equal(controller.render(), true);

  assert.equal(calls[0][0], 'syncEditor');
  assert.equal(calls[0][1].documentRef.id, 'editor-document');
  assert.equal(calls[0][1].getDocument(), iframeDoc);
  assert.equal(calls[0][1].buildDeckSnapshot(iframeDoc), deckSnapshot);
  assert.equal(calls[0][1].getActiveSlideIndex(iframeDoc, deckSnapshot), 1);
  assert.equal(typeof calls[0][1].onSelectSlide, 'function');
  assert.equal(typeof calls[0][1].setupDragAndDropThumbnail, 'function');
  calls[0][1].onSelectSlide('slide-2');
  assert.deepEqual(calls[1], ['select', 'slide-2']);
  assert.equal(controller.attach(card), true);
  assert.equal(calls[2][0], 'attach');
  assert.equal(calls[2][1], card);
  assert.equal(typeof calls[2][2].getDraggedSlideId, 'function');
  calls[2][2].setDraggedSlideId('slide-1');
  assert.equal(calls[2][2].getDraggedSlideId(), 'slide-1');
  calls[2][2].onReorder('slide-1', 'slide-2');
  assert.deepEqual(calls[3], ['reorder', 'slide-1', 'slide-2']);
});

test('thumbnail controller supports the legacy thumbnail view fallback', () => {
  const calls = [];
  const controller = thumbnailController.createStudioEditorThumbnailController({
    thumbnailView: {
      syncStudioThumbnailList(options) {
        calls.push(options);
        return 'legacy';
      }
    },
    documentRef: { id: 'editor-document' },
    getDocument: () => ({ id: 'iframe-document' }),
    buildDeckSnapshot: () => ({ slides: [{ id: 'slide-1' }] }),
    getActiveSlideIndex: () => 0
  });

  assert.equal(controller.render(), 'legacy');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].canMutateSlides, true);
  assert.equal(calls[0].deckSnapshot.slides.length, 1);
  assert.equal(typeof calls[0].setupDragAndDropThumbnail, 'function');
});

test('thumbnail controller delegates active-card synchronization to the deck view', () => {
  const calls = [];
  const documentRef = { id: 'editor-document' };
  const deckViewApi = {
    syncStudioDeckActiveThumbnailCardState(options) {
      calls.push(options);
      return true;
    }
  };
  const controller = thumbnailController.createStudioEditorThumbnailController({
    thumbnailView: {},
    deckViewApi,
    documentRef
  });

  assert.equal(controller.syncActiveSlideCard('slide-2'), true);
  assert.deepEqual(calls, [{
    documentRef,
    activeSlideId: 'slide-2'
  }]);
});

test('thumbnail controller fails closed when active-card synchronization is unavailable', () => {
  const controller = thumbnailController.createStudioEditorThumbnailController({
    thumbnailView: {}
  });

  assert.equal(controller.syncActiveSlideCard('slide-1'), false);
});

test('thumbnail controller fails closed when the thumbnail view is unavailable', () => {
  const controller = thumbnailController.createStudioEditorThumbnailController({
    thumbnailView: null
  });

  assert.equal(controller.render(), false);
  assert.equal(controller.attach(null), false);
});

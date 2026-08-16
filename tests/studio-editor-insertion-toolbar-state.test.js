const test = require('node:test');
const assert = require('node:assert/strict');

const insertionToolbarState = require('../shared/studio-editor-insertion-toolbar-state.js');

test('insertion toolbar state controller delegates the legacy deck view synchronizer', () => {
  const calls = [];
  const doc = { id: 'doc' };
  const activeSlide = { id: 'slide' };
  const slideContainer = { id: 'slides' };
  const controller = insertionToolbarState.createStudioEditorInsertionToolbarStateController({
    deckView: {
      syncStudioInsertionToolbarActionState(options) {
        calls.push(options);
        return 'synced';
      }
    },
    getActiveSlide(currentDoc) {
      assert.equal(currentDoc, doc);
      return activeSlide;
    },
    getSlideContainer(currentDoc) {
      assert.equal(currentDoc, doc);
      return slideContainer;
    },
    documentRef: { id: 'editor' }
  });

  assert.equal(controller.sync(doc), 'synced');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].doc, doc);
  assert.equal(calls[0].getActiveSlide(doc), activeSlide);
  assert.equal(calls[0].getSlideContainer(doc), slideContainer);
  assert.deepEqual(calls[0].documentRef, { id: 'editor' });
});

test('insertion toolbar state controller caches the shared synchronizer', () => {
  const calls = [];
  const doc = { id: 'doc' };
  const deckView = {
    syncStudioInsertionToolbarActionState() {
      throw new Error('fallback sync should not run');
    },
    createStudioInsertionToolbarActionStateSync(options) {
      calls.push(['factory', options]);
      return (currentDoc) => {
        calls.push(['sync', currentDoc]);
        return options.getActionState(currentDoc).canInsertElements;
      };
    }
  };
  const controller = insertionToolbarState.createStudioEditorInsertionToolbarStateController({
    deckView,
    getActionState: () => ({ canInsertElements: true })
  });

  assert.equal(controller.sync(doc), true);
  assert.equal(controller.sync(doc), true);
  assert.equal(calls.filter(([type]) => type === 'factory').length, 1);
  assert.deepEqual(calls.filter(([type]) => type === 'sync').map(([, value]) => value), [doc, doc]);
});

test('insertion toolbar state controller fails closed when the deck view is unavailable', () => {
  const controller = insertionToolbarState.createStudioEditorInsertionToolbarStateController({
    deckView: null
  });

  assert.equal(controller.sync({}), false);
});

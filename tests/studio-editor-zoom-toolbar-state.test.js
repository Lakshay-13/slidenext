const test = require('node:test');
const assert = require('node:assert/strict');

const zoomToolbarState = require('../shared/studio-editor-zoom-toolbar-state.js');

test('zoom toolbar state controller delegates the legacy deck view synchronizer', () => {
  const calls = [];
  const doc = { id: 'doc' };
  const activeSlide = { id: 'slide' };
  const controller = zoomToolbarState.createStudioEditorZoomToolbarStateController({
    deckView: {
      syncStudioZoomToolbarActionState(options) {
        calls.push(options);
        return 'synced';
      }
    },
    getActiveSlide(currentDoc) {
      assert.equal(currentDoc, doc);
      return activeSlide;
    },
    documentRef: { id: 'editor' }
  });

  assert.equal(controller.sync(doc), 'synced');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].doc, doc);
  assert.equal(calls[0].getActiveSlide(doc), activeSlide);
  assert.deepEqual(calls[0].documentRef, { id: 'editor' });
});

test('zoom toolbar state controller caches the shared synchronizer', () => {
  const calls = [];
  const doc = { id: 'doc' };
  const deckView = {
    syncStudioZoomToolbarActionState() {
      throw new Error('fallback sync should not run');
    },
    createStudioZoomToolbarActionStateSync(options) {
      calls.push(['factory', options]);
      return (currentDoc) => {
        calls.push(['sync', currentDoc]);
        return options.getActionState(currentDoc).canUseZoomControls;
      };
    }
  };
  const controller = zoomToolbarState.createStudioEditorZoomToolbarStateController({
    deckView,
    getActionState: () => ({ canUseZoomControls: true })
  });

  assert.equal(controller.sync(doc), true);
  assert.equal(controller.sync(doc), true);
  assert.equal(calls.filter(([type]) => type === 'factory').length, 1);
  assert.deepEqual(calls.filter(([type]) => type === 'sync').map(([, value]) => value), [doc, doc]);
});

test('zoom toolbar state controller fails closed when the deck view is unavailable', () => {
  const controller = zoomToolbarState.createStudioEditorZoomToolbarStateController({
    deckView: null
  });

  assert.equal(controller.sync({}), false);
});

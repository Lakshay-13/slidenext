const test = require('node:test');
const assert = require('node:assert/strict');

const wallpaperToolbarState = require('../shared/studio-editor-wallpaper-toolbar-state.js');

test('wallpaper toolbar state caches the shared synchronizer and forwards action state', () => {
  const documentRef = { id: 'chrome-document' };
  const firstDoc = { id: 'first-doc' };
  const secondDoc = { id: 'second-doc' };
  const calls = [];
  const controller = wallpaperToolbarState.createStudioEditorWallpaperToolbarStateController({
    deckView: {
      syncStudioWallpaperToolbarActionState() {
        throw new Error('direct sync should not run');
      },
      createStudioWallpaperToolbarActionStateSync(options) {
        calls.push(['factory', options]);
        return (doc) => {
          calls.push(['sync', doc]);
          return options.getActionState(doc).canUseWallpaperControls;
        };
      }
    },
    getDocument: () => firstDoc,
    getActionState: (doc) => ({ canUseWallpaperControls: doc === firstDoc }),
    documentRef
  });

  assert.equal(controller.sync(), true);
  assert.equal(controller.sync(secondDoc), false);
  assert.equal(calls.filter(([name]) => name === 'factory').length, 1);
  assert.deepEqual(
    calls.filter(([name]) => name === 'sync').map(([, doc]) => doc),
    [firstDoc, secondDoc]
  );
});

test('wallpaper toolbar state falls back to direct rendering when no factory exists', () => {
  const calls = [];
  const documentRef = { id: 'chrome-document' };
  const activeSlide = { id: 'slide-1' };
  const controller = wallpaperToolbarState.createStudioEditorWallpaperToolbarStateController({
    deckView: {
      syncStudioWallpaperToolbarActionState(options) {
        calls.push(options);
        return 'synced';
      }
    },
    getActiveSlide: () => activeSlide,
    documentRef
  });

  const doc = { id: 'iframe-document' };
  assert.equal(controller.sync(doc), 'synced');
  assert.equal(calls[0].documentRef, documentRef);
  assert.equal(calls[0].doc, doc);
  assert.equal(calls[0].getActiveSlide(doc), activeSlide);
});

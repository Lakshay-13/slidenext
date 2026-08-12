const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const navigationRuntime = require('../shared/studio-editor-navigation-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('navigation runtime composes navigation, active slide, sync, and thumbnails', () => {
  const calls = [];
  const navigationController = { name: 'navigation' };
  const activeSlideController = { name: 'active-slide' };
  const navigationSync = { name: 'sync' };
  const thumbnailController = { name: 'thumbnail' };
  const callbacks = {
    deckViewApi: {},
    activeSlideView: {},
    wallpaperView: {},
    thumbnailView: {},
    notesView: {},
    deckSnapshotApi: {},
    documentRef: {},
    getDocument() {},
    getWindow() {},
    getSlides() {},
    getCurrentSlideIndex() {},
    syncStudioChromeToActiveSlide() {},
    getPreserveSelection() {},
    setPreserveSelection() {},
    updateCurrentPresentationSessionState() {},
    setCurrentSlideId() {},
    updateActiveThumbnailCardState() {},
    updateInsertionActionState() {},
    updateZoomActionState() {},
    updateWallpaperActionState() {},
    deselectElement() {},
    updateLayersList() {},
    buildEditorDeckSnapshot() {},
    buildEditorCanonicalDeck() {},
    saveHistoryState() {},
    getActiveSlide() {},
    getSlideId() {},
    updateIframeNavigationUI() {},
    pruneEditorChromeNodes() {},
    resolveReadyState() {},
    rgbToHex() {},
    getWallpaperTab() {},
    setWallpaperTab() {},
    setCustomGradientType() {},
    updateTemplateActionState() {},
    updateMasterSlideActionState() {},
    updateAssetLibraryState() {},
    syncLayoutModeControl() {},
    buildDeckSnapshot() {},
    getActiveSlideIndex() {},
    onSelectSlide() {},
    reorderSlidesById() {}
  };
  const api = (name, factoryName, result) => ({
    [factoryName](options) {
      calls.push([name, options]);
      return result;
    }
  });

  const result = navigationRuntime.createStudioEditorNavigationRuntime({
    navigationApi: api('navigation', 'createStudioEditorNavigationController', navigationController),
    activeSlideApi: api('active-slide', 'createStudioEditorActiveSlideController', activeSlideController),
    navigationSyncApi: api('sync', 'createStudioEditorNavigationSync', navigationSync),
    thumbnailApi: api('thumbnail', 'createStudioEditorThumbnailController', thumbnailController),
    ...callbacks
  });

  assert.deepEqual(result, {
    navigationController,
    activeSlideController,
    navigationSync,
    thumbnailController
  });
  assert.equal(calls[0][1].deckViewApi, callbacks.deckViewApi);
  assert.equal(calls[0][1].getWindow, callbacks.getWindow);
  assert.equal(calls[1][1].activeSlideView, callbacks.activeSlideView);
  assert.equal(calls[1][1].buildEditorCanonicalDeck, callbacks.buildEditorCanonicalDeck);
  assert.equal(calls[1][1].setCustomGradientType, callbacks.setCustomGradientType);
  assert.equal(calls[1][1].setCurrentSlideId, callbacks.setCurrentSlideId);
  assert.equal(calls[2][1].activeSlideController, activeSlideController);
  assert.equal(calls[2][1].navigationController, navigationController);
  assert.equal(calls[2][1].updateAssetLibraryState, callbacks.updateAssetLibraryState);
  assert.equal(calls[2][1].syncLayoutModeControl, callbacks.syncLayoutModeControl);
  assert.equal(calls[3][1].buildDeckSnapshot, callbacks.buildDeckSnapshot);
  assert.equal(calls[3][1].onSelectSlide, callbacks.onSelectSlide);
  assert.equal(calls[3][1].reorderSlidesById, callbacks.reorderSlidesById);
});

test('index wires navigation composition through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-navigation-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorNavigationRuntime\.createStudioEditorNavigationRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorNavigationController\.createStudioEditorNavigationController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorActiveSlideController\.createStudioEditorActiveSlideController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorNavigationSync\.createStudioEditorNavigationSync\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorThumbnailController\.createStudioEditorThumbnailController\(/
  );
});

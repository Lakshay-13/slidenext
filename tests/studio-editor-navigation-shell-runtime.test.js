const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-navigation-shell-runtime.js');

test('navigation shell runtime resolves controller and view dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'navigation-runtime' };
  const navigationRuntimeApi = {
    createStudioEditorNavigationRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    navigationApi: { name: 'navigation' },
    activeSlideApi: { name: 'active-slide' },
    navigationSyncApi: { name: 'sync' },
    thumbnailApi: { name: 'thumbnail' },
    deckViewApi: { name: 'deck-view' },
    activeSlideView: { name: 'active-view' },
    wallpaperView: { name: 'wallpaper' },
    thumbnailView: { name: 'thumbnail-view' },
    notesView: { name: 'notes' },
    deckSnapshotApi: { name: 'snapshot' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorNavigationShellRuntime({
    navigationRuntimeApi,
    ...dependencies,
    getDocument: callback
  });

  assert.equal(result, resultValue);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions[key], value);
  }
  assert.equal(receivedOptions.getDocument, callback);
  assert.equal(receivedOptions.navigationRuntimeApi, undefined);
});

test('navigation shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const navigationRuntimeApi = {
    createStudioEditorNavigationRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorNavigationShellRuntime({
    navigationRuntimeApi,
    navigationApi: null,
    activeSlideApi: null,
    navigationSyncApi: null,
    thumbnailApi: null,
    deckViewApi: null,
    activeSlideView: null,
    wallpaperView: null,
    thumbnailView: null,
    notesView: null,
    deckSnapshotApi: null
  });

  assert.equal(receivedOptions.navigationApi, null);
  assert.equal(receivedOptions.activeSlideApi, null);
  assert.equal(receivedOptions.navigationSyncApi, null);
  assert.equal(receivedOptions.thumbnailApi, null);
  assert.equal(receivedOptions.deckViewApi, null);
  assert.equal(receivedOptions.activeSlideView, null);
  assert.equal(receivedOptions.wallpaperView, null);
  assert.equal(receivedOptions.thumbnailView, null);
  assert.equal(receivedOptions.notesView, null);
  assert.equal(receivedOptions.deckSnapshotApi, null);
});

test('navigation shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorNavigationShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorNavigationShellRuntime({ navigationRuntimeApi: {} }),
    null
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-navigation-shell-runtime.js');
const navigationAccessors = require('../shared/studio-editor-navigation-accessors.js');

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

test('navigation accessors compose the shell runtime and preserve its result', () => {
  const runtime = { navigationController: { name: 'navigation' } };
  const calls = [];
  const runtimeApi = {
    createStudioEditorNavigationShellRuntime(options) {
      calls.push(options);
      return runtime;
    }
  };
  const navigationApi = { name: 'navigation-api' };
  const callbacks = {
    getDocument: () => ({ id: 'document' }),
    getSlides: () => []
  };
  const accessors = navigationAccessors.createStudioEditorNavigationAccessors({
    runtimeApi,
    navigationApi,
    ...callbacks
  });

  assert.equal(accessors.runtime, runtime);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].navigationApi, navigationApi);
  assert.equal(calls[0].getDocument, callbacks.getDocument);
  assert.equal(calls[0].getSlides, callbacks.getSlides);
  assert.equal(calls[0].runtimeApi, undefined);
});

test('navigation accessors fail closed when the shell runtime is unavailable', () => {
  const accessors = navigationAccessors.createStudioEditorNavigationAccessors({
    runtimeApi: null
  });

  assert.equal(accessors.runtime, null);
});

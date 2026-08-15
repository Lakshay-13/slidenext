const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const playbackShellRuntime = require('../shared/studio-editor-persisted-deck-playback-state-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('persisted deck playback state shell runtime forwards capture dependencies', () => {
  let receivedOptions = null;
  let globalOptions = null;
  const action = () => ({ activeSlideIds: ['slide-1'] });
  const actionApi = {
    createStudioEditorPersistedDeckPlaybackStateAction(options) {
      receivedOptions = options;
      return action;
    },
    createStudioEditorPersistedDeckPlaybackStateGlobalApi(options) {
      globalOptions = options;
      return { capturePersistedDeckPlaybackState: options.capturePersistedDeckPlaybackState };
    }
  };
  const options = {
    actionApi,
    getDocument: () => null,
    getPersistenceController: () => null,
    persistenceApi: { name: 'persistence' },
    persistenceStateApi: { name: 'persistence-state' },
    deckPersistenceApi: { name: 'deck-persistence' },
    getSlides: () => [],
    slideIdAttr: 'data-slide-id',
    buildCanonicalDeck: () => null,
    resolveFallbackActiveSlideId: () => ''
  };

  const runtime = playbackShellRuntime
    .createStudioEditorPersistedDeckPlaybackStateShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.persistedDeckPlaybackStateAction, action);
  assert.equal(receivedOptions.getDocument, options.getDocument);
  assert.equal(receivedOptions.getPersistenceController, options.getPersistenceController);
  assert.equal(receivedOptions.persistenceApi, options.persistenceApi);
  assert.equal(receivedOptions.persistenceStateApi, options.persistenceStateApi);
  assert.equal(receivedOptions.deckPersistenceApi, options.deckPersistenceApi);
  assert.equal(receivedOptions.getSlides, options.getSlides);
  assert.equal(receivedOptions.slideIdAttr, options.slideIdAttr);
  assert.equal(receivedOptions.buildCanonicalDeck, options.buildCanonicalDeck);
  assert.equal(
    receivedOptions.resolveFallbackActiveSlideId,
    options.resolveFallbackActiveSlideId
  );
  assert.equal(globalOptions.capturePersistedDeckPlaybackState, action);
  assert.equal(
    runtime.persistedDeckPlaybackStateGlobalApi.capturePersistedDeckPlaybackState,
    action
  );
});

test('persisted deck playback state shell runtime fails closed when the action API is unavailable', () => {
  const runtime = playbackShellRuntime
    .createStudioEditorPersistedDeckPlaybackStateShellRuntime({ actionApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.persistedDeckPlaybackStateAction, null);
  assert.deepEqual(runtime.persistedDeckPlaybackStateGlobalApi, {});
});

test('index routes persisted deck playback state installation through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persisted-deck-playback-state-shell-runtime\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorPersistedDeckPlaybackStateShellRuntimeApi/);
  assert.match(fileContent, /createStudioEditorPersistedDeckPlaybackStateShellRuntime/);
  assert.match(
    fileContent,
    /studioEditorPersistedDeckPlaybackStateGlobalApi\s*=\s*studioEditorPersistedDeckPlaybackStateShellRuntime/
  );
});

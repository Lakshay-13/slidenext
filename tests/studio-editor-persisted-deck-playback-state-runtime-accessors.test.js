const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-persisted-deck-playback-state-runtime-accessors.js');

test('persisted deck playback state runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { isAvailable: true, persistedDeckPlaybackStateAction: () => ({}) };
  const runtimeApi = {
    createStudioEditorPersistedDeckPlaybackStateShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    getDocument: () => null,
    slideIdAttr: 'data-slide-id',
    resolveFallbackActiveSlideId: () => ''
  };

  const result = accessors.createStudioEditorPersistedDeckPlaybackStateRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('persisted deck playback state runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorPersistedDeckPlaybackStateRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorPersistedDeckPlaybackStateRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});

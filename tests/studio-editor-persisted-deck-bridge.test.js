const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const bridgeApi = require('../shared/studio-editor-persisted-deck-bridge.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('persisted deck bridge composes the runtime and delegates baseline access', () => {
  const calls = [];
  const stateStore = {
    createStudioEditorPersistedDeckStateStore() {
      calls.push('create-store');
      return {
        getDeckHtml: () => '<html>old</html>',
        getCanonicalDeck: () => ({ kind: 'slidenext.deck' }),
        getPlaybackState: () => ({ activeSlideIds: ['slide-1'] }),
        setDeckHtml: (value) => value,
        setCanonicalDeck: (value) => value,
        setPlaybackState: (value) => value
      };
    }
  };
  const runtimeApi = {
    createStudioEditorPersistedDeckRuntime(options) {
      calls.push(options.stateStore);
      return {
        persistedDeckStateStore: options.stateStore.createStudioEditorPersistedDeckStateStore()
      };
    }
  };

  const bridge = bridgeApi.createStudioEditorPersistedDeckBridge({ runtimeApi, stateStore });

  assert.equal(bridge.getDeckHtml(), '<html>old</html>');
  assert.deepEqual(bridge.getCanonicalDeck(), { kind: 'slidenext.deck' });
  assert.deepEqual(bridge.getPlaybackState(), { activeSlideIds: ['slide-1'] });
  assert.equal(bridge.setDeckHtml('<html>new</html>'), '<html>new</html>');
  assert.deepEqual(bridge.setCanonicalDeck({ id: 'next' }), { id: 'next' });
  assert.deepEqual(bridge.setPlaybackState({ activeSlideIds: ['slide-2'] }), {
    activeSlideIds: ['slide-2']
  });
  assert.deepEqual(calls, [stateStore, 'create-store']);
});

test('persisted deck bridge preserves safe fallbacks when runtime is unavailable', () => {
  const bridge = bridgeApi.createStudioEditorPersistedDeckBridge({
    runtimeApi: null,
    stateStore: null
  });

  assert.equal(bridge.runtime, null);
  assert.equal(bridge.persistedDeckStateStore, null);
  assert.equal(bridge.getDeckHtml(), '');
  assert.equal(bridge.getCanonicalDeck(), null);
  assert.equal(bridge.getPlaybackState(), null);
  assert.equal(bridge.setDeckHtml('<html>ignored</html>'), false);
  assert.equal(bridge.setCanonicalDeck({}), false);
  assert.equal(bridge.setPlaybackState({}), false);
});

test('editor loads the persisted deck bridge after its runtime dependencies', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persisted-deck-bridge\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorPersistedDeckBridge\.createStudioEditorPersistedDeckBridge\(/
  );
  assert.match(fileContent, /studioEditorPersistedDeckBridge/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const stateStoreApi = require('../shared/studio-editor-persisted-deck-state-store.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('persisted deck state store delegates all baseline fields', () => {
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const playbackState = { activeSlideIds: ['slide-1'] };
  const store = stateStoreApi.createStudioEditorPersistedDeckStateStore({
    stateController: {
      getDeckHtml: () => '<html>old</html>',
      getCanonicalDeck: () => canonicalDeck,
      getPlaybackState: () => playbackState,
      setDeckHtml: (value) => value,
      setCanonicalDeck: (value) => value,
      setPlaybackState: (value) => value
    }
  });

  assert.equal(store.getDeckHtml(), '<html>old</html>');
  assert.equal(store.getCanonicalDeck(), canonicalDeck);
  assert.equal(store.getPlaybackState(), playbackState);
  assert.equal(store.setDeckHtml('<html>new</html>'), '<html>new</html>');
  assert.equal(store.setCanonicalDeck({ id: 'next' }).id, 'next');
  assert.deepEqual(store.setPlaybackState({ activeSlideIds: ['slide-2'] }), {
    activeSlideIds: ['slide-2']
  });
});

test('persisted deck state store preserves safe baseline fallbacks', () => {
  const store = stateStoreApi.createStudioEditorPersistedDeckStateStore({});

  assert.equal(store.getDeckHtml(), '');
  assert.equal(store.getCanonicalDeck(), null);
  assert.equal(store.getPlaybackState(), null);
  assert.equal(store.setDeckHtml('<html>ignored</html>'), false);
  assert.equal(store.setCanonicalDeck({}), false);
  assert.equal(store.setPlaybackState({}), false);
});

test('editor routes persisted baseline access through the shared store', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-persisted-deck-state-store\.js/);
  assert.match(source, /studioEditorPersistedDeckBridge/);
  assert.doesNotMatch(source, /const studioEditorPersistedDeckStateController =/);
});

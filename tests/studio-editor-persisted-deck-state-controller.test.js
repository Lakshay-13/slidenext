const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const persistedStateController = require('../shared/studio-editor-persisted-deck-state-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('persisted deck state controller owns the HTML, canonical deck, and playback baseline', () => {
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const playbackState = { activeSlideIds: ['slide-1'] };
  const controller = persistedStateController.createStudioEditorPersistedDeckStateController({
    initialDeckHtml: '<html>old</html>',
    initialCanonicalDeck: canonicalDeck,
    initialPlaybackState: playbackState
  });

  assert.deepEqual(controller.getState(), {
    deckHtml: '<html>old</html>',
    canonicalDeck,
    playbackState
  });
  assert.equal(controller.setDeckHtml('<html>new</html>'), '<html>new</html>');
  assert.equal(controller.setCanonicalDeck({ id: 'next-deck' }).id, 'next-deck');
  assert.deepEqual(controller.setPlaybackState({ activeSlideIds: ['slide-2'] }), {
    activeSlideIds: ['slide-2']
  });
  assert.deepEqual(controller.clear(), {
    deckHtml: '',
    canonicalDeck: null,
    playbackState: null
  });
});

test('editor wiring routes persisted baselines through the shared controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persisted-deck-state-controller\.js"><\/script>/
  );
  assert.match(fileContent, /studio-editor-persisted-deck-state-store\.js/);
  assert.match(fileContent, /studioEditorPersistedDeckStateStore/);
  assert.match(fileContent, /getStudioPersistedDeckHtml\(\)/);
  assert.match(fileContent, /getStudioPersistedCanonicalDeck\(\)/);
  assert.match(fileContent, /getStudioPersistedPlaybackState\(\)/);
  assert.doesNotMatch(fileContent, /let lastPersistedDeckHtml = ''/);
  assert.doesNotMatch(fileContent, /let lastPersistedCanonicalDeck = null/);
  assert.doesNotMatch(fileContent, /let persistedDeckPlaybackState = null/);
});

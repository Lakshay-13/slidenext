const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const accessorsApi = require('../shared/studio-editor-persisted-deck-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const ACCESSORS_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-persisted-deck-accessors.js');

test('persisted deck accessors delegate html, canonical, and playback state', () => {
  const bridge = {
    getDeckHtml: () => '<html>old</html>',
    getCanonicalDeck: () => ({ kind: 'slidenext.deck' }),
    getPlaybackState: () => ({ activeSlideIds: ['slide-1'] }),
    setDeckHtml: (value) => value,
    setCanonicalDeck: (value) => value,
    setPlaybackState: (value) => value
  };
  const accessors = accessorsApi.createStudioEditorPersistedDeckAccessors({ bridge });

  assert.equal(accessors.getDeckHtml(), '<html>old</html>');
  assert.deepEqual(accessors.getCanonicalDeck(), { kind: 'slidenext.deck' });
  assert.deepEqual(accessors.getPlaybackState(), { activeSlideIds: ['slide-1'] });
  assert.equal(accessors.setDeckHtml('<html>new</html>'), '<html>new</html>');
  assert.deepEqual(accessors.setCanonicalDeck({ id: 'next' }), { id: 'next' });
  assert.deepEqual(accessors.setPlaybackState({ activeSlideIds: ['slide-2'] }), {
    activeSlideIds: ['slide-2']
  });
});

test('persisted deck accessors preserve safe fallbacks without a bridge', () => {
  const accessors = accessorsApi.createStudioEditorPersistedDeckAccessors();

  assert.equal(accessors.getDeckHtml(), '');
  assert.equal(accessors.getCanonicalDeck(), null);
  assert.equal(accessors.getPlaybackState(), null);
  assert.equal(accessors.setDeckHtml('<html>ignored</html>'), false);
  assert.equal(accessors.setCanonicalDeck({}), false);
  assert.equal(accessors.setPlaybackState({}), false);
});

test('persisted deck accessors publish the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(ACCESSORS_PATH, 'utf8'), context);

  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorPersistedDeckAccessors,
    'object'
  );
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorPersistedDeckAccessors
      .createStudioEditorPersistedDeckAccessors,
    'function'
  );
});

test('editor loads persisted deck accessors after the persisted deck bridge', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persisted-deck-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorShellStateRuntime\.persistedDeckAccessors/);
  assert.match(fileContent, /studioEditorPersistedDeckAccessors/);
});

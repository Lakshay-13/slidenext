const test = require('node:test');
const assert = require('node:assert/strict');

const adapter = require('../shared/studio-editor-deck-view-build-options.js');

test('deck-view build options delegate to the canonical view-state adapter', () => {
  const doc = { id: 'editor-doc' };
  const canonicalDeck = { slides: [] };
  const calls = [];
  const canonicalViewStateApi = {
    createStudioEditorDeckViewBuildOptions(nextDoc, options) {
      calls.push({ nextDoc, options });
      return { canonicalDeck };
    }
  };
  const buildOptions = { activeSlideId: 'slide-1' };

  const result = adapter.createStudioEditorDeckViewBuildOptions({
    doc,
    buildOptions,
    canonicalViewStateApi,
    deckViewApi: { id: 'deck-view' }
  });

  assert.deepEqual(result, { canonicalDeck });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].nextDoc, doc);
  assert.equal(calls[0].options.buildOptions, buildOptions);
  assert.equal(calls[0].options.deckViewApi.id, 'deck-view');
});

test('deck-view build options preserve the local fallback composition', () => {
  const doc = { id: 'editor-doc' };
  const canonicalDeck = { slides: [{ id: 'slide-1' }] };
  const calls = [];
  const result = adapter.createStudioEditorDeckViewBuildOptions({
    doc,
    buildOptions: { activeSlideId: 'slide-explicit' },
    createCanonicalDeckViewStateOptions(options) {
      calls.push(options);
      return {
        buildCanonicalDeck: () => canonicalDeck,
        getPendingCanonicalDeck: () => canonicalDeck,
        resolveLiveActiveSlideId: () => 'slide-live'
      };
    },
    deckViewApi: {
      createStudioDeckViewBuildOptions(nextDoc, options) {
        return {
          nextDoc,
          activeSlideId: options.activeSlideId,
          buildCanonicalDeck: options.buildCanonicalDeck,
          getPendingCanonicalDeck: options.getPendingCanonicalDeck,
          resolveLiveActiveSlideId: options.resolveLiveActiveSlideId
        };
      }
    },
    buildFallbackHtml: (nextDoc, nextCanonicalDeck) => ({ nextDoc, nextCanonicalDeck }),
    buildRenderOptions: (nextDoc, nextCanonicalDeck, options) => ({
      nextDoc,
      nextCanonicalDeck,
      activeSlideId: options.activeSlideId
    })
  });

  assert.equal(calls.length, 1);
  assert.equal(result.nextDoc, doc);
  assert.equal(result.activeSlideId, 'slide-explicit');
  assert.equal(result.buildCanonicalDeck(), canonicalDeck);
  assert.equal(result.getPendingCanonicalDeck(), canonicalDeck);
  assert.equal(result.resolveLiveActiveSlideId(doc), 'slide-live');
});

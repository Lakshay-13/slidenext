const test = require('node:test');
const assert = require('node:assert/strict');
const canonicalViewState = require('../shared/studio-editor-canonical-view-state.js');

test('canonical view state options preserve explicit editor callbacks through the shared deck view adapter', () => {
  const canonicalDeck = { slides: [] };
  const buildCanonicalDeck = () => canonicalDeck;
  const resolveLiveActiveSlideId = () => 'slide-live';
  const calls = [];
  const sharedOptions = {
    buildCanonicalDeck,
    resolveLiveActiveSlideId,
    source: 'shared'
  };

  const result = canonicalViewState.createStudioEditorCanonicalDeckViewStateOptions({
    deckViewApi: {
      createStudioDeckViewCanonicalStateOptions(options) {
        calls.push(options);
        return sharedOptions;
      }
    },
    buildCanonicalDeck,
    resolveLiveActiveSlideId
  });

  assert.equal(result, sharedOptions);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].buildCanonicalDeck, buildCanonicalDeck);
  assert.equal(calls[0].resolveLiveActiveSlideId, resolveLiveActiveSlideId);
});

test('canonical view state options preserve editor callbacks when shared normalization is incomplete', () => {
  const buildCanonicalDeck = () => ({ slides: [] });
  const resolveLiveActiveSlideId = () => 'slide-live';
  const result = canonicalViewState.createStudioEditorCanonicalDeckViewStateOptions({
    deckViewApi: {
      createStudioDeckViewCanonicalStateOptions() {
        return {};
      }
    },
    buildCanonicalDeck,
    resolveLiveActiveSlideId
  });

  assert.equal(result.buildCanonicalDeck, buildCanonicalDeck);
  assert.equal(result.resolveLiveActiveSlideId, resolveLiveActiveSlideId);
});

test('canonical view state resolver delegates the normalized options and preserves live slide state', () => {
  const doc = { id: 'editor-doc' };
  const buildCanonicalDeck = () => ({ slides: [] });
  const resolveLiveActiveSlideId = () => 'slide-live';
  const calls = [];
  const result = canonicalViewState.resolveStudioEditorCanonicalDeckViewState(doc, {
    deckViewApi: {
      createStudioDeckViewCanonicalStateOptions(options) {
        return options;
      },
      resolveStudioCanonicalDeckViewState(nextDoc, options) {
        calls.push([nextDoc, options]);
        return { resolved: true, ...options };
      }
    },
    buildCanonicalDeck,
    resolveLiveActiveSlideId
  });

  assert.deepEqual(result, {
    resolved: true,
    buildCanonicalDeck,
    resolveLiveActiveSlideId
  });
  assert.equal(calls[0][0], doc);
  assert.equal(calls[0][1].buildCanonicalDeck, buildCanonicalDeck);
  assert.equal(calls[0][1].resolveLiveActiveSlideId, resolveLiveActiveSlideId);
});

test('canonical view state resolver fails closed to the live slide callback without a deck view adapter', () => {
  const doc = { id: 'editor-doc' };
  const result = canonicalViewState.resolveStudioEditorCanonicalDeckViewState(doc, {
    fallbackResolveLiveActiveSlideId(nextDoc) {
      assert.equal(nextDoc, doc);
      return 'slide-fallback';
    }
  });

  assert.equal(result.liveActiveSlideId, 'slide-fallback');
  assert.equal(result.resolvedCanonicalDeck, null);
  assert.equal(result.resolveCanonicalDeck(), null);
});

test('editor fallback slide resolution passes canonical and shared editor state to deck view', () => {
  const doc = { id: 'editor-doc' };
  const canonicalDeck = { slides: [] };
  const sharedOptions = { currentSlideIndex: 2 };
  const calls = [];
  const result = canonicalViewState.resolveStudioEditorFallbackActiveSlideId(doc, canonicalDeck, {
    deckViewApi: {
      resolveStudioFallbackActiveSlideId(nextDoc, nextCanonicalDeck, options) {
        calls.push([nextDoc, nextCanonicalDeck, options]);
        return 'slide-fallback';
      }
    },
    getDeckViewSharedOptions() {
      return sharedOptions;
    }
  });

  assert.equal(result, 'slide-fallback');
  assert.deepEqual(calls, [[doc, canonicalDeck, sharedOptions]]);
});

test('editor live slide helpers delegate through the deck view API', () => {
  const doc = { id: 'editor-doc' };
  const activeSlide = { id: 'slide-element' };
  const calls = [];
  const deckViewApi = {
    resolveStudioLiveActiveSlide(nextDoc) {
      calls.push(['slide', nextDoc]);
      return activeSlide;
    },
    resolveStudioLiveActiveSlideId(nextDoc, options) {
      calls.push(['id', nextDoc, options.getActiveSlideId(nextDoc)]);
      return 'slide-live';
    }
  };

  assert.equal(canonicalViewState.resolveStudioEditorLiveActiveSlide(doc, { deckViewApi }), activeSlide);
  assert.equal(canonicalViewState.resolveStudioEditorLiveActiveSlideId(doc, {
    deckViewApi,
    getActiveSlideId: () => 'slide-id'
  }), 'slide-live');
  assert.deepEqual(calls, [
    ['slide', doc],
    ['id', doc, 'slide-id']
  ]);
});

test('editor render options delegate active-slide and shared options to deck view', () => {
  const doc = { id: 'editor-doc' };
  const canonicalDeck = { slides: [] };
  const sharedOptions = { currentSlideIndex: 1 };
  const result = canonicalViewState.createStudioEditorDeckRenderOptions(doc, canonicalDeck, {
    deckViewApi: {
      createStudioDeckRenderOptions(nextDoc, nextCanonicalDeck, options) {
        assert.equal(nextDoc, doc);
        assert.equal(nextCanonicalDeck, canonicalDeck);
        return options;
      }
    },
    activeSlideId: 'slide-explicit',
    getDeckViewSharedOptions() {
      return sharedOptions;
    }
  });

  assert.deepEqual(result, {
    activeSlideId: 'slide-explicit',
    currentSlideIndex: 1
  });
});

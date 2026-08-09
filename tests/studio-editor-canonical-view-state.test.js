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

test('editor deck view build options delegate canonical and fallback builders to deck view', () => {
  const doc = { id: 'editor-doc' };
  const calls = [];
  const buildCanonicalDeck = () => ({ slides: [] });
  const resolveLiveActiveSlideId = () => 'slide-live';
  const result = canonicalViewState.createStudioEditorDeckViewBuildOptions(doc, {
    buildOptions: {
      activeSlideId: 'slide-explicit',
      buildCanonicalDeck,
      resolveLiveActiveSlideId
    },
    deckViewApi: {
      createStudioDeckViewBuildOptions(nextDoc, options) {
        calls.push([nextDoc, options]);
        return { delegated: true, options };
      }
    },
    buildFallbackHtml() {
      return '<html>fallback</html>';
    },
    buildRenderOptions() {
      return { activeSlideId: 'slide-explicit' };
    }
  });

  assert.equal(result.delegated, true);
  assert.equal(calls[0][0], doc);
  assert.equal(calls[0][1].activeSlideId, 'slide-explicit');
  assert.equal(calls[0][1].buildCanonicalDeck, buildCanonicalDeck);
  assert.equal(calls[0][1].resolveLiveActiveSlideId, resolveLiveActiveSlideId);
});

test('editor deck view build options compose the fallback view without the shared builder', () => {
  const doc = { id: 'editor-doc' };
  const canonicalDeck = { slides: [{ id: 'slide-1' }] };
  const calls = [];
  const result = canonicalViewState.createStudioEditorDeckViewBuildOptions(doc, {
    buildOptions: { activeSlideId: 'slide-explicit' },
    deckViewApi: {
      resolveStudioCanonicalDeckViewState() {
        return {
          resolveCanonicalDeck(sourceDoc) {
            calls.push(['resolve', sourceDoc]);
            return canonicalDeck;
          },
          liveActiveSlideId: 'slide-live',
          resolvedCanonicalDeck: null
        };
      }
    },
    fallbackBuildCanonicalDeck() {
      return canonicalDeck;
    },
    fallbackResolveLiveActiveSlideId() {
      return 'slide-live';
    },
    buildFallbackHtml(sourceDoc, nextCanonicalDeck) {
      calls.push(['fallback', sourceDoc, nextCanonicalDeck]);
      return '<html>fallback</html>';
    },
    buildRenderOptions(sourceDoc, nextCanonicalDeck, options) {
      calls.push(['render', sourceDoc, nextCanonicalDeck, options]);
      return { activeSlideId: options.activeSlideId };
    }
  });

  assert.equal(result.buildCanonicalDeck(doc), canonicalDeck);
  assert.equal(result.buildFallbackHtml(doc), '<html>fallback</html>');
  assert.deepEqual(result.deckHtmlOptions, {
    renderOptions: { activeSlideId: 'slide-explicit' }
  });
  assert.deepEqual(calls, [
    ['render', doc, null, { activeSlideId: 'slide-explicit' }],
    ['resolve', doc],
    ['resolve', doc],
    ['fallback', doc, canonicalDeck]
  ]);
});

test('editor deck html delegates to the shared deck view API and fails closed when unavailable', () => {
  const doc = { id: 'editor-doc' };
  const options = { deckViewApi: {
    buildStudioDeckHtml(nextDoc, nextOptions) {
      assert.equal(nextDoc, doc);
      assert.equal(nextOptions.marker, 'test');
      return '<html>canonical</html>';
    }
  }, marker: 'test' };

  assert.equal(canonicalViewState.buildStudioEditorDeckHtml(doc, options), '<html>canonical</html>');
  assert.equal(canonicalViewState.buildStudioEditorDeckHtml(doc), '');
});

test('editor deck view html delegates to the shared builder before fallback composition', () => {
  const doc = { id: 'editor-doc' };
  const delegated = canonicalViewState.buildStudioEditorDeckViewHtml(doc, {
    deckViewApi: {
      buildStudioDeckViewHtml(nextDoc, nextOptions) {
        assert.equal(nextDoc, doc);
        assert.equal(nextOptions.marker, 'test');
        return '<html>delegated</html>';
      }
    },
    marker: 'test'
  });
  const fallback = canonicalViewState.buildStudioEditorDeckViewHtml(doc, {
    buildViewOptions(nextDoc) {
      assert.equal(nextDoc, doc);
      return { marker: 'fallback' };
    },
    buildSharedHtml(nextDoc, options) {
      assert.equal(nextDoc, doc);
      assert.deepEqual(options, { marker: 'fallback' });
      return '<html>shared</html>';
    }
  });

  assert.equal(delegated, '<html>delegated</html>');
  assert.equal(fallback, '<html>shared</html>');
});

test('editor deck view html composes canonical and fallback options without the shared builder', () => {
  const doc = { id: 'editor-doc' };
  const calls = [];
  const result = canonicalViewState.buildStudioEditorDeckViewHtml(doc, {
    buildViewOptions() {
      return { marker: 'view' };
    },
    buildCanonicalHtml(canonicalDeck, options) {
      calls.push(['canonical', canonicalDeck, options]);
      return '<html>canonical</html>';
    },
    transformFallbackHtml: 'transform',
    buildDeckHtml(nextDoc, options) {
      calls.push(['deck', nextDoc, options]);
      assert.equal(options.marker, 'view');
      assert.equal(options.transformFallbackHtml, 'transform');
      assert.equal(options.buildCanonicalHtml({ id: 'deck' }, { mode: 'render' }), '<html>canonical</html>');
      return '<html>deck</html>';
    }
  });

  assert.equal(result, '<html>deck</html>');
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], 'deck');
  assert.equal(calls[0][1], doc);
  assert.equal(calls[0][2].marker, 'view');
  assert.equal(calls[0][2].transformFallbackHtml, 'transform');
  assert.equal(calls[1][0], 'canonical');
  assert.deepEqual(calls[1][1], { id: 'deck' });
  assert.deepEqual(calls[1][2], { mode: 'render' });
});

test('editor deck view resolver factories delegate to shared deck view APIs', () => {
  const calls = [];
  const buildOptions = { createBuildOptions: () => ({}) };
  const canonicalOptions = { mapCanonicalHtmlArgs: () => [] };
  const deckViewApi = {
    createStudioDeckViewBuildViewOptionsResolver(options) {
      calls.push(['build', options]);
      return 'build-resolver';
    },
    createStudioDeckViewCanonicalHtmlResolver(options) {
      calls.push(['canonical', options]);
      return 'canonical-resolver';
    }
  };

  assert.equal(
    canonicalViewState.createStudioEditorDeckViewBuildViewOptionsResolver({
      ...buildOptions,
      deckViewApi
    }),
    'build-resolver'
  );
  assert.equal(
    canonicalViewState.createStudioEditorDeckViewCanonicalHtmlResolver({
      ...canonicalOptions,
      deckViewApi
    }),
    'canonical-resolver'
  );
  assert.equal(calls[0][1].createBuildOptions, buildOptions.createBuildOptions);
  assert.equal(calls[1][1].mapCanonicalHtmlArgs, canonicalOptions.mapCanonicalHtmlArgs);
});

test('editor deck view resolver factories fail closed without the shared APIs', () => {
  assert.equal(canonicalViewState.createStudioEditorDeckViewBuildViewOptionsResolver(), null);
  assert.equal(canonicalViewState.createStudioEditorDeckViewCanonicalHtmlResolver(), null);
  assert.equal(canonicalViewState.createStudioEditorDeckViewHtmlOptions(), null);
});

test('editor deck view html options delegate to the shared deck view API', () => {
  const calls = [];
  const createBuildViewOptionsResolver = () => 'build-resolver';
  const createCanonicalHtmlResolver = () => 'canonical-resolver';
  const createBuildOptions = () => ({ marker: 'build-options' });
  const deckViewApi = {
    createStudioDeckViewHtmlOptions(options) {
      calls.push(options);
      return 'html-options';
    }
  };

  const result = canonicalViewState.createStudioEditorDeckViewHtmlOptions({
    deckViewApi,
    createBuildViewOptionsResolver,
    createCanonicalHtmlResolver,
    createBuildOptions,
    marker: 'editor'
  });

  assert.equal(result, 'html-options');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].createBuildViewOptionsResolver, createBuildViewOptionsResolver);
  assert.equal(calls[0].createCanonicalHtmlResolver, createCanonicalHtmlResolver);
  assert.equal(calls[0].createBuildOptions, createBuildOptions);
  assert.equal(calls[0].marker, 'editor');
});

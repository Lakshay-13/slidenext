const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const canonicalWallpaper = require('../shared/studio-editor-canonical-wallpaper.js');

function createSourceDeck() {
  return canonicalDeck.createCanonicalDeck({
    slides: [
      { id: 'slide-1', layout: { background: { style: '#000000' } } },
      { id: 'slide-2', layout: { background: { style: '#ffffff' } } }
    ]
  });
}

test('buildStudioCanonicalWallpaperDeck updates backgrounds for the affected slides', () => {
  const sourceDeck = createSourceDeck();
  const result = canonicalWallpaper.buildStudioCanonicalWallpaperDeck(
    [{ id: 'slide-1' }, { id: 'slide-2' }],
    'linear-gradient(#000000, #ffffff)',
    {
      canonicalDeckApi: canonicalDeck,
      canonicalDeckBeforeMutation: sourceDeck,
      getSlideId: (slide) => slide.id
    }
  );

  assert.equal(result.slides[0].layout.background.style, 'linear-gradient(#000000, #ffffff)');
  assert.equal(result.slides[1].layout.background.style, 'linear-gradient(#000000, #ffffff)');
  assert.equal(sourceDeck.slides[0].layout.background.style, '#000000');
  assert.equal(sourceDeck.slides[1].layout.background.style, '#ffffff');
});

test('buildStudioCanonicalWallpaperDeck fails closed when the canonical background mutation throws', () => {
  const throwingCanonicalDeckApi = {
    ...canonicalDeck,
    updateCanonicalSlideBackground() {
      throw new Error('canonical background mutation failed');
    }
  };

  const result = canonicalWallpaper.buildStudioCanonicalWallpaperDeck(
    [{ id: 'slide-1' }],
    'black',
    {
      canonicalDeckApi: throwingCanonicalDeckApi,
      canonicalDeckBeforeMutation: createSourceDeck()
    }
  );

  assert.equal(result, null);
});

test('buildStudioCanonicalWallpaperBaseline builds from the source document', () => {
  const sourceDeck = createSourceDeck();
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalWallpaper.buildStudioCanonicalWallpaperBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeckBaseline(documentRef) {
      builtFromDocument = documentRef;
      return sourceDeck;
    },
    buildCanonicalDeck() {
      throw new Error('DOM mutation builder should not provide the baseline');
    },
    sourceDocument
  });

  assert.equal(builtFromDocument, sourceDocument);
  assert.equal(result, sourceDeck);
});

test('buildStudioCanonicalWallpaperBaseline prefers a valid live canonical deck', () => {
  const liveDeck = createSourceDeck();
  let didBuildFromDocument = false;
  const result = canonicalWallpaper.buildStudioCanonicalWallpaperBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline() {
      return liveDeck;
    },
    buildCanonicalDeck() {
      didBuildFromDocument = true;
      return createSourceDeck();
    }
  });

  assert.equal(result, liveDeck);
  assert.equal(didBuildFromDocument, false);
});

test('buildStudioCanonicalWallpaperBaseline delegates baseline resolution to canonical state', () => {
  const sourceDeck = createSourceDeck();
  const sourceDocument = { id: 'editor-doc' };
  const getCanonicalDeckBaseline = () => sourceDeck;
  const buildCanonicalDeckBaseline = () => sourceDeck;
  let readerOptions = null;
  let readerDocument = null;
  const result = canonicalWallpaper.buildStudioCanonicalWallpaperBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: {
      createStudioEditorCanonicalDeckBaselineReader(options) {
        readerOptions = options;
        return (documentRef) => {
          readerDocument = documentRef;
          return sourceDeck;
        };
      }
    },
    getCanonicalDeckBaseline,
    buildCanonicalDeckBaseline,
    sourceDocument
  });

  assert.equal(result, sourceDeck);
  assert.equal(readerDocument, sourceDocument);
  assert.equal(readerOptions.getCanonicalDeckBaseline, getCanonicalDeckBaseline);
  assert.equal(readerOptions.buildCanonicalDeckBaseline, buildCanonicalDeckBaseline);
  assert.equal(readerOptions.isCanonicalDeck, canonicalDeck.isCanonicalDeck);
});

test('buildStudioCanonicalWallpaperBaseline rejects invalid compatibility baselines', () => {
  let rebuildCalls = 0;
  const result = canonicalWallpaper.buildStudioCanonicalWallpaperBaseline({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeck: () => {
      rebuildCalls += 1;
      return { invalid: true };
    }
  });

  assert.equal(result, null);
  assert.equal(rebuildCalls, 1);
});

test('buildStudioCanonicalWallpaperBaseline uses structural validation without a canonical validator', () => {
  const canonicalDeckApi = {
    updateCanonicalSlideBackground() {}
  };
  const malformedDeck = { invalid: true };
  const validDeck = { slides: [] };

  assert.equal(
    canonicalWallpaper.buildStudioCanonicalWallpaperBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => malformedDeck
    }),
    null
  );
  assert.equal(
    canonicalWallpaper.buildStudioCanonicalWallpaperBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => validDeck
    }),
    validDeck
  );
});

test('buildStudioCanonicalWallpaperBaseline falls back when the live canonical deck is invalid', () => {
  const sourceDeck = createSourceDeck();
  let didBuildFromDocument = false;
  const result = canonicalWallpaper.buildStudioCanonicalWallpaperBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline() {
      return { invalid: true };
    },
    buildCanonicalDeck() {
      didBuildFromDocument = true;
      return sourceDeck;
    }
  });

  assert.equal(result, sourceDeck);
  assert.equal(didBuildFromDocument, true);
});

test('buildStudioCanonicalWallpaperBaseline fails closed when a compatibility rebuild throws', () => {
  const result = canonicalWallpaper.buildStudioCanonicalWallpaperBaseline({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeckBaseline() {
      throw new Error('compatibility rebuild failed');
    }
  });

  assert.equal(result, null);
});

test('buildStudioCanonicalWallpaperBaseline disables live reuse for compatibility rebuilds', () => {
  const sourceDeck = createSourceDeck();
  const sourceDocument = { id: 'editor-doc' };
  let rebuildOptions = null;
  const result = canonicalWallpaper.buildStudioCanonicalWallpaperBaseline({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeckBaseline(documentRef, options) {
      assert.equal(documentRef, sourceDocument);
      rebuildOptions = options;
      return sourceDeck;
    },
    sourceDocument
  });

  assert.equal(result, sourceDeck);
  assert.deepEqual(rebuildOptions, { preferLiveCanonicalDeck: false });
});

test('buildStudioCanonicalWallpaperDeck fails closed when an adapter dependency is missing', () => {
  assert.equal(canonicalWallpaper.buildStudioCanonicalWallpaperDeck([{ id: 'slide-1' }], 'black', {}), null);
  assert.equal(canonicalWallpaper.buildStudioCanonicalWallpaperDeck([], 'black', {
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck: createSourceDeck
  }), null);
});

test('createStudioCanonicalWallpaperMutationBuilders reuses an explicit baseline', () => {
  const sourceDeck = createSourceDeck();
  let buildCount = 0;
  const builders = canonicalWallpaper.createStudioCanonicalWallpaperMutationBuilders({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck() {
      buildCount += 1;
      return sourceDeck;
    }
  });

  const result = builders.buildCanonicalWallpaperDeck(
    [{ id: 'slide-1' }],
    '#123456',
    {
      canonicalDeckBeforeMutation: sourceDeck,
      getSlideId: (slide) => slide.id
    }
  );

  assert.equal(buildCount, 0);
  assert.equal(result.slides[0].layout.background.style, '#123456');
  assert.equal(sourceDeck.slides[0].layout.background.style, '#000000');
});

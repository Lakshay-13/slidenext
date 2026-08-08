const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
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

test('buildStudioCanonicalWallpaperBaseline builds from the source document', () => {
  const sourceDeck = createSourceDeck();
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalWallpaper.buildStudioCanonicalWallpaperBaseline({
    canonicalDeckApi: canonicalDeck,
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

test('buildStudioCanonicalWallpaperDeck fails closed when an adapter dependency is missing', () => {
  assert.equal(canonicalWallpaper.buildStudioCanonicalWallpaperDeck([{ id: 'slide-1' }], 'black', {}), null);
  assert.equal(canonicalWallpaper.buildStudioCanonicalWallpaperDeck([], 'black', {
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck: createSourceDeck
  }), null);
});

test('createStudioCanonicalWallpaperMutationBuilders reuses an explicit baseline', () => {
  const sourceDeck = createSourceDeck();
  let buildCount = 0;
  const builders = canonicalWallpaper.createStudioCanonicalWallpaperMutationBuilders({
    canonicalDeckApi: canonicalDeck,
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

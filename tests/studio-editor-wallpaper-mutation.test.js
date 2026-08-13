const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const canonicalWallpaper = require('../shared/studio-editor-canonical-wallpaper.js');
const studioWallpaperView = require('../shared/studio-editor-wallpaper-view.js');
const wallpaperMutation = require('../shared/studio-editor-wallpaper-mutation.js');

test('applyStudioWallpaperSlidesMutationWithTransaction coordinates DOM, transaction, and canonical updates', () => {
  const sourceSlide = {
    dataset: { slideId: 'slide-1' },
    style: { background: 'white' }
  };
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      layout: { background: { style: 'white' } }
    }]
  });

  const result = wallpaperMutation.applyStudioWallpaperSlidesMutationWithTransaction(
    [sourceSlide],
    'black',
    {
      createStyleTransaction: studioTransaction.createStudioStyleTransaction,
      applyStudioWallpaperToSlides: studioWallpaperView.applyStudioWallpaperToSlides,
      canonicalDeckApi: canonicalDeck,
      canonicalWallpaperApi: canonicalWallpaper,
      buildCanonicalDeckBaseline: () => sourceDeck,
      buildCanonicalDeck: () => {
        throw new Error('DOM mutation builder should not provide the baseline');
      },
      getSlideId: (slide) => slide.dataset.slideId
    }
  );

  assert.equal(result.didChange, true);
  assert.equal(sourceSlide.style.background, 'black');
  assert.equal(sourceDeck.slides[0].layout.background.style, 'white');
  assert.equal(result.canonicalDeck.slides[0].layout.background.style, 'black');
  assert.deepEqual(result.transaction.operations[0], {
    type: 'style',
    elementId: 'slide:slide-1',
    before: { background: 'white' },
    after: { background: 'black' }
  });
});

test('applyStudioWallpaperSlidesMutationWithTransaction prefers the live canonical baseline', () => {
  const sourceSlide = {
    dataset: { slideId: 'slide-1' },
    style: { background: 'white' }
  };
  const liveDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', layout: { background: { style: 'live' } } }]
  });
  let didBuildFromDocument = false;

  const result = wallpaperMutation.applyStudioWallpaperSlidesMutationWithTransaction(
    [sourceSlide],
    'black',
    {
      createStyleTransaction: studioTransaction.createStudioStyleTransaction,
      applyStudioWallpaperToSlides: studioWallpaperView.applyStudioWallpaperToSlides,
      canonicalDeckApi: canonicalDeck,
      canonicalWallpaperApi: canonicalWallpaper,
      getCanonicalDeckBaseline: () => liveDeck,
      buildCanonicalDeckBaseline: () => {
        didBuildFromDocument = true;
        return canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
      },
      buildCanonicalDeck: () => {
        throw new Error('DOM mutation builder should not build the baseline');
      },
      getSlideId: (slide) => slide.dataset.slideId
    }
  );

  assert.equal(result.canonicalDeck.slides[0].layout.background.style, 'black');
  assert.equal(didBuildFromDocument, false);
});

test('applyStudioWallpaperSlidesMutationWithTransaction prefers pending canonical state over live state', () => {
  const sourceSlide = {
    dataset: { slideId: 'slide-1' },
    style: { background: 'white' }
  };
  const liveDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', layout: { background: { style: 'live' } } }]
  });
  const pendingDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', layout: { background: { style: 'pending' } } }]
  });

  const result = wallpaperMutation.applyStudioWallpaperSlidesMutationWithTransaction(
    [sourceSlide],
    'black',
    {
      applyStudioWallpaperToSlides: studioWallpaperView.applyStudioWallpaperToSlides,
      canonicalDeckApi: canonicalDeck,
      canonicalWallpaperApi: canonicalWallpaper,
      getPendingCanonicalDeck: () => pendingDeck,
      getCanonicalDeckBaseline: () => liveDeck,
      buildCanonicalDeckBaseline: () => {
        throw new Error('pending state should prevent a compatibility rebuild');
      },
      getSlideId: (slide) => slide.dataset.slideId
    }
  );

  assert.equal(result.canonicalDeck.slides[0].layout.background.style, 'black');
  assert.equal(result.canonicalDeck.slides[0].id, 'slide-1');
});

test('applyStudioWallpaperSlidesMutationWithTransaction fails closed without slides or an apply adapter', () => {
  assert.deepEqual(
    wallpaperMutation.applyStudioWallpaperSlidesMutationWithTransaction([], 'black'),
    { didChange: false, transaction: null }
  );
  assert.deepEqual(
    wallpaperMutation.applyStudioWallpaperSlidesMutationWithTransaction([{ style: {} }], 'black'),
    { didChange: false, transaction: null }
  );
});

test('applyStudioWallpaperSlidesMutationWithTransaction fails closed when canonical setup throws', () => {
  let applyCalls = 0;
  const sourceSlide = {
    dataset: { slideId: 'slide-1' },
    style: { background: 'white' }
  };

  const result = wallpaperMutation.applyStudioWallpaperSlidesMutationWithTransaction(
    [sourceSlide],
    'black',
    {
      canonicalWallpaperApi: {
        createStudioCanonicalWallpaperMutationBuilders() {
          throw new Error('canonical wallpaper builders unavailable');
        }
      },
      applyStudioWallpaperToSlides: () => {
        applyCalls += 1;
        return { didChange: true, transaction: null };
      }
    }
  );

  assert.deepEqual(result, { didChange: false, transaction: null });
  assert.equal(applyCalls, 0);
  assert.equal(sourceSlide.style.background, 'white');
});

test('applyStudioWallpaperSlidesMutationWithTransaction fails closed before DOM mutation when the canonical sidecar is null', () => {
  let applyCalls = 0;
  const sourceSlide = {
    dataset: { slideId: 'slide-1' },
    style: { background: 'white' }
  };

  const result = wallpaperMutation.applyStudioWallpaperSlidesMutationWithTransaction(
    [sourceSlide],
    'black',
    {
      canonicalWallpaperApi: {
        createStudioCanonicalWallpaperMutationBuilders() {
          return {
            buildCanonicalWallpaperBaseline: () => ({ slides: [{ id: 'slide-1' }] }),
            buildCanonicalWallpaperDeck: () => null
          };
        }
      },
      applyStudioWallpaperToSlides: () => {
        applyCalls += 1;
        return { didChange: true, transaction: null };
      }
    }
  );

  assert.deepEqual(result, { didChange: false, transaction: null });
  assert.equal(applyCalls, 0);
  assert.equal(sourceSlide.style.background, 'white');
});

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
      buildCanonicalDeck: () => sourceDeck,
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

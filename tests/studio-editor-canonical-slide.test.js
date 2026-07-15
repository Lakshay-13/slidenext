const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalSlide = require('../shared/studio-editor-canonical-slide.js');

test('buildStudioCanonicalDuplicateSlideDeck imports and inserts a duplicate without mutating the source', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1' }, { id: 'slide-3' }]
  });
  const result = canonicalSlide.buildStudioCanonicalDuplicateSlideDeck({
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: sourceDeck,
    duplicateSlide: { id: 'duplicate-slide' },
    duplicateSlideId: 'slide-2',
    insertionIndex: 1,
    importSlideToCanonicalSlide(slide, index, options) {
      assert.equal(slide.id, 'duplicate-slide');
      assert.equal(index, 1);
      return { id: options.getSlideId(), title: 'Duplicated' };
    }
  });

  assert.deepEqual(result.slides.map((slide) => slide.id), ['slide-1', 'slide-2', 'slide-3']);
  assert.deepEqual(sourceDeck.slides.map((slide) => slide.id), ['slide-1', 'slide-3']);
});

test('buildStudioCanonicalDuplicateSlideDeck preserves the fallback slide import path', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const result = canonicalSlide.buildStudioCanonicalDuplicateSlideDeck({
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: sourceDeck,
    duplicateSlide: { id: 'duplicate-slide' },
    duplicateSlideId: 'slide-2',
    insertionIndex: 1,
    title: 'Slide 2'
  });

  assert.equal(result.slides[1].title, 'Slide 2');
  assert.equal(canonicalSlide.buildStudioCanonicalDuplicateSlideDeck({}), null);
});

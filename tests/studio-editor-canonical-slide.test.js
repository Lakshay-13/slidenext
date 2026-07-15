const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalSlide = require('../shared/studio-editor-canonical-slide.js');

test('buildStudioCanonicalDuplicateSlideBaseline builds from the source document', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalSlide.buildStudioCanonicalDuplicateSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck(documentRef) {
      builtFromDocument = documentRef;
      return sourceDeck;
    },
    sourceDocument
  });

  assert.equal(builtFromDocument, sourceDocument);
  assert.equal(result, sourceDeck);
});

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

test('buildStudioCanonicalDuplicateSlideDeck passes the source document to the canonical builder', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalSlide.buildStudioCanonicalDuplicateSlideDeck({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck(documentRef) {
      builtFromDocument = documentRef;
      return sourceDeck;
    },
    sourceDocument,
    duplicateSlide: { id: 'generated-slide' },
    duplicateSlideId: 'slide-2',
    insertionIndex: 1
  });

  assert.equal(builtFromDocument, sourceDocument);
  assert.deepEqual(result.slides.map((slide) => slide.id), ['slide-1', 'slide-2']);
});

test('buildStudioCanonicalAddSlideBaseline builds from the source document', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalSlide.buildStudioCanonicalAddSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck(documentRef) {
      builtFromDocument = documentRef;
      return sourceDeck;
    },
    sourceDocument
  });

  assert.equal(builtFromDocument, sourceDocument);
  assert.equal(result, sourceDeck);
});

test('buildStudioCanonicalAddSlideDeck imports and appends a new slide without mutating the source', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalSlide.buildStudioCanonicalAddSlideDeck({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck(documentRef) {
      builtFromDocument = documentRef;
      return sourceDeck;
    },
    sourceDocument,
    newSlide: { id: 'generated-slide' },
    insertionIndex: 1,
    getSlideId: (slide) => slide.id,
    importSlideToCanonicalSlide(slide, index, options) {
      assert.equal(slide.id, 'generated-slide');
      assert.equal(index, 1);
      return { id: options.getSlideId(), title: 'New' };
    }
  });

  assert.equal(builtFromDocument, sourceDocument);
  assert.deepEqual(result.slides.map((slide) => slide.id), ['slide-1', 'generated-slide']);
  assert.deepEqual(sourceDeck.slides.map((slide) => slide.id), ['slide-1']);
});

test('buildStudioCanonicalDeleteSlideBaseline builds from the source document', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalSlide.buildStudioCanonicalDeleteSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck(documentRef) {
      builtFromDocument = documentRef;
      return sourceDeck;
    },
    sourceDocument
  });

  assert.equal(builtFromDocument, sourceDocument);
  assert.equal(result, sourceDeck);
});

test('buildStudioCanonicalDeleteSlideDeck removes only the requested slide without mutating the source', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1' }, { id: 'slide-2' }]
  });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalSlide.buildStudioCanonicalDeleteSlideDeck({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck(documentRef) {
      builtFromDocument = documentRef;
      return sourceDeck;
    },
    sourceDocument,
    deletedSlide: { id: 'slide-2' },
    slideId: 'slide-2'
  });

  assert.equal(builtFromDocument, sourceDocument);
  assert.deepEqual(result.slides.map((slide) => slide.id), ['slide-1']);
  assert.deepEqual(sourceDeck.slides.map((slide) => slide.id), ['slide-1', 'slide-2']);
});

test('buildStudioCanonicalReorderSlideDeck moves the requested slide without mutating the source', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1' }, { id: 'slide-2' }, { id: 'slide-3' }]
  });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const sourceSlide = { id: 'slide-1' };
  const targetSlide = { id: 'slide-3' };
  const result = canonicalSlide.buildStudioCanonicalReorderSlideDeck({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck(documentRef) {
      builtFromDocument = documentRef;
      return sourceDeck;
    },
    sourceDocument,
    sourceSlide,
    targetSlide,
    getSlideId: (slide) => slide.id
  });

  assert.equal(builtFromDocument, sourceDocument);
  assert.deepEqual(result.slides.map((slide) => slide.id), ['slide-2', 'slide-3', 'slide-1']);
  assert.deepEqual(sourceDeck.slides.map((slide) => slide.id), ['slide-1', 'slide-2', 'slide-3']);
});

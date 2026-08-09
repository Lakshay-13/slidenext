const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const canonicalSlide = require('../shared/studio-editor-canonical-slide.js');

test('buildStudioCanonicalDuplicateSlideBaseline builds from the source document', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalSlide.buildStudioCanonicalDuplicateSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck(documentRef) {
      builtFromDocument = documentRef;
      return sourceDeck;
    },
    sourceDocument
  });

  assert.equal(builtFromDocument, sourceDocument);
  assert.equal(result, sourceDeck);
});

test('buildStudioCanonicalDuplicateSlideBaseline prefers a valid live canonical deck', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let didBuildFromDocument = false;
  const result = canonicalSlide.buildStudioCanonicalDuplicateSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline() {
      return liveDeck;
    },
    buildCanonicalDeck() {
      didBuildFromDocument = true;
      return canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
    }
  });

  assert.equal(result, liveDeck);
  assert.equal(didBuildFromDocument, false);
});

test('buildStudioCanonicalDuplicateSlideBaseline delegates baseline resolution to canonical state', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const sourceDocument = { id: 'editor-doc' };
  const getCanonicalDeckBaseline = () => sourceDeck;
  const buildCanonicalDeck = () => sourceDeck;
  let readerOptions = null;
  let readerDocument = null;
  const result = canonicalSlide.buildStudioCanonicalDuplicateSlideBaseline({
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
    buildCanonicalDeck,
    sourceDocument
  });

  assert.equal(result, sourceDeck);
  assert.equal(readerDocument, sourceDocument);
  assert.equal(readerOptions.getCanonicalDeckBaseline, getCanonicalDeckBaseline);
  assert.equal(readerOptions.buildCanonicalDeckBaseline, buildCanonicalDeck);
  assert.equal(readerOptions.isCanonicalDeck, canonicalDeck.isCanonicalDeck);
});

test('buildStudioCanonicalDuplicateSlideBaseline falls back when the live canonical deck is invalid', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let didBuildFromDocument = false;
  const result = canonicalSlide.buildStudioCanonicalDuplicateSlideBaseline({
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

test('buildStudioCanonicalDuplicateSlideBaseline rejects invalid compatibility baselines', () => {
  let rebuildCalls = 0;
  const result = canonicalSlide.buildStudioCanonicalDuplicateSlideBaseline({
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

test('buildStudioCanonicalDuplicateSlideBaseline uses structural validation without a canonical validator', () => {
  const canonicalDeckApi = {
    insertCanonicalSlide() {}
  };
  const malformedDeck = { invalid: true };
  const validDeck = { slides: [] };

  assert.equal(
    canonicalSlide.buildStudioCanonicalDuplicateSlideBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => malformedDeck
    }),
    null
  );
  assert.equal(
    canonicalSlide.buildStudioCanonicalDuplicateSlideBaseline({
      canonicalDeckApi,
      getCanonicalDeckBaseline: () => validDeck
    }),
    validDeck
  );
});

test('buildStudioCanonicalDuplicateSlideBaseline fails closed when a compatibility rebuild throws', () => {
  const result = canonicalSlide.buildStudioCanonicalDuplicateSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck() {
      throw new Error('compatibility rebuild failed');
    }
  });

  assert.equal(result, null);
});

test('buildStudioCanonicalDuplicateSlideDeck imports and inserts a duplicate without mutating the source', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1' }, { id: 'slide-3' }]
  });
  const result = canonicalSlide.buildStudioCanonicalDuplicateSlideDeck({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
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

test('createStudioCanonicalDuplicateSlideMutationBuilders preserves an explicit baseline', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const explicitBaseline = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1' }, { id: 'slide-3' }]
  });
  let buildCount = 0;
  const builders = canonicalSlide.createStudioCanonicalDuplicateSlideMutationBuilders({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck() {
      buildCount += 1;
      return sourceDeck;
    },
    importSlideToCanonicalSlide(slide, index, options) {
      return { id: options.getSlideId(), title: `Copied ${index}` };
    }
  });

  const result = builders.buildCanonicalDuplicateSlideDeck({
    canonicalDeckBeforeMutation: explicitBaseline,
    duplicateSlide: { id: 'slide-2' },
    duplicateSlideId: 'slide-2',
    insertionIndex: 1
  });

  assert.equal(buildCount, 0);
  assert.deepEqual(result.slides.map((slide) => slide.id), ['slide-1', 'slide-2', 'slide-3']);
});

test('buildStudioCanonicalAddSlideBaseline builds from the source document', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalSlide.buildStudioCanonicalAddSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck(documentRef) {
      builtFromDocument = documentRef;
      return sourceDeck;
    },
    sourceDocument
  });

  assert.equal(builtFromDocument, sourceDocument);
  assert.equal(result, sourceDeck);
});

test('buildStudioCanonicalAddSlideBaseline prefers a valid live canonical deck', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let didBuildFromDocument = false;
  const result = canonicalSlide.buildStudioCanonicalAddSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline() {
      return liveDeck;
    },
    buildCanonicalDeck() {
      didBuildFromDocument = true;
      return canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
    }
  });

  assert.equal(result, liveDeck);
  assert.equal(didBuildFromDocument, false);
});

test('buildStudioCanonicalAddSlideBaseline falls back when the live canonical deck is invalid', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let didBuildFromDocument = false;
  const result = canonicalSlide.buildStudioCanonicalAddSlideBaseline({
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

test('buildStudioCanonicalAddSlideDeck imports and appends a new slide without mutating the source', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalSlide.buildStudioCanonicalAddSlideDeck({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
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

test('createStudioCanonicalAddSlideMutationBuilders shares canonical import wiring', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const sourceDocument = { id: 'editor-doc' };
  const builtDocuments = [];
  const importedSlides = [];
  const builders = canonicalSlide.createStudioCanonicalAddSlideMutationBuilders({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck(documentRef) {
      builtDocuments.push(documentRef);
      return sourceDeck;
    },
    getSlideId: (slide) => slide.id,
    importSlideToCanonicalSlide(slide, index, options) {
      importedSlides.push([slide, index, options.getSlideId(slide)]);
      return { id: options.getSlideId(slide), title: 'New' };
    }
  });

  const newSlide = { id: 'slide-2' };
  const result = builders.buildCanonicalAddSlideDeck({
    sourceDocument,
    newSlide,
    insertionIndex: 1
  });

  assert.deepEqual(builtDocuments, [sourceDocument]);
  assert.deepEqual(importedSlides, [[newSlide, 1, 'slide-2']]);
  assert.deepEqual(result.slides.map((slide) => slide.id), ['slide-1', 'slide-2']);
});

test('buildStudioCanonicalDeleteSlideBaseline builds from the source document', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalSlide.buildStudioCanonicalDeleteSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck(documentRef) {
      builtFromDocument = documentRef;
      return sourceDeck;
    },
    sourceDocument
  });

  assert.equal(builtFromDocument, sourceDocument);
  assert.equal(result, sourceDeck);
});

test('buildStudioCanonicalDeleteSlideBaseline prefers a valid live canonical deck', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let didBuildFromDocument = false;
  const result = canonicalSlide.buildStudioCanonicalDeleteSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline() {
      return liveDeck;
    },
    buildCanonicalDeck() {
      didBuildFromDocument = true;
      return canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
    }
  });

  assert.equal(result, liveDeck);
  assert.equal(didBuildFromDocument, false);
});

test('buildStudioCanonicalDeleteSlideBaseline falls back when the live canonical deck is invalid', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let didBuildFromDocument = false;
  const result = canonicalSlide.buildStudioCanonicalDeleteSlideBaseline({
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

test('buildStudioCanonicalDeleteSlideDeck removes only the requested slide without mutating the source', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1' }, { id: 'slide-2' }]
  });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalSlide.buildStudioCanonicalDeleteSlideDeck({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
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

test('createStudioCanonicalDeleteSlideMutationBuilders builds from the source document once', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1' }, { id: 'slide-2' }]
  });
  const sourceDocument = { id: 'editor-doc' };
  const builtDocuments = [];
  const builders = canonicalSlide.createStudioCanonicalDeleteSlideMutationBuilders({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck(documentRef) {
      builtDocuments.push(documentRef);
      return sourceDeck;
    }
  });

  const result = builders.buildCanonicalDeleteSlideDeck({
    sourceDocument,
    slideId: 'slide-2'
  });

  assert.deepEqual(builtDocuments, [sourceDocument]);
  assert.deepEqual(result.slides.map((slide) => slide.id), ['slide-1']);
});

test('buildStudioCanonicalReorderSlideBaseline builds from the source document', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const sourceDocument = { id: 'editor-doc' };
  let builtFromDocument = null;
  const result = canonicalSlide.buildStudioCanonicalReorderSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck(documentRef) {
      builtFromDocument = documentRef;
      return sourceDeck;
    },
    sourceDocument
  });

  assert.equal(builtFromDocument, sourceDocument);
  assert.equal(result, sourceDeck);
});

test('buildStudioCanonicalReorderSlideBaseline prefers a valid live canonical deck', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let didBuildFromDocument = false;
  const result = canonicalSlide.buildStudioCanonicalReorderSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline() {
      return liveDeck;
    },
    buildCanonicalDeck() {
      didBuildFromDocument = true;
      return canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
    }
  });

  assert.equal(result, liveDeck);
  assert.equal(didBuildFromDocument, false);
});

test('buildStudioCanonicalReorderSlideBaseline falls back when the live canonical deck is invalid', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let didBuildFromDocument = false;
  const result = canonicalSlide.buildStudioCanonicalReorderSlideBaseline({
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
    canonicalStateApi: canonicalState,
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

test('createStudioCanonicalReorderSlideMutationBuilders shares canonical API wiring', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1' }, { id: 'slide-2' }]
  });
  const sourceDocument = { id: 'editor-doc' };
  const builtDocuments = [];
  const builders = canonicalSlide.createStudioCanonicalReorderSlideMutationBuilders({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeck(documentRef) {
      builtDocuments.push(documentRef);
      return sourceDeck;
    }
  });

  const result = builders.buildCanonicalReorderSlideDeck({
    sourceDocument,
    sourceSlide: { id: 'slide-1' },
    targetSlide: { id: 'slide-2' },
    getSlideId: (slide) => slide.id
  });

  assert.deepEqual(builtDocuments, [sourceDocument]);
  assert.deepEqual(result.slides.map((slide) => slide.id), ['slide-2', 'slide-1']);
});

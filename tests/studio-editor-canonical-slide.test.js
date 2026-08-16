const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const canonicalSlide = require('../shared/studio-editor-canonical-slide.js');

test('findStudioCanonicalSlideById normalizes ids through the canonical deck resolver', () => {
  const deck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });

  assert.equal(
    canonicalSlide.findStudioCanonicalSlideById(deck, ' slide-1 '),
    deck.slides[0]
  );
  assert.equal(canonicalSlide.findStudioCanonicalSlideById(deck, 'missing'), null);
});

test('findStudioCanonicalSlideById preserves a local fallback when the shared resolver misses', () => {
  const slide = { id: 'legacy-slide' };
  const deck = { slides: [slide] };
  const canonicalDeckApi = {
    findCanonicalSlideById() {
      return null;
    }
  };

  assert.equal(
    canonicalSlide.findStudioCanonicalSlideById(deck, 'legacy-slide', { canonicalDeckApi }),
    slide
  );
});

test('createStudioEditorCanonicalSlideResolver reuses the canonical deck API', () => {
  const calls = [];
  const canonicalDeckApi = {
    findCanonicalSlideById(deck, slideId) {
      calls.push([deck, slideId]);
      return { id: slideId };
    }
  };
  const resolver = canonicalSlide.createStudioEditorCanonicalSlideResolver({ canonicalDeckApi });
  const deck = { slides: [] };

  assert.deepEqual(resolver(deck, 'slide-1'), { id: 'slide-1' });
  assert.deepEqual(calls, [[deck, 'slide-1']]);
});

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

test('buildStudioCanonicalDuplicateSlideBaseline prefers pending canonical state over live state', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const pendingDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'pending-slide' }] });

  const result = canonicalSlide.buildStudioCanonicalDuplicateSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getPendingCanonicalDeck: () => pendingDeck,
    getCanonicalDeckBaseline: () => liveDeck,
    buildCanonicalDeck() {
      throw new Error('pending state should prevent a compatibility rebuild');
    }
  });

  assert.equal(result, pendingDeck);
});

test('buildStudioCanonicalDuplicateSlideBaseline uses pending state in compatibility mode', () => {
  const pendingDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'pending-slide' }] });

  const result = canonicalSlide.buildStudioCanonicalDuplicateSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: {},
    getPendingCanonicalDeck: () => pendingDeck,
    getCanonicalDeckBaseline() {
      throw new Error('live baseline should not replace pending state');
    },
    buildCanonicalDeck() {
      throw new Error('compatibility rebuild should not replace pending state');
    }
  });

  assert.equal(result, pendingDeck);
});

test('buildStudioCanonicalReorderSlideBaseline prefers pending canonical state over live state', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1' }, { id: 'slide-2' }]
  });
  const pendingDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-2' }, { id: 'slide-1' }]
  });

  const result = canonicalSlide.buildStudioCanonicalReorderSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getPendingCanonicalDeck: () => pendingDeck,
    getCanonicalDeckBaseline: () => liveDeck,
    buildCanonicalDeck() {
      throw new Error('pending state should prevent a compatibility rebuild');
    }
  });

  assert.equal(result, pendingDeck);
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

test('buildStudioCanonicalDuplicateSlideBaseline prefers the shared canonical deck resolver', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let resolverOptions = null;
  const result = canonicalSlide.buildStudioCanonicalDuplicateSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: {
      createStudioEditorCanonicalDeckResolver(options) {
        resolverOptions = options;
        return () => sourceDeck;
      },
      createStudioEditorCanonicalDeckBaselineReader() {
        throw new Error('legacy baseline reader should not be used');
      }
    },
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeck: () => ({ invalid: true }),
    getPendingCanonicalDeck: () => sourceDeck,
    sourceDocument: { id: 'editor-doc' }
  });

  assert.equal(result, sourceDeck);
  assert.equal(typeof resolverOptions.getCanonicalDeckBaseline, 'function');
  assert.equal(typeof resolverOptions.getPendingCanonicalDeck, 'function');
  assert.equal(typeof resolverOptions.buildCanonicalDeckBaseline, 'function');
  assert.equal(resolverOptions.isCanonicalDeck, canonicalDeck.isCanonicalDeck);
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

test('buildStudioCanonicalDuplicateSlideBaseline disables live reuse for compatibility rebuilds', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const sourceDocument = { id: 'editor-doc' };
  let rebuildOptions = null;
  const result = canonicalSlide.buildStudioCanonicalDuplicateSlideBaseline({
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

test('buildStudioCanonicalDuplicateSlideDeck fails closed when canonical insertion throws', () => {
  const throwingCanonicalDeckApi = {
    ...canonicalDeck,
    insertCanonicalSlide() {
      throw new Error('canonical duplicate insertion failed');
    }
  };

  const result = canonicalSlide.buildStudioCanonicalDuplicateSlideDeck({
    canonicalDeckApi: throwingCanonicalDeckApi,
    canonicalDeckBeforeMutation: canonicalDeck.createCanonicalDeck({
      slides: [{ id: 'slide-1' }]
    }),
    duplicateSlide: { id: 'duplicate-slide' },
    duplicateSlideId: 'slide-2',
    insertionIndex: 1
  });

  assert.equal(result, null);
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

test('buildStudioCanonicalAddSlideBaseline prefers pending canonical state over live state', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const pendingDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'pending-slide' }] });

  const result = canonicalSlide.buildStudioCanonicalAddSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getPendingCanonicalDeck: () => pendingDeck,
    getCanonicalDeckBaseline: () => liveDeck,
    buildCanonicalDeck() {
      throw new Error('pending state should prevent a compatibility rebuild');
    }
  });

  assert.equal(result, pendingDeck);
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

test('buildStudioCanonicalAddSlideDeck fails closed when canonical append throws', () => {
  const throwingCanonicalDeckApi = {
    ...canonicalDeck,
    appendCanonicalSlide() {
      throw new Error('canonical add-slide append failed');
    }
  };

  const result = canonicalSlide.buildStudioCanonicalAddSlideDeck({
    canonicalDeckApi: throwingCanonicalDeckApi,
    canonicalDeckBeforeMutation: canonicalDeck.createCanonicalDeck({
      slides: [{ id: 'slide-1' }]
    }),
    newSlide: { id: 'generated-slide' },
    insertionIndex: 1,
    getSlideId: (slide) => slide.id
  });

  assert.equal(result, null);
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

test('buildStudioCanonicalDeleteSlideBaseline prefers pending canonical state over live state', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }, { id: 'slide-2' }] });
  const pendingDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'pending-slide' }] });

  const result = canonicalSlide.buildStudioCanonicalDeleteSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getPendingCanonicalDeck: () => pendingDeck,
    getCanonicalDeckBaseline: () => liveDeck,
    buildCanonicalDeck() {
      throw new Error('pending state should prevent a compatibility rebuild');
    }
  });

  assert.equal(result, pendingDeck);
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

test('buildStudioCanonicalDeleteSlideDeck fails closed when canonical removal throws', () => {
  const throwingCanonicalDeckApi = {
    ...canonicalDeck,
    removeCanonicalSlide() {
      throw new Error('canonical delete-slide removal failed');
    }
  };

  const result = canonicalSlide.buildStudioCanonicalDeleteSlideDeck({
    canonicalDeckApi: throwingCanonicalDeckApi,
    canonicalDeckBeforeMutation: canonicalDeck.createCanonicalDeck({
      slides: [{ id: 'slide-1' }, { id: 'slide-2' }]
    }),
    slideId: 'slide-2'
  });

  assert.equal(result, null);
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

test('buildStudioCanonicalReorderSlideBaseline prefers a dedicated baseline builder', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  const sourceDocument = { id: 'editor-doc' };
  let builtBaselineFromDocument = null;
  const result = canonicalSlide.buildStudioCanonicalReorderSlideBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    buildCanonicalDeckBaseline(documentRef) {
      builtBaselineFromDocument = documentRef;
      return sourceDeck;
    },
    buildCanonicalDeck() {
      throw new Error('mutation builder must not be used for the baseline');
    },
    sourceDocument
  });

  assert.equal(builtBaselineFromDocument, sourceDocument);
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

test('buildStudioCanonicalReorderSlideDeck fails closed when the canonical API throws', () => {
  const throwingCanonicalDeckApi = {
    ...canonicalDeck,
    reorderCanonicalSlides() {
      throw new Error('reorder failed');
    }
  };

  const result = canonicalSlide.buildStudioCanonicalReorderSlideDeck({
    canonicalDeckApi: throwingCanonicalDeckApi,
    canonicalDeckBeforeMutation: canonicalDeck.createCanonicalDeck({
      slides: [{ id: 'slide-1' }, { id: 'slide-2' }]
    }),
    sourceSlide: { id: 'slide-1' },
    targetSlide: { id: 'slide-2' }
  });

  assert.equal(result, null);
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

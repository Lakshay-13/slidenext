(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalSlide = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildStudioCanonicalDuplicateSlideBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const insertCanonicalSlide = canonicalDeckApi
      && typeof canonicalDeckApi.insertCanonicalSlide === 'function'
      ? canonicalDeckApi.insertCanonicalSlide
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;

    if (!insertCanonicalSlide || !buildCanonicalDeck) {
      return null;
    }

    return buildCanonicalDeck(options.sourceDocument);
  }

  function buildStudioCanonicalDuplicateSlideDeck(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const insertCanonicalSlide = canonicalDeckApi
      && typeof canonicalDeckApi.insertCanonicalSlide === 'function'
      ? canonicalDeckApi.insertCanonicalSlide
      : null;
    const importSlideToCanonicalSlide = typeof options.importSlideToCanonicalSlide === 'function'
      ? options.importSlideToCanonicalSlide
      : null;
    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(options, 'canonicalDeckBeforeMutation')
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalDuplicateSlideBaseline(options);
    const duplicateSlide = options.duplicateSlide;
    const insertionIndex = Number.isInteger(options.insertionIndex) ? options.insertionIndex : -1;
    const duplicateSlideId = typeof options.duplicateSlideId === 'string' ? options.duplicateSlideId : '';
    const title = typeof options.title === 'string' ? options.title : `Slide ${insertionIndex + 1}`;
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : () => duplicateSlideId;

    if (!insertCanonicalSlide
      || !canonicalDeckBeforeMutation
      || !duplicateSlide
      || insertionIndex < 0
      || !duplicateSlideId) {
      return null;
    }

    const canonicalSlide = importSlideToCanonicalSlide
      ? importSlideToCanonicalSlide(duplicateSlide, insertionIndex, { getSlideId })
      : { id: duplicateSlideId, title };
    if (!canonicalSlide) return null;
    return insertCanonicalSlide(canonicalDeckBeforeMutation, canonicalSlide, insertionIndex);
  }

  function createStudioCanonicalDuplicateSlideMutationBuilders(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const importSlideToCanonicalSlide = typeof options.importSlideToCanonicalSlide === 'function'
      ? options.importSlideToCanonicalSlide
      : null;
    const buildCanonicalDuplicateSlideBaseline = (duplicateOptions = {}) => (
      buildStudioCanonicalDuplicateSlideBaseline({
        ...duplicateOptions,
        canonicalDeckApi,
        buildCanonicalDeck
      })
    );
    const buildCanonicalDuplicateSlideDeck = (duplicateOptions = {}) => {
      const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(
        duplicateOptions,
        'canonicalDeckBeforeMutation'
      )
        ? duplicateOptions.canonicalDeckBeforeMutation
        : buildCanonicalDuplicateSlideBaseline(duplicateOptions);
      return buildStudioCanonicalDuplicateSlideDeck({
        ...duplicateOptions,
        canonicalDeckApi,
        buildCanonicalDeck,
        importSlideToCanonicalSlide,
        canonicalDeckBeforeMutation
      });
    };

    return {
      buildCanonicalDuplicateSlideBaseline,
      buildCanonicalDuplicateSlideDeck
    };
  }

  function buildStudioCanonicalAddSlideBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const appendCanonicalSlide = canonicalDeckApi
      && typeof canonicalDeckApi.appendCanonicalSlide === 'function'
      ? canonicalDeckApi.appendCanonicalSlide
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;

    if (!appendCanonicalSlide || !buildCanonicalDeck) {
      return null;
    }

    return buildCanonicalDeck(options.sourceDocument);
  }

  function buildStudioCanonicalAddSlideDeck(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const appendCanonicalSlide = canonicalDeckApi
      && typeof canonicalDeckApi.appendCanonicalSlide === 'function'
      ? canonicalDeckApi.appendCanonicalSlide
      : null;
    const importSlideToCanonicalSlide = typeof options.importSlideToCanonicalSlide === 'function'
      ? options.importSlideToCanonicalSlide
      : null;
    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(options, 'canonicalDeckBeforeMutation')
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalAddSlideBaseline(options);
    const newSlide = options.newSlide;
    const insertionIndex = Number.isInteger(options.insertionIndex) ? options.insertionIndex : -1;
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : (slide) => slide && slide.id || '';
    const newSlideId = getSlideId(newSlide);
    const title = typeof options.title === 'string' ? options.title : `Slide ${insertionIndex + 1}`;

    if (!appendCanonicalSlide
      || !canonicalDeckBeforeMutation
      || !newSlide
      || insertionIndex < 0
      || !newSlideId) {
      return null;
    }

    const canonicalSlide = importSlideToCanonicalSlide
      ? importSlideToCanonicalSlide(newSlide, insertionIndex, {
          getSlideId: () => newSlideId
        })
      : {
          id: newSlideId,
          title
        };
    if (!canonicalSlide) return null;
    return appendCanonicalSlide(canonicalDeckBeforeMutation, canonicalSlide);
  }

  function createStudioCanonicalAddSlideMutationBuilders(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const importSlideToCanonicalSlide = typeof options.importSlideToCanonicalSlide === 'function'
      ? options.importSlideToCanonicalSlide
      : null;
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : (slide) => slide && slide.id || '';
    const buildCanonicalAddSlideBaseline = (addOptions = {}) => (
      buildStudioCanonicalAddSlideBaseline({
        ...addOptions,
        canonicalDeckApi,
        buildCanonicalDeck
      })
    );
    const buildCanonicalAddSlideDeck = (addOptions = {}) => {
      const canonicalDeckBeforeMutation = buildCanonicalAddSlideBaseline(addOptions);
      return buildStudioCanonicalAddSlideDeck({
        ...addOptions,
        canonicalDeckApi,
        buildCanonicalDeck,
        getSlideId,
        importSlideToCanonicalSlide,
        canonicalDeckBeforeMutation
      });
    };

    return {
      buildCanonicalAddSlideBaseline,
      buildCanonicalAddSlideDeck
    };
  }

  function buildStudioCanonicalDeleteSlideBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const removeCanonicalSlide = canonicalDeckApi
      && typeof canonicalDeckApi.removeCanonicalSlide === 'function'
      ? canonicalDeckApi.removeCanonicalSlide
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;

    if (!removeCanonicalSlide || !buildCanonicalDeck) {
      return null;
    }

    return buildCanonicalDeck(options.sourceDocument);
  }

  function buildStudioCanonicalDeleteSlideDeck(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const removeCanonicalSlide = canonicalDeckApi
      && typeof canonicalDeckApi.removeCanonicalSlide === 'function'
      ? canonicalDeckApi.removeCanonicalSlide
      : null;
    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(options, 'canonicalDeckBeforeMutation')
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalDeleteSlideBaseline(options);
    const slideId = typeof options.slideId === 'string' ? options.slideId : '';

    if (!removeCanonicalSlide || !canonicalDeckBeforeMutation || !slideId) return null;
    return removeCanonicalSlide(canonicalDeckBeforeMutation, slideId);
  }

  function createStudioCanonicalDeleteSlideMutationBuilders(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeleteSlideBaseline = (deleteOptions = {}) => (
      buildStudioCanonicalDeleteSlideBaseline({
        ...deleteOptions,
        canonicalDeckApi,
        buildCanonicalDeck
      })
    );
    const buildCanonicalDeleteSlideDeck = (deleteOptions = {}) => {
      const canonicalDeckBeforeMutation = buildCanonicalDeleteSlideBaseline(deleteOptions);
      return buildStudioCanonicalDeleteSlideDeck({
        ...deleteOptions,
        canonicalDeckApi,
        buildCanonicalDeck,
        canonicalDeckBeforeMutation
      });
    };

    return {
      buildCanonicalDeleteSlideBaseline,
      buildCanonicalDeleteSlideDeck
    };
  }

  function buildStudioCanonicalReorderSlideBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const reorderCanonicalSlides = canonicalDeckApi
      && typeof canonicalDeckApi.reorderCanonicalSlides === 'function'
      ? canonicalDeckApi.reorderCanonicalSlides
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;

    if (!reorderCanonicalSlides || !buildCanonicalDeck) {
      return null;
    }

    return buildCanonicalDeck(options.sourceDocument);
  }

  function buildStudioCanonicalReorderSlideDeck(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const reorderCanonicalSlides = canonicalDeckApi
      && typeof canonicalDeckApi.reorderCanonicalSlides === 'function'
      ? canonicalDeckApi.reorderCanonicalSlides
      : null;
    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(options, 'canonicalDeckBeforeMutation')
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalReorderSlideBaseline(options);
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : (slide) => slide && slide.id || '';
    const sourceSlideId = getSlideId(options.sourceSlide);
    const targetSlideId = getSlideId(options.targetSlide);

    if (!reorderCanonicalSlides
      || !canonicalDeckBeforeMutation
      || !sourceSlideId
      || !targetSlideId
      || sourceSlideId === targetSlideId) {
      return null;
    }
    return reorderCanonicalSlides(canonicalDeckBeforeMutation, sourceSlideId, targetSlideId);
  }

  function createStudioCanonicalReorderSlideMutationBuilders(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalReorderSlideBaseline = (reorderOptions = {}) => (
      buildStudioCanonicalReorderSlideBaseline({
        ...reorderOptions,
        canonicalDeckApi,
        buildCanonicalDeck
      })
    );
    const buildCanonicalReorderSlideDeck = (reorderOptions = {}) => {
      const canonicalDeckBeforeMutation = buildCanonicalReorderSlideBaseline(reorderOptions);
      return buildStudioCanonicalReorderSlideDeck({
        ...reorderOptions,
        canonicalDeckApi,
        buildCanonicalDeck,
        canonicalDeckBeforeMutation
      });
    };

    return {
      buildCanonicalReorderSlideBaseline,
      buildCanonicalReorderSlideDeck
    };
  }

  return {
    buildStudioCanonicalAddSlideBaseline,
    buildStudioCanonicalAddSlideDeck,
    createStudioCanonicalAddSlideMutationBuilders,
    buildStudioCanonicalDeleteSlideBaseline,
    buildStudioCanonicalDeleteSlideDeck,
    createStudioCanonicalDeleteSlideMutationBuilders,
    buildStudioCanonicalDuplicateSlideBaseline,
    buildStudioCanonicalDuplicateSlideDeck,
    createStudioCanonicalDuplicateSlideMutationBuilders,
    buildStudioCanonicalReorderSlideBaseline,
    buildStudioCanonicalReorderSlideDeck,
    createStudioCanonicalReorderSlideMutationBuilders
  };
});

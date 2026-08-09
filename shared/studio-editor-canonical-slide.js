(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalSlide = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioCanonicalSlideMutationBuilders(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const buildBaseline = typeof options.buildBaseline === 'function'
      ? options.buildBaseline
      : null;
    const buildDeck = typeof options.buildDeck === 'function'
      ? options.buildDeck
      : null;
    const decorateDeckOptions = typeof options.decorateDeckOptions === 'function'
      ? options.decorateDeckOptions
      : (mutationOptions) => mutationOptions;

    const buildCanonicalMutationBaseline = (mutationOptions = {}) => (
      buildBaseline
        ? buildBaseline({
            ...mutationOptions,
            canonicalDeckApi,
            canonicalStateApi,
            buildCanonicalDeck,
            getCanonicalDeckBaseline
          })
        : null
    );
    const buildCanonicalMutationDeck = (mutationOptions = {}) => {
      const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(
        mutationOptions,
        'canonicalDeckBeforeMutation'
      )
        ? mutationOptions.canonicalDeckBeforeMutation
        : buildCanonicalMutationBaseline(mutationOptions);
      const decoratedOptions = decorateDeckOptions(mutationOptions);
      return buildDeck
        ? buildDeck({
            ...(decoratedOptions && typeof decoratedOptions === 'object'
              ? decoratedOptions
              : mutationOptions),
            canonicalDeckApi,
            canonicalStateApi,
            buildCanonicalDeck,
            canonicalDeckBeforeMutation
          })
        : null;
    };

    return {
      buildCanonicalMutationBaseline,
      buildCanonicalMutationDeck
    };
  }

  function buildStudioCanonicalSlideBaseline(options = {}, operationName) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const canApplyMutation = canonicalDeckApi
      && typeof canonicalDeckApi[operationName] === 'function';
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;

    function isValidCanonicalDeck(value) {
      if (!value) return false;
      const validate = typeof canonicalDeckApi.isCanonicalDeck === 'function'
        ? canonicalDeckApi.isCanonicalDeck
        : (candidate) => !!candidate
          && typeof candidate === 'object'
          && !Array.isArray(candidate)
          && Array.isArray(candidate.slides);
      try {
        return validate(value) === true;
      } catch (err) {
        return false;
      }
    }

    if (!canApplyMutation) return null;
    const readCanonicalDeckBaseline = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader({
          getCanonicalDeckBaseline,
          isCanonicalDeck: typeof canonicalDeckApi.isCanonicalDeck === 'function'
            ? canonicalDeckApi.isCanonicalDeck
            : null,
          buildCanonicalDeckBaseline: buildCanonicalDeck
        })
      : (sourceDocument) => {
          if (getCanonicalDeckBaseline) {
            try {
              const liveCanonicalDeck = getCanonicalDeckBaseline(sourceDocument);
              if (isValidCanonicalDeck(liveCanonicalDeck)) {
                return liveCanonicalDeck;
              }
            } catch (err) {
              // Fall through to the document rebuild path.
            }
          }
          if (!buildCanonicalDeck) return null;
          try {
            const rebuiltCanonicalDeck = buildCanonicalDeck(sourceDocument);
            return isValidCanonicalDeck(rebuiltCanonicalDeck)
              ? rebuiltCanonicalDeck
              : null;
          } catch (err) {
            return null;
          }
        };

    return readCanonicalDeckBaseline(options.sourceDocument);
  }

  function buildStudioCanonicalDuplicateSlideBaseline(options = {}) {
    return buildStudioCanonicalSlideBaseline(options, 'insertCanonicalSlide');
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
    const importSlideToCanonicalSlide = typeof options.importSlideToCanonicalSlide === 'function'
      ? options.importSlideToCanonicalSlide
      : null;
    const builders = createStudioCanonicalSlideMutationBuilders({
      ...options,
      buildBaseline: buildStudioCanonicalDuplicateSlideBaseline,
      buildDeck: buildStudioCanonicalDuplicateSlideDeck,
      decorateDeckOptions: (duplicateOptions) => ({
        ...duplicateOptions,
        importSlideToCanonicalSlide
      })
    });

    return {
      buildCanonicalDuplicateSlideBaseline: builders.buildCanonicalMutationBaseline,
      buildCanonicalDuplicateSlideDeck: builders.buildCanonicalMutationDeck
    };
  }

  function buildStudioCanonicalAddSlideBaseline(options = {}) {
    return buildStudioCanonicalSlideBaseline(options, 'appendCanonicalSlide');
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
    const importSlideToCanonicalSlide = typeof options.importSlideToCanonicalSlide === 'function'
      ? options.importSlideToCanonicalSlide
      : null;
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : (slide) => slide && slide.id || '';
    const builders = createStudioCanonicalSlideMutationBuilders({
      ...options,
      buildBaseline: buildStudioCanonicalAddSlideBaseline,
      buildDeck: buildStudioCanonicalAddSlideDeck,
      decorateDeckOptions: (addOptions) => ({
        ...addOptions,
        getSlideId,
        importSlideToCanonicalSlide
      })
    });

    return {
      buildCanonicalAddSlideBaseline: builders.buildCanonicalMutationBaseline,
      buildCanonicalAddSlideDeck: builders.buildCanonicalMutationDeck
    };
  }

  function buildStudioCanonicalDeleteSlideBaseline(options = {}) {
    return buildStudioCanonicalSlideBaseline(options, 'removeCanonicalSlide');
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
    const builders = createStudioCanonicalSlideMutationBuilders({
      ...options,
      buildBaseline: buildStudioCanonicalDeleteSlideBaseline,
      buildDeck: buildStudioCanonicalDeleteSlideDeck
    });

    return {
      buildCanonicalDeleteSlideBaseline: builders.buildCanonicalMutationBaseline,
      buildCanonicalDeleteSlideDeck: builders.buildCanonicalMutationDeck
    };
  }

  function buildStudioCanonicalReorderSlideBaseline(options = {}) {
    return buildStudioCanonicalSlideBaseline(options, 'reorderCanonicalSlides');
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
    const builders = createStudioCanonicalSlideMutationBuilders({
      ...options,
      buildBaseline: buildStudioCanonicalReorderSlideBaseline,
      buildDeck: buildStudioCanonicalReorderSlideDeck
    });

    return {
      buildCanonicalReorderSlideBaseline: builders.buildCanonicalMutationBaseline,
      buildCanonicalReorderSlideDeck: builders.buildCanonicalMutationDeck
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

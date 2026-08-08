(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalMetadata = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildStudioCanonicalMetadataBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const updateCanonicalSlideMetadata = canonicalDeckApi
      && typeof canonicalDeckApi.updateCanonicalSlideMetadata === 'function'
      ? canonicalDeckApi.updateCanonicalSlideMetadata
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : null;

    if (!updateCanonicalSlideMetadata) return null;

    if (getCanonicalDeckBaseline) {
      let liveCanonicalDeck = null;
      try {
        liveCanonicalDeck = getCanonicalDeckBaseline(options.sourceDocument);
      } catch (err) {
        liveCanonicalDeck = null;
      }
      if (typeof canonicalDeckApi.isCanonicalDeck !== 'function'
        || canonicalDeckApi.isCanonicalDeck(liveCanonicalDeck)) {
        if (liveCanonicalDeck) return liveCanonicalDeck;
      }
    }

    if (!buildCanonicalDeck) return null;
    return buildCanonicalDeck(options.sourceDocument);
  }

  function buildStudioCanonicalMetadataDeck(slide, metadata = {}, options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const updateCanonicalSlideMetadata = canonicalDeckApi
      && typeof canonicalDeckApi.updateCanonicalSlideMetadata === 'function'
      ? canonicalDeckApi.updateCanonicalSlideMetadata
      : null;
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : (target) => target && typeof target.id === 'string' ? target.id : '';
    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(
      options,
      'canonicalDeckBeforeMutation'
    )
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalMetadataBaseline(options);
    const normalizedSlideId = getSlideId(slide);

    if (!updateCanonicalSlideMetadata || !canonicalDeckBeforeMutation || !normalizedSlideId) {
      return null;
    }
    return updateCanonicalSlideMetadata(canonicalDeckBeforeMutation, normalizedSlideId, metadata);
  }

  function createStudioCanonicalMetadataMutationBuilders(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const buildCanonicalMetadataBaseline = (baselineOptions = {}) => (
      buildStudioCanonicalMetadataBaseline({
        ...baselineOptions,
        canonicalDeckApi,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getCanonicalDeckBaseline
      })
    );
    const buildCanonicalMetadataDeck = (slide, metadata = {}, deckOptions = {}) => {
      const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(
        deckOptions,
        'canonicalDeckBeforeMutation'
      )
        ? deckOptions.canonicalDeckBeforeMutation
        : buildCanonicalMetadataBaseline(deckOptions);
      return buildStudioCanonicalMetadataDeck(slide, metadata, {
        ...deckOptions,
        canonicalDeckApi,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        canonicalDeckBeforeMutation
      });
    };

    return {
      buildCanonicalMetadataBaseline,
      buildCanonicalMetadataDeck
    };
  }

  return {
    buildStudioCanonicalMetadataBaseline,
    buildStudioCanonicalMetadataDeck,
    createStudioCanonicalMetadataMutationBuilders
  };
});

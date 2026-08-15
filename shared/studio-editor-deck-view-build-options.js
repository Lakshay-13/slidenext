(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorDeckViewBuildOptions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function resolveBuildOption(options, name, fallback) {
    return typeof options[name] === 'function' ? options[name] : fallback;
  }

  function createStudioEditorDeckViewBuildOptions(options = {}) {
    const doc = options.doc || null;
    const buildOptions = options.buildOptions && typeof options.buildOptions === 'object'
      ? options.buildOptions
      : {};
    const canonicalViewStateApi = resolveApi(
      options,
      'canonicalViewStateApi',
      'SlideNextStudioEditorCanonicalViewState'
    );
    const deckViewApi = resolveApi(options, 'deckViewApi', 'SlideNextStudioDeckView');
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const fallbackBuildCanonicalDeck = resolveBuildOption(
      options,
      'fallbackBuildCanonicalDeck',
      () => null
    );
    const fallbackResolveLiveActiveSlideId = resolveBuildOption(
      options,
      'fallbackResolveLiveActiveSlideId',
      () => ''
    );
    const buildFallbackHtml = resolveBuildOption(
      buildOptions,
      'buildFallbackHtml',
      resolveBuildOption(options, 'buildFallbackHtml', () => '')
    );
    const buildRenderOptions = resolveBuildOption(
      buildOptions,
      'buildRenderOptions',
      resolveBuildOption(options, 'buildRenderOptions', () => ({}))
    );

    if (canonicalViewStateApi
      && typeof canonicalViewStateApi.createStudioEditorDeckViewBuildOptions === 'function') {
      return canonicalViewStateApi.createStudioEditorDeckViewBuildOptions(doc, {
        buildOptions,
        deckViewApi,
        getPendingCanonicalDeck,
        fallbackBuildCanonicalDeck,
        fallbackResolveLiveActiveSlideId,
        buildFallbackHtml,
        buildRenderOptions
      });
    }

    const activeSlideId = typeof buildOptions.activeSlideId === 'string'
      && buildOptions.activeSlideId.trim()
      ? buildOptions.activeSlideId
      : '';
    const createCanonicalDeckViewStateOptions = typeof options.createCanonicalDeckViewStateOptions === 'function'
      ? options.createCanonicalDeckViewStateOptions
      : null;
    const deckViewStateOptions = createCanonicalDeckViewStateOptions
      ? createCanonicalDeckViewStateOptions(buildOptions)
      : {
          buildCanonicalDeck: resolveBuildOption(
            buildOptions,
            'buildCanonicalDeck',
            fallbackBuildCanonicalDeck
          ),
          getPendingCanonicalDeck,
          resolveLiveActiveSlideId: resolveBuildOption(
            buildOptions,
            'resolveLiveActiveSlideId',
            fallbackResolveLiveActiveSlideId
          )
        };
    const resolvedBuildCanonicalDeck = typeof deckViewStateOptions.buildCanonicalDeck === 'function'
      ? deckViewStateOptions.buildCanonicalDeck
      : fallbackBuildCanonicalDeck;
    const resolvedGetPendingCanonicalDeck = typeof deckViewStateOptions.getPendingCanonicalDeck === 'function'
      ? deckViewStateOptions.getPendingCanonicalDeck
      : getPendingCanonicalDeck;
    const resolveLiveActiveSlideId = typeof deckViewStateOptions.resolveLiveActiveSlideId === 'function'
      ? deckViewStateOptions.resolveLiveActiveSlideId
      : fallbackResolveLiveActiveSlideId;
    if (deckViewApi && typeof deckViewApi.createStudioDeckViewBuildOptions === 'function') {
      return deckViewApi.createStudioDeckViewBuildOptions(doc, {
        activeSlideId,
        buildCanonicalDeck: resolvedBuildCanonicalDeck,
        getPendingCanonicalDeck: resolvedGetPendingCanonicalDeck,
        resolveLiveActiveSlideId,
        buildFallbackHtml,
        buildRenderOptions
      });
    }

    const resolveCanonicalDeckViewState = typeof options.resolveCanonicalDeckViewState === 'function'
      ? options.resolveCanonicalDeckViewState
      : null;
    const canonicalDeckViewState = resolveCanonicalDeckViewState
      ? resolveCanonicalDeckViewState(doc, {
          buildCanonicalDeck: resolvedBuildCanonicalDeck,
          getPendingCanonicalDeck: resolvedGetPendingCanonicalDeck,
          resolveLiveActiveSlideId
        })
      : null;
    const resolveCanonicalDeck = canonicalDeckViewState
      && typeof canonicalDeckViewState.resolveCanonicalDeck === 'function'
      ? canonicalDeckViewState.resolveCanonicalDeck
      : resolvedBuildCanonicalDeck;
    const liveActiveSlideId = canonicalDeckViewState
      && typeof canonicalDeckViewState.liveActiveSlideId === 'string'
      ? canonicalDeckViewState.liveActiveSlideId
      : resolveLiveActiveSlideId(doc);
    const resolvedCanonicalDeck = canonicalDeckViewState
      ? canonicalDeckViewState.resolvedCanonicalDeck || null
      : null;
    return {
      buildCanonicalDeck: resolveCanonicalDeck,
      buildFallbackHtml: (sourceDoc) => buildFallbackHtml(
        sourceDoc,
        doc ? resolveCanonicalDeck(sourceDoc) : resolvedCanonicalDeck
      ),
      deckHtmlOptions: {
        renderOptions: buildRenderOptions(doc, resolvedCanonicalDeck, {
          activeSlideId: activeSlideId || liveActiveSlideId
        })
      }
    };
  }

  return {
    createStudioEditorDeckViewBuildOptions
  };
});

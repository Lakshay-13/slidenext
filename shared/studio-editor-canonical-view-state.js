(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalViewState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function resolveDeckViewApi(options = {}) {
    return options.deckViewApi && typeof options.deckViewApi === 'object'
      ? options.deckViewApi
      : null;
  }

  function resolveCanonicalBuilder(options = {}) {
    if (typeof options.buildCanonicalDeck === 'function') {
      return options.buildCanonicalDeck;
    }
    if (typeof options.fallbackBuildCanonicalDeck === 'function') {
      return options.fallbackBuildCanonicalDeck;
    }
    return () => null;
  }

  function createStudioEditorCanonicalDeckResolverWithBuilder(doc, options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    const buildCanonicalDeck = resolveCanonicalBuilder(options);
    if (deckViewApi && typeof deckViewApi.createStudioCanonicalDeckResolver === 'function') {
      return deckViewApi.createStudioCanonicalDeckResolver(doc, {
        buildCanonicalDeck
      });
    }
    return () => null;
  }

  function resolveLiveActiveSlideIdBuilder(options = {}) {
    if (typeof options.resolveLiveActiveSlideId === 'function') {
      return options.resolveLiveActiveSlideId;
    }
    if (typeof options.fallbackResolveLiveActiveSlideId === 'function') {
      return options.fallbackResolveLiveActiveSlideId;
    }
    return () => '';
  }

  function createStudioEditorCanonicalDeckViewStateOptions(options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    const buildCanonicalDeck = resolveCanonicalBuilder(options);
    const resolveLiveActiveSlideId = resolveLiveActiveSlideIdBuilder(options);
    if (deckViewApi && typeof deckViewApi.createStudioDeckViewCanonicalStateOptions === 'function') {
      const sharedOptions = deckViewApi.createStudioDeckViewCanonicalStateOptions({
        buildCanonicalDeck,
        getPendingCanonicalDeck: options.getPendingCanonicalDeck,
        resolveLiveActiveSlideId
      });
      if (sharedOptions
        && typeof sharedOptions.buildCanonicalDeck === 'function'
        && typeof sharedOptions.resolveLiveActiveSlideId === 'function') {
        return sharedOptions;
      }
      return {
        buildCanonicalDeck: sharedOptions
          && typeof sharedOptions.buildCanonicalDeck === 'function'
          ? sharedOptions.buildCanonicalDeck
          : buildCanonicalDeck,
        resolveLiveActiveSlideId: sharedOptions
          && typeof sharedOptions.resolveLiveActiveSlideId === 'function'
          ? sharedOptions.resolveLiveActiveSlideId
          : resolveLiveActiveSlideId,
        getPendingCanonicalDeck: sharedOptions
          && typeof sharedOptions.getPendingCanonicalDeck === 'function'
          ? sharedOptions.getPendingCanonicalDeck
          : options.getPendingCanonicalDeck
      };
    }
    return {
      buildCanonicalDeck,
      getPendingCanonicalDeck: options.getPendingCanonicalDeck,
      resolveLiveActiveSlideId
    };
  }

  function createStudioEditorCanonicalDeckViewStateOptionsResolver(options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const fallbackBuildCanonicalDeck = typeof options.fallbackBuildCanonicalDeck === 'function'
      ? options.fallbackBuildCanonicalDeck
      : null;
    const fallbackResolveLiveActiveSlideId = typeof options.fallbackResolveLiveActiveSlideId === 'function'
      ? options.fallbackResolveLiveActiveSlideId
      : null;

    return (nextOptions = {}) => createStudioEditorCanonicalDeckViewStateOptions({
      deckViewApi,
      buildCanonicalDeck: nextOptions.buildCanonicalDeck,
      getPendingCanonicalDeck: typeof nextOptions.getPendingCanonicalDeck === 'function'
        ? nextOptions.getPendingCanonicalDeck
        : getPendingCanonicalDeck,
      resolveLiveActiveSlideId: nextOptions.resolveLiveActiveSlideId,
      fallbackBuildCanonicalDeck: typeof nextOptions.fallbackBuildCanonicalDeck === 'function'
        ? nextOptions.fallbackBuildCanonicalDeck
        : fallbackBuildCanonicalDeck,
      fallbackResolveLiveActiveSlideId: typeof nextOptions.fallbackResolveLiveActiveSlideId === 'function'
        ? nextOptions.fallbackResolveLiveActiveSlideId
        : fallbackResolveLiveActiveSlideId
    });
  }

  function resolveStudioEditorCanonicalDeckViewState(doc, options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    const deckViewStateOptions = createStudioEditorCanonicalDeckViewStateOptions(options);
    const {
      buildCanonicalDeck,
      getPendingCanonicalDeck,
      resolveLiveActiveSlideId
    } = deckViewStateOptions;
    if (deckViewApi && typeof deckViewApi.resolveStudioCanonicalDeckViewState === 'function') {
      return deckViewApi.resolveStudioCanonicalDeckViewState(doc, {
        buildCanonicalDeck,
        resolveLiveActiveSlideId,
        ...(typeof getPendingCanonicalDeck === 'function'
          ? { getPendingCanonicalDeck }
          : {}),
        ...(typeof options.resolveLiveCanonicalDeck === 'function'
          ? { resolveLiveCanonicalDeck: options.resolveLiveCanonicalDeck }
          : {})
      });
    }
    const liveActiveSlideId = resolveLiveActiveSlideId(doc);
    const resolveLiveCanonicalDeck = typeof options.resolveLiveCanonicalDeck === 'function'
      ? options.resolveLiveCanonicalDeck
      : null;
    let pendingCanonicalDeck = null;
    if (getPendingCanonicalDeck) {
      try {
        const candidate = getPendingCanonicalDeck(doc);
        if (candidate && Array.isArray(candidate.slides)) pendingCanonicalDeck = candidate;
      } catch (error) {
        // Continue through the live canonical fallback.
      }
    }
    return {
      resolveCanonicalDeck: pendingCanonicalDeck
        ? () => pendingCanonicalDeck
        : resolveLiveCanonicalDeck || (() => null),
      liveActiveSlideId,
      resolvedCanonicalDeck: pendingCanonicalDeck || (!doc
        ? resolveLiveCanonicalDeck
          ? resolveLiveCanonicalDeck(doc)
          : null
        : liveActiveSlideId && resolveLiveCanonicalDeck
          ? resolveLiveCanonicalDeck(doc)
          : null)
    };
  }

  function createStudioEditorDeckViewSharedOptions(doc, options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    if (!deckViewApi || typeof deckViewApi.createStudioDeckViewSharedOptions !== 'function') {
      return {};
    }
    return deckViewApi.createStudioDeckViewSharedOptions(doc, {
      currentSlideIndex: Number.isInteger(options.currentSlideIndex)
        ? options.currentSlideIndex
        : 0,
      getPersistedActiveSlideId: typeof options.getPersistedActiveSlideId === 'function'
        ? options.getPersistedActiveSlideId
        : () => '',
      buildCanonicalDeck: resolveCanonicalBuilder(options),
      resolveCanonicalDeckOverride: typeof options.resolveCanonicalDeckOverride === 'function'
        ? options.resolveCanonicalDeckOverride
        : (canonicalDeck) => canonicalDeck,
      resolveLiveActiveSlideId: resolveLiveActiveSlideIdBuilder(options),
      isCanonicalDeck: typeof options.isCanonicalDeck === 'function'
        ? options.isCanonicalDeck
        : null
    });
  }

  function getEditorDeckViewSharedOptions(doc, options = {}) {
    return typeof options.getDeckViewSharedOptions === 'function'
      ? options.getDeckViewSharedOptions(doc)
      : {};
  }

  function resolveStudioEditorFallbackActiveSlideId(doc, canonicalDeck, options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    if (!deckViewApi || typeof deckViewApi.resolveStudioFallbackActiveSlideId !== 'function') {
      return '';
    }
    return deckViewApi.resolveStudioFallbackActiveSlideId(
      doc,
      canonicalDeck,
      getEditorDeckViewSharedOptions(doc, options)
    );
  }

  function resolveStudioEditorLiveActiveSlide(doc, options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    if (!deckViewApi || typeof deckViewApi.resolveStudioLiveActiveSlide !== 'function') {
      return null;
    }
    return deckViewApi.resolveStudioLiveActiveSlide(doc);
  }

  function resolveStudioEditorLiveActiveSlideId(doc, options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    if (!deckViewApi || typeof deckViewApi.resolveStudioLiveActiveSlideId !== 'function') {
      return '';
    }
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    return deckViewApi.resolveStudioLiveActiveSlideId(doc, { getActiveSlideId });
  }

  function createStudioEditorDeckRenderOptions(doc, canonicalDeck, options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    if (!deckViewApi || typeof deckViewApi.createStudioDeckRenderOptions !== 'function') {
      return null;
    }
    return deckViewApi.createStudioDeckRenderOptions(doc, canonicalDeck, {
      activeSlideId: options.activeSlideId,
      ...getEditorDeckViewSharedOptions(doc, options)
    });
  }

  function createStudioEditorDeckViewBuildOptions(doc, options = {}) {
    const buildOptions = options.buildOptions && typeof options.buildOptions === 'object'
      ? options.buildOptions
      : {};
    const activeSlideId = typeof buildOptions.activeSlideId === 'string'
      && buildOptions.activeSlideId.trim()
      ? buildOptions.activeSlideId
      : '';
    const deckViewApi = resolveDeckViewApi(options);
    const deckViewStateOptions = createStudioEditorCanonicalDeckViewStateOptions({
      deckViewApi,
      buildCanonicalDeck: buildOptions.buildCanonicalDeck,
      getPendingCanonicalDeck: options.getPendingCanonicalDeck,
      resolveLiveActiveSlideId: buildOptions.resolveLiveActiveSlideId,
      fallbackBuildCanonicalDeck: options.fallbackBuildCanonicalDeck,
      fallbackResolveLiveActiveSlideId: options.fallbackResolveLiveActiveSlideId
    });
    const {
      buildCanonicalDeck,
      getPendingCanonicalDeck,
      resolveLiveActiveSlideId
    } = deckViewStateOptions;
    const buildFallbackHtml = typeof buildOptions.buildFallbackHtml === 'function'
      ? buildOptions.buildFallbackHtml
      : typeof options.buildFallbackHtml === 'function'
        ? options.buildFallbackHtml
        : () => '';
    const buildRenderOptions = typeof buildOptions.buildRenderOptions === 'function'
      ? buildOptions.buildRenderOptions
      : typeof options.buildRenderOptions === 'function'
        ? options.buildRenderOptions
        : () => ({});

    if (deckViewApi && typeof deckViewApi.createStudioDeckViewBuildOptions === 'function') {
      return deckViewApi.createStudioDeckViewBuildOptions(doc, {
        activeSlideId,
        buildCanonicalDeck,
        getPendingCanonicalDeck,
        resolveLiveActiveSlideId,
        buildFallbackHtml,
        buildRenderOptions
      });
    }

    const canonicalDeckViewState = resolveStudioEditorCanonicalDeckViewState(doc, {
      deckViewApi,
      buildCanonicalDeck,
      getPendingCanonicalDeck,
      resolveLiveActiveSlideId
    });
    const resolveCanonicalDeck = canonicalDeckViewState
      && typeof canonicalDeckViewState.resolveCanonicalDeck === 'function'
      ? canonicalDeckViewState.resolveCanonicalDeck
      : () => null;
    const liveActiveSlideId = canonicalDeckViewState
      && typeof canonicalDeckViewState.liveActiveSlideId === 'string'
      ? canonicalDeckViewState.liveActiveSlideId
      : '';
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

  function buildStudioEditorDeckHtml(doc, options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    return deckViewApi && typeof deckViewApi.buildStudioDeckHtml === 'function'
      ? deckViewApi.buildStudioDeckHtml(doc, options)
      : '';
  }

  function buildStudioEditorDeckViewHtml(doc, options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    if (deckViewApi && typeof deckViewApi.buildStudioDeckViewHtml === 'function') {
      return deckViewApi.buildStudioDeckViewHtml(doc, options);
    }

    const buildSharedHtml = typeof options.buildSharedHtml === 'function'
      ? options.buildSharedHtml
      : null;
    const deckViewOptions = typeof options.buildViewOptions === 'function'
      ? options.buildViewOptions(doc)
      : {};
    if (buildSharedHtml) {
      return buildSharedHtml(doc, deckViewOptions);
    }

    const buildDeckHtml = typeof options.buildDeckHtml === 'function'
      ? options.buildDeckHtml
      : null;
    return buildDeckHtml
      ? buildDeckHtml(doc, {
          ...deckViewOptions,
          buildCanonicalHtml: typeof options.buildCanonicalHtml === 'function'
            ? (canonicalDeck, deckHtmlOptions) => options.buildCanonicalHtml(canonicalDeck, deckHtmlOptions)
            : null,
          transformFallbackHtml: options.transformFallbackHtml
        })
      : '';
  }

  function createStudioEditorDeckViewBuildViewOptionsResolver(options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    if (!deckViewApi
      || typeof deckViewApi.createStudioDeckViewBuildViewOptionsResolver !== 'function') {
      return null;
    }
    return deckViewApi.createStudioDeckViewBuildViewOptionsResolver(options);
  }

  function createStudioEditorDeckViewCanonicalHtmlResolver(options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    if (!deckViewApi
      || typeof deckViewApi.createStudioDeckViewCanonicalHtmlResolver !== 'function') {
      return null;
    }
    return deckViewApi.createStudioDeckViewCanonicalHtmlResolver(options);
  }

  function createStudioEditorDeckViewHtmlOptions(options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    if (!deckViewApi || typeof deckViewApi.createStudioDeckViewHtmlOptions !== 'function') {
      return null;
    }
    return deckViewApi.createStudioDeckViewHtmlOptions(options);
  }

  return {
    createStudioEditorCanonicalDeckResolverWithBuilder,
    createStudioEditorCanonicalDeckViewStateOptions,
    createStudioEditorCanonicalDeckViewStateOptionsResolver,
    resolveStudioEditorCanonicalDeckViewState,
    createStudioEditorDeckViewSharedOptions,
    resolveStudioEditorFallbackActiveSlideId,
    resolveStudioEditorLiveActiveSlide,
    resolveStudioEditorLiveActiveSlideId,
    createStudioEditorDeckRenderOptions,
    createStudioEditorDeckViewBuildOptions,
    buildStudioEditorDeckHtml,
    buildStudioEditorDeckViewHtml,
    createStudioEditorDeckViewBuildViewOptionsResolver,
    createStudioEditorDeckViewCanonicalHtmlResolver,
    createStudioEditorDeckViewHtmlOptions
  };
});

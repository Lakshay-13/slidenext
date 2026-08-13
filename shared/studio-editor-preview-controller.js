(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPreviewController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveBuilderOption(value, fallback = null) {
    try {
      const resolved = typeof value === 'function' ? value() : value;
      return resolved === undefined || resolved === null ? fallback : resolved;
    } catch (error) {
      return fallback;
    }
  }

  function createStudioEditorPreviewHtmlBuilder(options = {}) {
    const buildDeckViewHtml = typeof options.buildDeckViewHtml === 'function'
      ? options.buildDeckViewHtml
      : () => '';
    const createDeckViewHtmlOptions = typeof options.createDeckViewHtmlOptions === 'function'
      ? options.createDeckViewHtmlOptions
      : () => null;

    return function buildPreviewHtml(doc, viewOptions = {}) {
      const normalizedViewOptions = viewOptions && typeof viewOptions === 'object'
        ? viewOptions
        : {};
      return buildDeckViewHtml(doc, createDeckViewHtmlOptions({
        ...normalizedViewOptions,
        buildStudioPreviewHtml: resolveBuilderOption(options.resolveBuildStudioPreviewHtml),
        buildDeckPreviewHtml: resolveBuilderOption(options.resolveBuildDeckPreviewHtml),
        injectBaseHrefIntoHtml: resolveBuilderOption(options.resolveInjectBaseHrefIntoHtml),
        buildPresentationBaseHref: resolveBuilderOption(options.resolveBuildPresentationBaseHref),
        presentationUrl: resolveBuilderOption(options.resolvePresentationUrl, '')
      }));
    };
  }

  function createStudioEditorPreviewController(options = {}) {
    const previewApi = options.previewApi
      || (root && root.SlideNextStudioPreview)
      || null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    const resolveReadyState = typeof options.resolveReadyState === 'function'
      ? options.resolveReadyState
      : () => ({ canLaunchPreview: false });
    const resolvePresentationUrl = typeof options.resolvePresentationUrl === 'function'
      ? options.resolvePresentationUrl
      : () => (typeof options.presentationUrl === 'string' ? options.presentationUrl : '');
    const resolveActiveSlideIndex = typeof options.resolveActiveSlideIndex === 'function'
      ? options.resolveActiveSlideIndex
      : () => (Number.isInteger(options.activeSlideIndex) ? options.activeSlideIndex : 0);
    const buildPreviewHtml = typeof options.buildPreviewHtml === 'function'
      ? options.buildPreviewHtml
      : () => '';
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : (value) => !!value && typeof value === 'object' && Array.isArray(value.slides);

    function createStudioEditorPreviewFallbackHtmlTransformer(transformOptions = {}) {
      const injectBaseHrefIntoHtml = typeof transformOptions.injectBaseHrefIntoHtml === 'function'
        ? transformOptions.injectBaseHrefIntoHtml
        : null;
      const buildPresentationBaseHref = typeof transformOptions.buildPresentationBaseHref === 'function'
        ? transformOptions.buildPresentationBaseHref
        : null;
      const presentationUrl = typeof transformOptions.presentationUrl === 'string'
        ? transformOptions.presentationUrl
        : '';

      return function transformFallbackHtml(fallbackHtml, deckHtmlOptions = {}) {
        if (!fallbackHtml || !injectBaseHrefIntoHtml || !buildPresentationBaseHref) {
          return fallbackHtml;
        }
        return injectBaseHrefIntoHtml(
          fallbackHtml,
          buildPresentationBaseHref(presentationUrl, deckHtmlOptions)
        );
      };
    }

    function createStudioEditorPreviewDeckViewHtmlOptions(viewOptions = {}) {
      const createDeckViewHtmlOptions = typeof viewOptions.createDeckViewHtmlOptions === 'function'
        ? viewOptions.createDeckViewHtmlOptions
        : null;
      if (!createDeckViewHtmlOptions) return null;

      const presentationUrl = typeof viewOptions.presentationUrl === 'string'
        ? viewOptions.presentationUrl
        : '';
      const canonicalDeck = viewOptions.canonicalDeck && typeof viewOptions.canonicalDeck === 'object'
        ? viewOptions.canonicalDeck
        : null;
      const buildStudioPreviewHtml = typeof viewOptions.buildStudioPreviewHtml === 'function'
        ? viewOptions.buildStudioPreviewHtml
        : null;
      const buildDeckPreviewHtml = typeof viewOptions.buildDeckPreviewHtml === 'function'
        ? viewOptions.buildDeckPreviewHtml
        : null;
      const injectBaseHrefIntoHtml = typeof viewOptions.injectBaseHrefIntoHtml === 'function'
        ? viewOptions.injectBaseHrefIntoHtml
        : null;
      const buildPresentationBaseHref = typeof viewOptions.buildPresentationBaseHref === 'function'
        ? viewOptions.buildPresentationBaseHref
        : null;
      const createFallbackHtmlTransformer = typeof viewOptions.createFallbackHtmlTransformer === 'function'
        ? viewOptions.createFallbackHtmlTransformer
        : createStudioEditorPreviewFallbackHtmlTransformer;

      return createDeckViewHtmlOptions({
        buildSharedHtml: buildStudioPreviewHtml,
        extendViewOptions: (deckViewOptions) => ({
          ...deckViewOptions,
          presentationUrl,
          ...(canonicalDeck ? { canonicalDeck } : {})
        }),
        buildCanonicalHtml: buildDeckPreviewHtml,
        mapCanonicalHtmlArgs: (canonicalDeck, deckHtmlOptions) => [
          canonicalDeck,
          presentationUrl,
          deckHtmlOptions
        ],
        transformFallbackHtml: createFallbackHtmlTransformer({
          injectBaseHrefIntoHtml,
          buildPresentationBaseHref,
          presentationUrl
        })
      });
    }

    function launch() {
      const readyState = resolveReadyState();
      if (!readyState || !readyState.canLaunchPreview) return false;

      const presentationUrl = resolvePresentationUrl();
      if (typeof presentationUrl !== 'string' || !presentationUrl) return false;
      if (!previewApi || typeof previewApi.launchStudioPresentation !== 'function') return false;

      let canonicalDeck = null;
      if (getPendingCanonicalDeck) {
        try {
          const pendingCanonicalDeck = getPendingCanonicalDeck();
          canonicalDeck = isCanonicalDeck(pendingCanonicalDeck) ? pendingCanonicalDeck : null;
        } catch (error) {
          canonicalDeck = null;
        }
      }
      if (buildCanonicalDeck) {
        if (!canonicalDeck) {
          try {
            const candidate = buildCanonicalDeck();
            canonicalDeck = isCanonicalDeck(candidate) ? candidate : null;
          } catch (error) {
            canonicalDeck = null;
          }
        }
      }

      return previewApi.launchStudioPresentation({
        document: documentRef,
        startSlideIdx: resolveActiveSlideIndex(),
        presentationUrl,
        previewHtml: buildPreviewHtml(canonicalDeck)
      });
    }

    function openModal(startSlideIdx) {
      if (!previewApi || typeof previewApi.openPresentationModalWithLoader !== 'function') {
        return false;
      }
      return previewApi.openPresentationModalWithLoader({
        document: documentRef,
        startSlideIdx
      });
    }

    function closeModal() {
      if (!previewApi || typeof previewApi.resetStudioPresentationUiState !== 'function') {
        return false;
      }
      previewApi.resetStudioPresentationUiState({
        document: documentRef
      });
      return true;
    }

    function toggleFullscreen() {
      if (!previewApi || typeof previewApi.toggleStudioPresentationFullscreen !== 'function') {
        return false;
      }
      return previewApi.toggleStudioPresentationFullscreen({
        document: documentRef,
        consoleRef: options.consoleRef
      });
    }

    function syncFullscreenIcon() {
      if (!previewApi || typeof previewApi.syncStudioFullscreenIcon !== 'function') {
        return false;
      }
      return previewApi.syncStudioFullscreenIcon({
        document: documentRef
      });
    }

    function launchUrl(url, startSlideIdx) {
      if (!previewApi || typeof previewApi.launchPresentationUrl !== 'function') return false;
      return previewApi.launchPresentationUrl({
        document: documentRef,
        startSlideIdx,
        url
      });
    }

    function launchHtml(html, startSlideIdx) {
      if (!previewApi || typeof previewApi.launchPresentationHtml !== 'function') return false;
      return previewApi.launchPresentationHtml({
        document: documentRef,
        startSlideIdx,
        html
      });
    }

    return {
      launch,
      launchPreview: launch,
      openModal,
      closeModal,
      toggleFullscreen,
      syncFullscreenIcon,
      launchUrl,
      launchHtml,
      createStudioEditorPreviewFallbackHtmlTransformer,
      createStudioEditorPreviewDeckViewHtmlOptions
    };
  }

  return {
    createStudioEditorPreviewHtmlBuilder,
    createStudioEditorPreviewController
  };
});

(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPreviewController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
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

      return previewApi.launchStudioPresentation({
        document: documentRef,
        startSlideIdx: resolveActiveSlideIndex(),
        presentationUrl,
        previewHtml: buildPreviewHtml()
      });
    }

    return {
      launch,
      launchPreview: launch,
      createStudioEditorPreviewFallbackHtmlTransformer,
      createStudioEditorPreviewDeckViewHtmlOptions
    };
  }

  return {
    createStudioEditorPreviewController
  };
});

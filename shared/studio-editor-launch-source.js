(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLaunchSource = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isCanonicalDeckLike(value) {
    return !!value
      && typeof value === 'object'
      && !Array.isArray(value)
      && Array.isArray(value.slides);
  }

  function createStudioEditorLaunchSourceResolver(options = {}) {
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : isCanonicalDeckLike;
    const buildCanonicalHtml = typeof options.buildCanonicalHtml === 'function'
      ? options.buildCanonicalHtml
      : null;

    function resolve(presentationUrl = '', metadata = null) {
      const canonicalDeck = metadata
        && typeof metadata === 'object'
        && !Array.isArray(metadata)
        ? metadata.canonicalDeck
        : null;
      let isValidCanonicalDeck = false;
      try {
        isValidCanonicalDeck = isCanonicalDeck(canonicalDeck) === true;
      } catch (error) {
        isValidCanonicalDeck = false;
      }

      if (!isValidCanonicalDeck || !buildCanonicalHtml) {
        return {
          kind: 'url',
          url: presentationUrl,
          srcdoc: '',
          canonicalDeck: null
        };
      }

      try {
        const srcdoc = buildCanonicalHtml(canonicalDeck, presentationUrl);
        if (typeof srcdoc === 'string' && srcdoc.trim()) {
          return {
            kind: 'srcdoc',
            url: presentationUrl,
            srcdoc,
            canonicalDeck
          };
        }
      } catch (error) {
        // Keep the legacy URL source available when canonical rendering fails.
      }

      return {
        kind: 'url',
        url: presentationUrl,
        srcdoc: '',
        canonicalDeck: null
      };
    }

    return { resolve };
  }

  function applyStudioEditorLaunchSource(iframe, presentationUrl = '', source = {}) {
    if (!iframe) return false;

    const srcdoc = source && typeof source.srcdoc === 'string'
      ? source.srcdoc
      : '';
    if (srcdoc) {
      iframe.srcdoc = srcdoc;
      if (typeof iframe.removeAttribute === 'function') {
        iframe.removeAttribute('src');
      } else {
        iframe.src = '';
      }
    } else {
      if (typeof iframe.removeAttribute === 'function') {
        iframe.removeAttribute('srcdoc');
      } else {
        iframe.srcdoc = '';
      }
      iframe.src = presentationUrl;
    }
    return true;
  }

  function createStudioEditorLaunchSourceController(options = {}) {
    const launchSourceApi = options.launchSourceApi
      && typeof options.launchSourceApi === 'object'
      ? options.launchSourceApi
      : null;
    const canonicalDeckApi = options.canonicalDeckApi
      && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const deckHtmlApi = options.deckHtmlApi
      && typeof options.deckHtmlApi === 'object'
      ? options.deckHtmlApi
      : null;

    function resolve(presentationUrl = '', metadata = null) {
      const resolverFactory = launchSourceApi
        && typeof launchSourceApi.createStudioEditorLaunchSourceResolver === 'function'
        ? launchSourceApi.createStudioEditorLaunchSourceResolver
        : createStudioEditorLaunchSourceResolver;
      const isCanonicalDeck = canonicalDeckApi
        && typeof canonicalDeckApi.isCanonicalDeck === 'function'
        ? canonicalDeckApi.isCanonicalDeck
        : null;
      const buildCanonicalHtml = deckHtmlApi
        && typeof deckHtmlApi.buildDeckPreviewHtml === 'function'
        ? (canonicalDeck, sourcePath) => deckHtmlApi.buildDeckPreviewHtml(canonicalDeck, sourcePath)
        : null;
      return resolverFactory({ isCanonicalDeck, buildCanonicalHtml }).resolve(
        presentationUrl,
        metadata
      );
    }

    function apply(iframe, presentationUrl = '', source = {}) {
      const applySource = launchSourceApi
        && typeof launchSourceApi.applyStudioEditorLaunchSource === 'function'
        ? launchSourceApi.applyStudioEditorLaunchSource
        : applyStudioEditorLaunchSource;
      return applySource(iframe, presentationUrl, source);
    }

    return { resolve, apply };
  }

  return {
    createStudioEditorLaunchSourceResolver,
    applyStudioEditorLaunchSource,
    createStudioEditorLaunchSourceController
  };
});

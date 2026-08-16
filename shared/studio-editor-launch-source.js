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

  return {
    createStudioEditorLaunchSourceResolver,
    applyStudioEditorLaunchSource
  };
});

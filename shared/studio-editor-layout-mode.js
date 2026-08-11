(function (root, factory) {
  const canonicalDeckApi = typeof module === 'object' && module.exports
    ? require('./canonical-deck')
    : root && root.SlideNextCanonicalDeck;
  const api = factory(canonicalDeckApi);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayoutMode = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (canonicalDeckApi) {
  function normalizeStudioLayoutMode(value) {
    if (typeof value !== 'string') return '';
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === 'freeform') return 'absolute';
    return normalizedValue === 'absolute' || normalizedValue === 'flow'
      ? normalizedValue
      : '';
  }

  function hasAbsoluteCanonicalNode(nodes = []) {
    return (Array.isArray(nodes) ? nodes : []).some((node) => {
      if (!node || typeof node !== 'object') return false;
      if (normalizeStudioLayoutMode(node.layout && node.layout.mode) === 'absolute') {
        return true;
      }
      return hasAbsoluteCanonicalNode(node.children);
    });
  }

  function resolveStudioCanonicalLayoutMode(canonicalDeck, slideId, options = {}) {
    const hasFallback = Object.prototype.hasOwnProperty.call(options, 'fallbackMode');
    const fallbackMode = hasFallback
      ? normalizeStudioLayoutMode(options.fallbackMode)
      : 'absolute';
    if (!canonicalDeck || !Array.isArray(canonicalDeck.slides)) return fallbackMode;

    const slideLookupApi = options.canonicalDeckApi || canonicalDeckApi;
    const slide = slideLookupApi && typeof slideLookupApi.findCanonicalSlideById === 'function'
      ? slideLookupApi.findCanonicalSlideById(canonicalDeck, slideId)
      : canonicalDeck.slides.find((candidate) => candidate && candidate.id === slideId);
    if (!slide) return fallbackMode;
    if (normalizeStudioLayoutMode(canonicalDeck.layout && canonicalDeck.layout.mode) === 'absolute') {
      return 'absolute';
    }
    if (normalizeStudioLayoutMode(slide.layout && slide.layout.mode) === 'absolute') {
      return 'absolute';
    }
    return hasAbsoluteCanonicalNode(slide.nodes) ? 'absolute' : 'flow';
  }

  return {
    normalizeStudioLayoutMode,
    hasAbsoluteCanonicalNode,
    resolveStudioCanonicalLayoutMode
  };
});

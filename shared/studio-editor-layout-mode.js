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
    if (canonicalDeckApi && typeof canonicalDeckApi.normalizeLayoutMode === 'function') {
      return canonicalDeckApi.normalizeLayoutMode(value, '');
    }
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

  function getCanonicalNodeLayoutKinds(nodes = []) {
    let hasAbsolute = false;
    let hasFlow = false;
    const visitNodes = (candidates = []) => {
      (Array.isArray(candidates) ? candidates : []).forEach((node) => {
        if (!node || typeof node !== 'object') return;
        if (normalizeStudioLayoutMode(node.layout && node.layout.mode) === 'absolute') {
          hasAbsolute = true;
        } else {
          hasFlow = true;
        }
        visitNodes(node.children);
      });
    };
    visitNodes(nodes);
    return { hasAbsolute, hasFlow };
  }

  function resolveStudioCanonicalSlide(canonicalDeck, slideId, options = {}) {
    if (!canonicalDeck || !Array.isArray(canonicalDeck.slides)) return null;

    const slideLookupApi = options.canonicalDeckApi || canonicalDeckApi;
    if (slideLookupApi && typeof slideLookupApi.findCanonicalSlideById === 'function') {
      try {
        const resolvedSlide = slideLookupApi.findCanonicalSlideById(canonicalDeck, slideId);
        if (resolvedSlide) return resolvedSlide;
      } catch (error) {
        // Fall through to the local lookup for legacy or partial decks.
      }
    }

    const normalizedSlideId = typeof slideId === 'string' ? slideId.trim() : '';
    return canonicalDeck.slides.find((candidate) => (
      candidate && candidate.id === normalizedSlideId
    )) || null;
  }

  function resolveStudioCanonicalLayoutMode(canonicalDeck, slideId, options = {}) {
    const hasFallback = Object.prototype.hasOwnProperty.call(options, 'fallbackMode');
    const fallbackMode = hasFallback
      ? normalizeStudioLayoutMode(options.fallbackMode)
      : 'absolute';
    const slide = resolveStudioCanonicalSlide(canonicalDeck, slideId, options);
    if (!slide) return fallbackMode;
    if (normalizeStudioLayoutMode(canonicalDeck.layout && canonicalDeck.layout.mode) === 'absolute') {
      return 'absolute';
    }
    if (normalizeStudioLayoutMode(slide.layout && slide.layout.mode) === 'absolute') {
      return 'absolute';
    }
    return hasAbsoluteCanonicalNode(slide.nodes) ? 'absolute' : 'flow';
  }

  function resolveStudioCanonicalLayoutDisplayMode(canonicalDeck, slideId, options = {}) {
    const mode = resolveStudioCanonicalLayoutMode(canonicalDeck, slideId, options);
    if (mode !== 'absolute') return mode;

    const slide = resolveStudioCanonicalSlide(canonicalDeck, slideId, options);
    if (!slide
      || normalizeStudioLayoutMode(canonicalDeck.layout && canonicalDeck.layout.mode) === 'absolute'
      || normalizeStudioLayoutMode(slide.layout && slide.layout.mode) === 'absolute') {
      return mode;
    }

    const nodeLayoutKinds = getCanonicalNodeLayoutKinds(slide.nodes);
    return nodeLayoutKinds.hasAbsolute && nodeLayoutKinds.hasFlow ? 'mixed' : mode;
  }

  function resolveStudioCanonicalInsertionLayoutMode(canonicalDeck, slideId, options = {}) {
    const mode = resolveStudioCanonicalLayoutMode(canonicalDeck, slideId, options);
    if (mode !== 'absolute') return mode;

    const slide = resolveStudioCanonicalSlide(canonicalDeck, slideId, options);
    if (!slide
      || normalizeStudioLayoutMode(canonicalDeck.layout && canonicalDeck.layout.mode) === 'absolute'
      || normalizeStudioLayoutMode(slide.layout && slide.layout.mode) === 'absolute') {
      return mode;
    }

    const nodeLayoutKinds = getCanonicalNodeLayoutKinds(slide.nodes);
    return nodeLayoutKinds.hasAbsolute && nodeLayoutKinds.hasFlow ? 'flow' : mode;
  }

  return {
    normalizeStudioLayoutMode,
    hasAbsoluteCanonicalNode,
    resolveStudioCanonicalLayoutMode,
    resolveStudioCanonicalLayoutDisplayMode,
    resolveStudioCanonicalInsertionLayoutMode
  };
});

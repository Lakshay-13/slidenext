(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayoutModeView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const defaultLayoutModeApi = root && root.SlideNextStudioEditorLayoutMode;

  function syncStudioEditorLayoutModeLabel(options = {}) {
    const documentRef = options.documentRef;
    const label = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('canvasLayoutModeLabel')
      : null;
    if (!label) return false;

    const layoutModeApi = options.layoutModeApi || defaultLayoutModeApi;
    const normalizeLayoutMode = layoutModeApi
      && typeof layoutModeApi.normalizeStudioLayoutMode === 'function'
      ? layoutModeApi.normalizeStudioLayoutMode
      : (value) => {
          if (typeof value !== 'string') return '';
          const normalizedValue = value.trim().toLowerCase();
          return normalizedValue === 'freeform' ? 'absolute' : normalizedValue;
        };
    const mode = normalizeLayoutMode(options.mode);
    const isAbsolute = mode === 'absolute';
    const isFlow = mode === 'flow';
    const text = isAbsolute
      ? 'Freeform canvas'
      : isFlow
        ? 'Structured layout'
        : 'Layout unavailable';
    const description = isAbsolute
      ? 'Freeform canvas: elements use explicit slide coordinates.'
      : isFlow
        ? 'Structured layout: elements remain in normal document flow.'
        : 'The active slide layout mode is not available yet.';

    label.textContent = text;
    label.title = description;
    if (label.dataset) label.dataset.layoutMode = mode || 'unknown';
    return true;
  }

  return {
    syncStudioEditorLayoutModeLabel
  };
});

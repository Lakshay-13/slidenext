(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioHistory = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildStudioHistoryFrameHtml(doc, options = {}) {
    if (!doc || !doc.documentElement) return '';

    const clone = doc.documentElement.cloneNode(true);
    const chromeNodeIds = Array.isArray(options.chromeNodeIds) ? options.chromeNodeIds : [];
    const removableClassNames = Array.isArray(options.removableClassNames) ? options.removableClassNames : [];

    chromeNodeIds.forEach((nodeId) => {
      clone.querySelectorAll(`#${nodeId}`).forEach((node) => node.remove());
    });

    removableClassNames.forEach((className) => {
      clone.querySelectorAll(`.${className}`).forEach((el) => {
        el.classList.remove(className);
      });
    });

    return clone.innerHTML;
  }

  function createStudioHistoryEntry(doc, options = {}) {
    if (!doc) return null;

    const buildHistoryHtml = typeof options.buildHistoryHtml === 'function'
      ? options.buildHistoryHtml
      : (sourceDoc, buildOptions) => buildStudioHistoryFrameHtml(sourceDoc, buildOptions);
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const getSelectedElementIds = typeof options.getSelectedElementIds === 'function'
      ? options.getSelectedElementIds
      : () => [];

    return {
      html: buildHistoryHtml(doc, options),
      activeSlideId: getActiveSlideId(doc) || '',
      selectedElementIds: getSelectedElementIds(doc)
    };
  }

  function normalizeStudioHistoryEntry(entry) {
    if (!entry) {
      return { html: '', activeSlideId: '', selectedElementIds: [] };
    }
    if (typeof entry === 'string') {
      return { html: entry, activeSlideId: '', selectedElementIds: [] };
    }

    return {
      html: entry.html || '',
      activeSlideId: entry.activeSlideId || '',
      selectedElementIds: Array.isArray(entry.selectedElementIds) ? entry.selectedElementIds.filter(Boolean) : []
    };
  }

  function areStudioHistoryEntriesEqual(a, b, options = {}) {
    const areIdListsEqual = typeof options.areIdListsEqual === 'function'
      ? options.areIdListsEqual
      : (left = [], right = []) => {
          if (left.length !== right.length) return false;
          return left.every((id, index) => id === right[index]);
        };

    const normalizedA = normalizeStudioHistoryEntry(a);
    const normalizedB = normalizeStudioHistoryEntry(b);

    return normalizedA.html === normalizedB.html
      && normalizedA.activeSlideId === normalizedB.activeSlideId
      && areIdListsEqual(normalizedA.selectedElementIds, normalizedB.selectedElementIds);
  }

  return {
    buildStudioHistoryFrameHtml,
    createStudioHistoryEntry,
    normalizeStudioHistoryEntry,
    areStudioHistoryEntriesEqual
  };
});

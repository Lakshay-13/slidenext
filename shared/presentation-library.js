(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextPresentationLibrary = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function normalizePresentationLibraryData(data) {
    return Array.isArray(data) ? data.filter(group => group && typeof group === 'object') : [];
  }

  function listPresentationLibraryCategories(data) {
    const groups = normalizePresentationLibraryData(data);
    const categories = [];

    groups.forEach((group) => {
      const category = typeof group.category === 'string' ? group.category : '';
      if (category && !categories.includes(category)) {
        categories.push(category);
      }
    });

    return ['all', ...categories];
  }

  function resolvePresentationLibraryItems(data, activeCategory = 'all') {
    const groups = normalizePresentationLibraryData(data);
    if (activeCategory === 'all') {
      return groups.flatMap(group => Array.isArray(group.presentations) ? group.presentations : []);
    }

    const group = groups.find(candidate => candidate.category === activeCategory);
    return group && Array.isArray(group.presentations) ? group.presentations : [];
  }

  async function loadPresentationLibrary(options = {}) {
    const fetchImpl = typeof options.fetchImpl === 'function'
      ? options.fetchImpl
      : root && typeof root.fetch === 'function'
        ? root.fetch.bind(root)
        : null;
    if (!fetchImpl) {
      return [];
    }

    const isCurrentLoad = typeof options.isCurrentLoad === 'function'
      ? options.isCurrentLoad
      : () => true;

    try {
      const response = await fetchImpl('/api/presentations', {
        cache: 'no-store',
        ...(options.requestInit || {})
      });
      if (!response.ok) {
        throw new Error(`Presentation library request failed with status ${response.status}`);
      }

      const payload = await response.json();
      const data = normalizePresentationLibraryData(payload);

      if (isCurrentLoad()) {
        if (typeof options.commitPresentationLibraryData === 'function') {
          options.commitPresentationLibraryData(data);
        }
        if (typeof options.onSuccess === 'function') {
          options.onSuccess(data);
        }
      }

      return data;
    } catch (error) {
      if (isCurrentLoad() && typeof options.onError === 'function') {
        options.onError(error);
      }
      throw error;
    }
  }

  return {
    loadPresentationLibrary,
    normalizePresentationLibraryData,
    listPresentationLibraryCategories,
    resolvePresentationLibraryItems
  };
});

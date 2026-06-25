(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextPresentationLibrary = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
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

  return {
    normalizePresentationLibraryData,
    listPresentationLibraryCategories,
    resolvePresentationLibraryItems
  };
});

(function (root, factory) {
  const presentationLibrary = root && root.SlideNextPresentationLibrary;
  const presentationLibraryView = root && root.SlideNextPresentationLibraryView;
  const api = factory(presentationLibrary, presentationLibraryView);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextPresentationDashboardController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (defaultLibrary, defaultView) {
  function createPresentationDashboardController(options = {}) {
    const documentRef = options.documentRef
      || (typeof globalThis !== 'undefined' ? globalThis.document : null);
    const library = options.presentationLibrary || defaultLibrary;
    const view = options.presentationLibraryView || defaultView;
    const consoleRef = options.consoleRef || (typeof console !== 'undefined' ? console : null);
    let presentationLibraryData = [];
    let activeCategory = 'all';
    let presentationLibraryLoadToken = 0;

    function setLoadingState() {
      if (!view || typeof view.setPresentationLibraryLoadingState !== 'function') return false;
      return view.setPresentationLibraryLoadingState({ documentRef });
    }

    function renderCategories(data = presentationLibraryData) {
      if (!view || typeof view.renderPresentationLibraryCategories !== 'function') return '';
      return view.renderPresentationLibraryCategories({
        container: documentRef && documentRef.getElementById
          ? documentRef.getElementById('categoryTabs')
          : null,
        data,
        activeCategory,
        filterCategory: filter
      });
    }

    function renderGrid(data = presentationLibraryData) {
      if (!view || typeof view.renderPresentationLibraryGrid !== 'function') return '';
      return view.renderPresentationLibraryGrid({
        container: documentRef && documentRef.getElementById
          ? documentRef.getElementById('presentationsGrid')
          : null,
        data,
        activeCategory
      });
    }

    function renderLoadedState(data) {
      const loader = documentRef && documentRef.getElementById
        ? documentRef.getElementById('loader')
        : null;
      if (loader) loader.classList.add('hidden');
      const categoryTabs = documentRef && documentRef.getElementById
        ? documentRef.getElementById('categoryTabs')
        : null;
      if (categoryTabs) categoryTabs.classList.remove('hidden');
      const presentationsGrid = documentRef && documentRef.getElementById
        ? documentRef.getElementById('presentationsGrid')
        : null;
      if (presentationsGrid) presentationsGrid.classList.remove('hidden');

      renderCategories(data);
      renderGrid(data);
    }

    function renderErrorState() {
      if (view && typeof view.setPresentationLibraryErrorState === 'function') {
        return view.setPresentationLibraryErrorState({
          documentRef,
          message: 'Failed to load SlideNext workspace',
          loadPresentations: load
        });
      }

      const loader = documentRef && documentRef.getElementById
        ? documentRef.getElementById('loader')
        : null;
      if (loader) {
        loader.innerHTML = '<span class="material-symbols-outlined text-[36px] text-rose-500">error</span>'
          + '<p class="text-xs text-rose-400 font-mono mt-2 uppercase tracking-widest">Failed to load SlideNext workspace</p>';
      }
      return !!loader;
    }

    function reportLoadError(error) {
      if (consoleRef && typeof consoleRef.error === 'function') {
        consoleRef.error('Error fetching presentations:', error);
      }
      renderErrorState();
    }

    async function load() {
      const requestedLoadToken = ++presentationLibraryLoadToken;
      setLoadingState();
      if (!library || typeof library.loadPresentationLibrary !== 'function') {
        return [];
      }

      try {
        return await library.loadPresentationLibrary({
          isCurrentLoad: () => requestedLoadToken === presentationLibraryLoadToken,
          commitPresentationLibraryData: (nextData) => {
            presentationLibraryData = nextData;
          },
          onSuccess: (nextData) => {
            renderLoadedState(nextData);
          },
          onError: (error) => {
            if (requestedLoadToken !== presentationLibraryLoadToken) return;
            reportLoadError(error);
          }
        });
      } catch (error) {
        if (requestedLoadToken === presentationLibraryLoadToken) {
          reportLoadError(error);
        }
        return [];
      }
    }

    function filter(category) {
      activeCategory = typeof category === 'string' ? category : 'all';
      if (documentRef && typeof documentRef.querySelectorAll === 'function') {
        documentRef.querySelectorAll('.category-tab').forEach((tab) => {
          const tabCategory = tab.textContent.trim().toLowerCase();
          const targetCategory = activeCategory === 'all' ? 'all decks' : activeCategory.toLowerCase();
          if (tabCategory === targetCategory) {
            tab.classList.add('active');
          } else {
            tab.classList.remove('active');
          }
        });
      }
      return renderGrid(presentationLibraryData);
    }

    return {
      setLoadingState,
      load,
      renderCategories,
      renderGrid,
      filter,
      getPresentationLibraryData: () => presentationLibraryData,
      getActiveCategory: () => activeCategory
    };
  }

  return {
    createPresentationDashboardController
  };
});

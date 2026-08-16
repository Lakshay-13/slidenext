(function (root, factory) {
  const presentationLibrary = typeof module === 'object' && module.exports
    ? require('./presentation-library')
    : root && root.SlideNextPresentationLibrary;
  const api = factory(presentationLibrary);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextPresentationLibraryView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (presentationLibrary) {
  const presentationLibraryActionBindings = new WeakMap();
  const presentationLibraryCategoryActionBindings = new WeakMap();
  const presentationLibraryGridActionBindings = new WeakMap();

  function normalizeString(value) {
    return typeof value === 'string' ? value : '';
  }

  function escapeHtml(value) {
    return normalizeString(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function inlineHandlerArgument(value) {
    return escapeHtml(JSON.stringify(normalizeString(value)));
  }

  function getPresentationLibraryActionAttribute(target, name) {
    if (!target) return '';
    if (typeof target.getAttribute === 'function') {
      return target.getAttribute(name) || '';
    }
    const datasetKey = name.replace(/^data-/, '').replace(/-([a-z])/g, (_, character) => character.toUpperCase());
    return target.dataset && target.dataset[datasetKey]
      ? target.dataset[datasetKey]
      : '';
  }

  function findPresentationLibraryActionTarget(container, event) {
    let target = event && event.target;
    if (target && typeof target.closest === 'function') {
      target = target.closest('[data-presentation-library-action]');
      if (target && container && typeof container.contains === 'function' && !container.contains(target)) {
        return null;
      }
      return target;
    }
    while (target && target !== container) {
      if (getPresentationLibraryActionAttribute(target, 'data-presentation-library-action')) return target;
      target = target.parentNode;
    }
    return target === container ? null : target;
  }

  function bindPresentationLibraryActions(options = {}) {
    const documentRef = options.documentRef;
    const loader = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('loader')
      : null;
    if (!loader || typeof loader.addEventListener !== 'function') return false;

    const handlers = {};
    if (typeof options.loadPresentations === 'function') {
      handlers.loadPresentations = options.loadPresentations;
    }
    const existingBinding = presentationLibraryActionBindings.get(loader);
    if (existingBinding) {
      Object.assign(existingBinding.handlers, handlers);
      return true;
    }

    const binding = { handlers };
    loader.addEventListener('click', (event) => {
      const target = findPresentationLibraryActionTarget(loader, event);
      const action = getPresentationLibraryActionAttribute(target, 'data-presentation-library-action');
      if (action === 'retry' && binding.handlers.loadPresentations) {
        binding.handlers.loadPresentations();
      }
    });
    presentationLibraryActionBindings.set(loader, binding);
    return true;
  }

  function bindPresentationLibraryCategoryActions(options = {}) {
    const container = options.container;
    if (!container || typeof container.addEventListener !== 'function') return false;

    const filterCategory = typeof options.filterCategory === 'function'
      ? options.filterCategory
      : null;
    const existingBinding = presentationLibraryCategoryActionBindings.get(container);
    if (existingBinding) {
      if (filterCategory) existingBinding.filterCategory = filterCategory;
      return true;
    }

    const binding = { filterCategory };
    container.addEventListener('click', (event) => {
      const target = findPresentationLibraryActionTarget(container, event);
      const action = getPresentationLibraryActionAttribute(target, 'data-presentation-library-action');
      if (action !== 'filter' || !binding.filterCategory) return;
      binding.filterCategory(
        getPresentationLibraryActionAttribute(target, 'data-presentation-library-category')
      );
    });
    presentationLibraryCategoryActionBindings.set(container, binding);
    return true;
  }

  function bindPresentationLibraryGridActions(options = {}) {
    const container = options.container;
    if (!container || typeof container.addEventListener !== 'function') return false;

    const handlers = {};
    if (typeof options.launchPresentation === 'function') {
      handlers.launchPresentation = options.launchPresentation;
    }
    if (typeof options.launchStudioEditor === 'function') {
      handlers.launchStudioEditor = options.launchStudioEditor;
    }
    const existingBinding = presentationLibraryGridActionBindings.get(container);
    if (existingBinding) {
      Object.assign(existingBinding.handlers, handlers);
      return true;
    }

    const binding = { handlers };
    container.addEventListener('click', (event) => {
      const target = findPresentationLibraryActionTarget(container, event);
      const action = getPresentationLibraryActionAttribute(target, 'data-presentation-library-action');
      const url = getPresentationLibraryActionAttribute(target, 'data-presentation-library-url');
      if (action === 'launch' && binding.handlers.launchPresentation) {
        binding.handlers.launchPresentation(url);
      } else if (action === 'edit' && binding.handlers.launchStudioEditor) {
        binding.handlers.launchStudioEditor(
          url,
          getPresentationLibraryActionAttribute(target, 'data-presentation-library-title'),
          getPresentationLibraryActionAttribute(target, 'data-presentation-library-category')
        );
      }
    });
    presentationLibraryGridActionBindings.set(container, binding);
    return true;
  }

  function resolveCategories(data) {
    return presentationLibrary && typeof presentationLibrary.listPresentationLibraryCategories === 'function'
      ? presentationLibrary.listPresentationLibraryCategories(data)
      : ['all'];
  }

  function resolveItems(data, activeCategory) {
    return presentationLibrary && typeof presentationLibrary.resolvePresentationLibraryItems === 'function'
      ? presentationLibrary.resolvePresentationLibraryItems(data, activeCategory)
      : [];
  }

  function setPresentationLibraryLoadingState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;

    const loader = documentRef.getElementById('loader');
    const categoryTabs = documentRef.getElementById('categoryTabs');
    const presentationsGrid = documentRef.getElementById('presentationsGrid');
    if (loader) {
      loader.innerHTML = `
        <span class="material-symbols-outlined text-[36px] text-[#7028d0] animate-spin">sync</span>
        <p class="text-xs text-[#bcc9c6] font-mono mt-2 uppercase tracking-widest">Loading presentations list...</p>
      `;
      loader.classList.remove('hidden');
    }
    if (categoryTabs) categoryTabs.classList.add('hidden');
    if (presentationsGrid) presentationsGrid.classList.add('hidden');
    return true;
  }

  function setPresentationLibraryErrorState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;

    const loader = documentRef.getElementById('loader');
    const categoryTabs = documentRef.getElementById('categoryTabs');
    const presentationsGrid = documentRef.getElementById('presentationsGrid');
    if (loader) {
      const message = typeof options.message === 'string' && options.message.trim()
        ? options.message.trim()
        : 'Failed to load SlideNext workspace';
      loader.innerHTML = `
        <span class="material-symbols-outlined text-[36px] text-rose-500">error</span>
        <p class="text-xs text-rose-400 font-mono mt-2 uppercase tracking-widest" role="alert">${escapeHtml(message)}</p>
        <button type="button" data-presentation-library-action="retry" class="mt-4 inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-all">
          <span class="material-symbols-outlined text-[16px]">refresh</span> Try again
        </button>
      `;
      bindPresentationLibraryActions(options);
      loader.classList.remove('hidden');
    }
    if (categoryTabs) categoryTabs.classList.add('hidden');
    if (presentationsGrid) presentationsGrid.classList.add('hidden');
    return true;
  }

  function renderPresentationLibraryCategories(options = {}) {
    const container = options.container;
    const activeCategory = typeof options.activeCategory === 'string' ? options.activeCategory : 'all';
    const markup = resolveCategories(options.data).map(category => {
      const isActive = activeCategory === category;
      const displayName = category === 'all' ? 'All Decks' : escapeHtml(category);
      return `
          <button type="button" data-presentation-library-action="filter" data-presentation-library-category="${escapeHtml(category)}" class="category-tab ${isActive ? 'active' : ''}">
            ${displayName}
          </button>
        `;
    }).join('');
    if (container) container.innerHTML = markup;
    bindPresentationLibraryCategoryActions(options);
    return markup;
  }

  function renderPresentationLibraryGrid(options = {}) {
    const container = options.container;
    const items = resolveItems(options.data, options.activeCategory || 'all');
    if (items.length === 0) {
      const emptyMarkup = '<p class="col-span-2 text-center text-zinc-500 text-sm font-mono py-8">No presentations found in this category.</p>';
      if (container) container.innerHTML = emptyMarkup;
      return emptyMarkup;
    }

    const markup = items.map(presentation => `
        <div class="glass-card p-6 flex flex-col justify-between h-full relative group" style="content-visibility: auto; contain-intrinsic-size: 240px;">
          <div class="flex items-start justify-between mb-4">
            <div class="w-12 h-12 rounded-xl bg-[#7028d0]/10 border border-[#7028d0]/20 flex items-center justify-center text-[#7028d0] group-hover:scale-110 transition-transform">
              <span class="material-symbols-outlined text-[28px]">${escapeHtml(presentation.icon || 'presentation_play')}</span>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap justify-end">
              ${presentation.category ? `<span class="px-2 py-0.5 bg-[#7028d0]/10 border border-[#7028d0]/20 rounded text-[9px] font-mono text-[#7028d0] uppercase tracking-wider">${escapeHtml(presentation.category)}</span>` : ''}
              ${Array.isArray(presentation.tags) ? presentation.tags.map(tag => `<span class="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-mono text-[#bcc9c6]">${escapeHtml(tag)}</span>`).join('') : ''}
            </div>
          </div>
          <div class="flex-grow mb-6">
            <h3 class="text-xl font-bold text-white mb-2 leading-tight">${escapeHtml(presentation.title)}</h3>
            <p class="text-xs font-mono text-[#7028d0] mb-3">${escapeHtml(presentation.subtitle || '')}</p>
            <p class="text-sm text-[#bcc9c6]/80 leading-relaxed">${escapeHtml(presentation.description || '')}</p>
          </div>
          <div class="flex items-center gap-3">
            <button type="button" data-presentation-library-action="launch" data-presentation-library-url="${escapeHtml(normalizeString(presentation.url))}" class="flex-1 py-2.5 bg-[#7028d0] hover:bg-[#5050e8] text-black font-bold rounded-lg text-xs transition-all shadow-[0_0_15px_rgba(112,40,208,0.1)] hover:shadow-[0_0_20px_rgba(112,40,208,0.25)] flex items-center justify-center gap-1.5 active:scale-95">
              <span class="material-symbols-outlined text-[16px] font-bold">play_arrow</span> Launch Keynote
            </button>
            <button type="button" data-presentation-library-action="edit" data-presentation-library-url="${escapeHtml(normalizeString(presentation.url))}" data-presentation-library-title="${escapeHtml(normalizeString(presentation.title))}" data-presentation-library-category="${escapeHtml(normalizeString(presentation.category))}" class="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95">
              <span class="material-symbols-outlined text-[16px]">edit_note</span> Studio Editor
            </button>
          </div>
        </div>
    `).join('');
    if (container) container.innerHTML = markup;
    bindPresentationLibraryGridActions(options);
    return markup;
  }

  return {
    bindPresentationLibraryActions,
    bindPresentationLibraryCategoryActions,
    bindPresentationLibraryGridActions,
    setPresentationLibraryLoadingState,
    setPresentationLibraryErrorState,
    renderPresentationLibraryCategories,
    renderPresentationLibraryGrid
  };
});

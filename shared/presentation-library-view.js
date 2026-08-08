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

  function renderPresentationLibraryCategories(options = {}) {
    const container = options.container;
    const activeCategory = typeof options.activeCategory === 'string' ? options.activeCategory : 'all';
    const markup = resolveCategories(options.data).map(category => {
      const isActive = activeCategory === category;
      const displayName = category === 'all' ? 'All Decks' : escapeHtml(category);
      return `
          <button onclick="filterCategory(${inlineHandlerArgument(category)})" class="category-tab ${isActive ? 'active' : ''}">
            ${displayName}
          </button>
        `;
    }).join('');
    if (container) container.innerHTML = markup;
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
        <div class="glass-card p-6 flex flex-col justify-between h-full relative group">
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
            <button onclick="launchPresentation(${inlineHandlerArgument(presentation.url)})" class="flex-1 py-2.5 bg-[#7028d0] hover:bg-[#5050e8] text-black font-bold rounded-lg text-xs transition-all shadow-[0_0_15px_rgba(112,40,208,0.1)] hover:shadow-[0_0_20px_rgba(112,40,208,0.25)] flex items-center justify-center gap-1.5 active:scale-95">
              <span class="material-symbols-outlined text-[16px] font-bold">play_arrow</span> Launch Keynote
            </button>
            <button onclick="launchStudioEditor(${inlineHandlerArgument(presentation.url)}, ${inlineHandlerArgument(presentation.title)}, ${inlineHandlerArgument(presentation.category)})" class="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95">
              <span class="material-symbols-outlined text-[16px]">edit_note</span> Studio Editor
            </button>
          </div>
        </div>
      `).join('');
    if (container) container.innerHTML = markup;
    return markup;
  }

  return {
    setPresentationLibraryLoadingState,
    renderPresentationLibraryCategories,
    renderPresentationLibraryGrid
  };
});

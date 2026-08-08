(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorThemeView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  function escapeAttribute(value) {
    return normalizeString(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizePresetColor(value) {
    const normalizedValue = normalizeString(value).trim();
    return /^#[0-9a-f]{3,8}$/i.test(normalizedValue) ? normalizedValue : '#7028d0';
  }

  function renderStudioThemeTokenPresets(options = {}) {
    const documentRef = options.documentRef;
    const container = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('themeTokenPresetsList')
      : null;
    if (!container) return false;

    const presetData = options.presetData && typeof options.presetData === 'object'
      ? options.presetData
      : {};
    const canUseThemeTokenControls = !!options.canUseThemeTokenControls;
    container.innerHTML = Object.entries(presetData).map(([presetId, preset]) => {
      const normalizedPreset = preset && typeof preset === 'object' ? preset : {};
      const tokens = normalizedPreset.tokens && typeof normalizedPreset.tokens === 'object'
        ? normalizedPreset.tokens
        : {};
      const primary = normalizePresetColor(tokens['--color-primary']);
      const secondary = normalizePresetColor(tokens['--color-secondary']);
      const background = normalizePresetColor(tokens['--color-bg-base']);
      const label = normalizeString(normalizedPreset.name, presetId);
      return `<button type="button" data-theme-preset-id="${escapeAttribute(presetId)}" onclick="applyThemeTokenPreset(this.dataset.themePresetId)" class="flex items-center gap-2 p-2 rounded-lg border border-white/5 bg-zinc-900 hover:border-[#7028d0]/50 hover:bg-zinc-800 transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-white/5 disabled:hover:bg-zinc-900" title="Apply ${escapeAttribute(label)} theme tokens"${canUseThemeTokenControls ? '' : ' disabled'}>
          <span class="flex -space-x-1.5 shrink-0" aria-hidden="true">
            <span class="w-4 h-4 rounded-full border border-white/20" style="background:${escapeAttribute(primary)}"></span>
            <span class="w-4 h-4 rounded-full border border-white/20" style="background:${escapeAttribute(secondary)}"></span>
            <span class="w-4 h-4 rounded-full border border-white/20" style="background:${escapeAttribute(background)}"></span>
          </span>
          <span class="min-w-0">
            <span class="block text-[10px] font-semibold text-zinc-200 truncate">${escapeAttribute(label)}</span>
            <span class="block text-[9px] text-zinc-500 font-mono">Brand tokens</span>
          </span>
        </button>`;
    }).join('');
    return true;
  }

  function syncStudioThemeTokenPresetActionState(options = {}) {
    const documentRef = options.documentRef;
    const container = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('themeTokenPresetsList')
      : null;
    if (!container || typeof container.querySelectorAll !== 'function') return false;

    const canUseThemeTokenControls = !!options.canUseThemeTokenControls;
    container.querySelectorAll('button').forEach((button) => {
      button.disabled = !canUseThemeTokenControls;
    });
    return true;
  }

  return {
    normalizePresetColor,
    renderStudioThemeTokenPresets,
    syncStudioThemeTokenPresetActionState
  };
});

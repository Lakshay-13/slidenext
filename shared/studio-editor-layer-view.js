(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function renderStudioLayersList(options = {}) {
    const activeSlideSnapshot = options.activeSlideSnapshot || null;
    if (!activeSlideSnapshot) {
      return '<p class="text-[10px] text-zinc-500 font-mono text-center py-2">No active slide</p>';
    }

    const layers = Array.isArray(options.layers) ? options.layers : [];
    if (layers.length === 0) {
      return '<p class="text-[10px] text-zinc-500 font-mono text-center py-2">No elements found</p>';
    }

    const resolveLayerState = typeof options.resolveLayerState === 'function'
      ? options.resolveLayerState
      : () => ({});

    return layers.map((layer) => {
      const layerState = resolveLayerState(layer) || {};
      const canRunLayerActions = !!layerState.canRunLayerActions;
      const canToggleLayerVisibility = canRunLayerActions && !layer.isLocked;
      const layerOrderActionState = layerState.layerOrderActionState || {};
      const activeClass = layer.isSelected
        ? 'border-[#7028d0] bg-[#7028d0]/10 text-white font-semibold'
        : 'border-white/5 bg-zinc-950/40 hover:bg-zinc-900/60 text-zinc-300 hover:text-white';

      return `
          <div class="flex items-center justify-between p-2 rounded-lg border text-xs font-mono transition-all ${activeClass}">
            <button onclick="selectLayerElementByRef(event)" ${canRunLayerActions ? '' : 'disabled'} class="flex-1 text-left flex items-center gap-2 truncate pr-1 disabled:opacity-60 disabled:cursor-not-allowed" style="min-width: 0;">
              <span class="material-symbols-outlined text-[14px] text-[#7028d0] flex-shrink-0">${layer.typeIcon}</span>
              <span class="truncate" style="font-size: 10px;">${layer.displayName}</span>
              ${layer.isLocked ? '<span class="material-symbols-outlined text-[11px] text-amber-400 flex-shrink-0" title="Locked">lock</span>' : ''}
              ${layer.isHidden ? '<span class="material-symbols-outlined text-[11px] text-zinc-500 flex-shrink-0" title="Hidden">visibility_off</span>' : ''}
              <span class="text-[9px] text-zinc-500 font-bold ml-auto flex-shrink-0">z:${layer.zIndex}</span>
            </button>
            <div class="flex items-center gap-1 flex-shrink-0 ml-1">
              <button onclick="toggleLayerVisibilityByRef(event)" ${canToggleLayerVisibility ? '' : 'disabled'} class="p-0.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-400" title="${layer.isHidden ? 'Show Element' : 'Hide Element'}">
                <span class="material-symbols-outlined text-[12px]">${layer.isHidden ? 'visibility' : 'visibility_off'}</span>
              </button>
              <button onclick="changeLayerZIndexByRef(event, 'forward')" ${layerOrderActionState.canBringForward ? '' : 'disabled'} class="p-0.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-400" title="Bring Forward">
                <span class="material-symbols-outlined text-[12px]">keyboard_arrow_up</span>
              </button>
              <button onclick="changeLayerZIndexByRef(event, 'backward')" ${layerOrderActionState.canSendBackward ? '' : 'disabled'} class="p-0.5 hover:bg-white/10 text-zinc-400 hover:text-white rounded disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-400" title="Send Backward">
                <span class="material-symbols-outlined text-[12px]">keyboard_arrow_down</span>
              </button>
            </div>
          </div>
        `;
    }).join('');
  }

  return { renderStudioLayersList };
});

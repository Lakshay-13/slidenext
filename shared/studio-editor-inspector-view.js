(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorInspectorView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function renderStudioInspectorSelectionSummary(options = {}) {
    const documentRef = options.documentRef;
    const selectionState = options.selectionState || {};
    const inspectorTargetLabel = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('inspectorTargetLabel')
      : null;
    const slideInspectorPanel = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('slideInspectorPanel')
      : null;
    const elementInspectorPanel = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('elementInspectorPanel')
      : null;
    const hasSelection = !!selectionState.hasSelection;
    if (!hasSelection) {
      if (inspectorTargetLabel) {
        inspectorTargetLabel.innerHTML = `
            <span class="material-symbols-outlined text-[16px] text-[#7028d0]">settings_suggest</span>
            No selection active
          `;
      }
      if (slideInspectorPanel) slideInspectorPanel.classList.remove('hidden');
      if (elementInspectorPanel) elementInspectorPanel.classList.add('hidden');
      return {
        hasSelection: false,
        isMulti: false,
        primaryElement: null
      };
    }

    const primaryElement = selectionState.primaryElement || null;
    const count = Number.isInteger(selectionState.count) ? selectionState.count : 0;
    const isMulti = count > 1;
    if (inspectorTargetLabel && primaryElement && primaryElement.tagName) {
      inspectorTargetLabel.innerHTML = `
          <span class="material-symbols-outlined text-[16px] text-[#7028d0]">edit</span>
          ${isMulti ? `Editing ${count} elements` : `Editing ${primaryElement.tagName.toLowerCase()}`}
        `;
    }
    if (slideInspectorPanel) slideInspectorPanel.classList.add('hidden');
    if (elementInspectorPanel) elementInspectorPanel.classList.remove('hidden');
    return {
      hasSelection: true,
      isMulti,
      primaryElement
    };
  }

  return { renderStudioInspectorSelectionSummary };
});

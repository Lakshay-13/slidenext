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

  function syncStudioInspectorContentControls(options = {}) {
    const documentRef = options.documentRef;
    const primaryElement = options.primaryElement;
    if (!documentRef || !primaryElement || typeof documentRef.getElementById !== 'function') return false;
    const isMulti = !!options.isMulti;
    const textContentInput = documentRef.getElementById('elTextContent');
    if (textContentInput) {
      textContentInput.value = primaryElement.innerText || primaryElement.textContent || '';
    }

    const imageGroup = documentRef.getElementById('inspectorImageGroup');
    const imageSrcInput = documentRef.getElementById('elImageSrc');
    const textContentGroup = documentRef.getElementById('inspectorTextContentGroup');
    const isImage = !isMulti && primaryElement.tagName.toLowerCase() === 'img';
    if (isImage) {
      if (imageGroup) imageGroup.classList.remove('hidden');
      if (imageSrcInput) imageSrcInput.value = primaryElement.src || '';
      if (textContentGroup) textContentGroup.classList.add('hidden');
    } else {
      if (imageGroup) imageGroup.classList.add('hidden');
      if (textContentGroup) textContentGroup.classList.toggle('hidden', isMulti);
    }
    return true;
  }

  function syncStudioInspectorTypographyControls(options = {}) {
    const documentRef = options.documentRef;
    const primaryElement = options.primaryElement;
    const computedStyles = options.computedStyles || {};
    if (!documentRef || !primaryElement || typeof documentRef.getElementById !== 'function') return false;
    const rgbToHex = typeof options.rgbToHex === 'function' ? options.rgbToHex : (value) => value;
    const highlightAlignButton = typeof options.highlightAlignButton === 'function'
      ? options.highlightAlignButton
      : () => {};
    const fSize = parseInt(computedStyles.fontSize) || 16;
    const fontSizeInput = documentRef.getElementById('elFontSize');
    if (fontSizeInput) fontSizeInput.value = fSize;
    const fontSizeLabel = documentRef.getElementById('fontSizeVal');
    if (fontSizeLabel) fontSizeLabel.textContent = fSize + 'px';

    const fFamily = computedStyles.fontFamily.replace(/['"]/g, '');
    const familySelect = documentRef.getElementById('elFontFamily');
    if (familySelect) {
      familySelect.value = "'Geist', sans-serif";
      for (const option of familySelect.options) {
        if (option.value.replace(/['"]/g, '').includes(fFamily)) {
          familySelect.value = option.value;
          break;
        }
      }
    }

    const fontWeightInput = documentRef.getElementById('elFontWeight');
    if (fontWeightInput) fontWeightInput.value = computedStyles.fontWeight;
    const textColorInput = documentRef.getElementById('elTextColor');
    if (textColorInput) textColorInput.value = rgbToHex(computedStyles.color);
    highlightAlignButton(computedStyles.textAlign || 'left');
    const zIndexInput = documentRef.getElementById('elZIndex');
    if (zIndexInput) zIndexInput.value = primaryElement.style.zIndex || 0;

    const opacityVal = Math.round((parseFloat(computedStyles.opacity || '1')) * 100);
    const opacityInput = documentRef.getElementById('elOpacity');
    if (opacityInput) opacityInput.value = opacityVal;
    const opacityLabel = documentRef.getElementById('opacityVal');
    if (opacityLabel) opacityLabel.textContent = opacityVal + '%';
    return true;
  }

  return {
    renderStudioInspectorSelectionSummary,
    syncStudioInspectorContentControls,
    syncStudioInspectorTypographyControls
  };
});

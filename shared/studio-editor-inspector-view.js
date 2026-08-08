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

  function resetStudioInspectorUiState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;

    renderStudioInspectorSelectionSummary({
      documentRef,
      selectionState: { hasSelection: false }
    });
    renderStudioInspectorAlignmentState({
      documentRef,
      align: ''
    });

    const textContentGroup = documentRef.getElementById('inspectorTextContentGroup');
    if (textContentGroup) textContentGroup.classList.remove('hidden');
    const imageGroup = documentRef.getElementById('inspectorImageGroup');
    if (imageGroup) imageGroup.classList.add('hidden');
    const imageFitInput = documentRef.getElementById('elImageFit');
    if (imageFitInput) {
      imageFitInput.value = 'fill';
      imageFitInput.disabled = true;
    }
    const borderGroup = documentRef.getElementById('inspectorBorderGroup');
    if (borderGroup) borderGroup.classList.add('hidden');

    const lockIcon = documentRef.getElementById('toggleLockSelectionIcon');
    if (lockIcon) lockIcon.textContent = 'lock';
    const lockLabel = documentRef.getElementById('toggleLockSelectionLabel');
    if (lockLabel) lockLabel.textContent = 'Lock Selected';
    const visibilityIcon = documentRef.getElementById('toggleVisibilitySelectionIcon');
    if (visibilityIcon) visibilityIcon.textContent = 'visibility_off';
    const visibilityLabel = documentRef.getElementById('toggleVisibilitySelectionLabel');
    if (visibilityLabel) visibilityLabel.textContent = 'Hide Selected';

    const defaults = [
      ['elTextContent', ''],
      ['elImageSrc', ''],
      ['elFontSize', '16'],
      ['fontSizeVal', '16px', 'textContent'],
      ['elFontFamily', "'Geist', sans-serif"],
      ['elFontWeight', '400'],
      ['elTextColor', '#ffffff'],
      ['elZIndex', '0'],
      ['elOpacity', '100'],
      ['opacityVal', '100%', 'textContent'],
      ['elBorderStyle', 'none'],
      ['elBorderWidth', '0'],
      ['borderWidthVal', '0px', 'textContent'],
      ['elBorderRadius', '0'],
      ['borderRadiusVal', '0px', 'textContent'],
      ['elBorderColor', '#ffffff']
    ];
    defaults.forEach(([id, value, property = 'value']) => {
      const control = documentRef.getElementById(id);
      if (control) control[property] = value;
    });
    return true;
  }

  function renderStudioInspectorAlignmentState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;

    const activeClass = 'py-1 flex items-center justify-center bg-[#7028d0]/15 border border-[#7028d0]/30 text-[#7028d0] rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none';
    const inactiveClass = 'py-1 flex items-center justify-center hover:bg-white/5 text-zinc-400 hover:text-white rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none';
    ['Left', 'Center', 'Right', 'Justify'].forEach((buttonName) => {
      const button = documentRef.getElementById(`align${buttonName}Btn`);
      if (!button) return;
      button.className = buttonName.toLowerCase() === options.align ? activeClass : inactiveClass;
    });
    return true;
  }

  function syncStudioInspectorContentControls(options = {}) {
    const documentRef = options.documentRef;
    const primaryElement = options.primaryElement;
    if (!documentRef || !primaryElement || typeof documentRef.getElementById !== 'function') return false;
    const isMulti = !!options.isMulti;
    const computedStyles = options.computedStyles || {};
    const textContentInput = documentRef.getElementById('elTextContent');
    if (textContentInput) {
      textContentInput.value = primaryElement.innerText || primaryElement.textContent || '';
    }

    const imageGroup = documentRef.getElementById('inspectorImageGroup');
    const imageSrcInput = documentRef.getElementById('elImageSrc');
    const imageFitInput = documentRef.getElementById('elImageFit');
    const textContentGroup = documentRef.getElementById('inspectorTextContentGroup');
    const isImage = !isMulti && primaryElement.tagName.toLowerCase() === 'img';
    if (isImage) {
      if (imageGroup) imageGroup.classList.remove('hidden');
      if (imageSrcInput) imageSrcInput.value = primaryElement.src || '';
      if (imageFitInput) {
        const fit = computedStyles.objectFit || primaryElement.style?.objectFit || 'fill';
        imageFitInput.value = ['fill', 'contain', 'cover'].includes(fit) ? fit : 'fill';
        imageFitInput.disabled = false;
      }
      if (textContentGroup) textContentGroup.classList.add('hidden');
    } else {
      if (imageGroup) imageGroup.classList.add('hidden');
      if (imageFitInput) imageFitInput.disabled = true;
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

  function syncStudioInspectorBorderControls(options = {}) {
    const documentRef = options.documentRef;
    const selection = Array.isArray(options.selection) ? options.selection : [];
    const computedStyles = options.computedStyles || {};
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const rgbToHex = typeof options.rgbToHex === 'function' ? options.rgbToHex : (value) => value;
    const isImgOrShape = selection.some((node) => {
      return node.tagName.toLowerCase() === 'img'
        || node.classList.contains('editor-shape')
        || node.tagName.toLowerCase() === 'table'
        || node.tagName.toLowerCase() === 'div';
    });
    const borderGroup = documentRef.getElementById('inspectorBorderGroup');
    if (!isImgOrShape) {
      if (borderGroup) borderGroup.classList.add('hidden');
      return true;
    }

    if (borderGroup) borderGroup.classList.remove('hidden');
    const borderStyleInput = documentRef.getElementById('elBorderStyle');
    if (borderStyleInput) borderStyleInput.value = computedStyles.borderStyle || 'none';
    const bWidth = parseInt(computedStyles.borderWidth) || 0;
    const borderWidthInput = documentRef.getElementById('elBorderWidth');
    if (borderWidthInput) borderWidthInput.value = bWidth;
    const borderWidthLabel = documentRef.getElementById('borderWidthVal');
    if (borderWidthLabel) borderWidthLabel.textContent = bWidth + 'px';
    const bRadius = parseInt(computedStyles.borderRadius) || 0;
    const borderRadiusInput = documentRef.getElementById('elBorderRadius');
    if (borderRadiusInput) borderRadiusInput.value = bRadius;
    const borderRadiusLabel = documentRef.getElementById('borderRadiusVal');
    if (borderRadiusLabel) borderRadiusLabel.textContent = bRadius + 'px';
    const borderColorInput = documentRef.getElementById('elBorderColor');
    if (borderColorInput) borderColorInput.value = rgbToHex(computedStyles.borderColor || '#ffffff');
    return true;
  }

  function syncStudioInspectorSelection(options = {}) {
    const documentRef = options.documentRef;
    const selectionState = options.selectionState || {};
    const selectionSummary = renderStudioInspectorSelectionSummary({
      documentRef,
      selectionState
    });
    if (!selectionSummary.hasSelection || !selectionSummary.primaryElement) return false;

    const primaryElement = selectionSummary.primaryElement;
    const computedStyles = options.computedStyles
      || primaryElement.ownerDocument.defaultView.getComputedStyle(primaryElement);
    syncStudioInspectorContentControls({
      documentRef,
      primaryElement,
      isMulti: selectionSummary.isMulti,
      computedStyles
    });
    syncStudioInspectorTypographyControls({
      documentRef,
      primaryElement,
      computedStyles,
      rgbToHex: options.rgbToHex,
      highlightAlignButton: options.highlightAlignButton
    });
    syncStudioInspectorBorderControls({
      documentRef,
      selection: selectionState.selection,
      computedStyles,
      rgbToHex: options.rgbToHex
    });
    return true;
  }

  return {
    renderStudioInspectorSelectionSummary,
    resetStudioInspectorUiState,
    renderStudioInspectorAlignmentState,
    syncStudioInspectorContentControls,
    syncStudioInspectorTypographyControls,
    syncStudioInspectorBorderControls,
    syncStudioInspectorSelection
  };
});

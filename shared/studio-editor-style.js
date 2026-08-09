(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorStyle = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_STUDIO_EDITOR_STYLE_ID = 'editor-style-tag';
  const STUDIO_STYLE_VERSION_LABELS = {
    text: 'Auto: Edited Text',
    chartValues: 'Auto: Edited Chart Data',
    family: 'Auto: Changed Font Family',
    weight: 'Auto: Changed Font Weight',
    align: 'Auto: Changed Alignment',
    zIndex: 'Auto: Changed Z-Index',
    borderStyle: 'Auto: Changed Border Style',
    borderWidth: 'Auto: Changed Border Width',
    borderRadius: 'Auto: Changed Corner Radius',
    borderColor: 'Auto: Changed Border Color',
    objectFit: 'Auto: Changed Image Fit',
    objectPosition: 'Auto: Changed Crop Position',
    opacity: 'Auto: Changed Opacity'
  };
  const STUDIO_STYLE_TOOLBAR_CONTROL_CONFIGS = [
    ['elTextContent', 'text', ''],
    ['elImageSrc', 'src', ''],
    ['elFontSize', 'size', '16'],
    ['elFontFamily', 'family', "'Geist', sans-serif"],
    ['elFontWeight', 'weight', '400'],
    ['alignLeftBtn', 'align', 'left'],
    ['alignCenterBtn', 'align', 'center'],
    ['alignRightBtn', 'align', 'right'],
    ['alignJustifyBtn', 'align', 'justify'],
    ['elTextColor', 'color', '#ffffff'],
    ['elOpacity', 'opacity', '100'],
    ['elBorderStyle', 'borderStyle', 'none'],
    ['elBorderWidth', 'borderWidth', '0'],
    ['elBorderRadius', 'borderRadius', '0'],
    ['elBorderColor', 'borderColor', '#ffffff']
  ];

  function getStudioStyleToolbarControlConfigs() {
    return STUDIO_STYLE_TOOLBAR_CONTROL_CONFIGS.map((config) => config.slice());
  }

  function getStudioStyleSelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);

    return selection.filter((element) => isEligibleElement(element));
  }

  function buildStudioStyleMutationPlan(elements = [], prop, value, options = {}) {
    const selection = getStudioStyleSelection(elements, options);
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => true;

    return {
      selection,
      prop,
      value,
      canApply: canMutateDeck() && selection.length > 0 && !selection.some((element) => isLocked(element)),
      versionLabel: STUDIO_STYLE_VERSION_LABELS[prop] || ''
    };
  }

  function buildStudioStyleToolbarState(elements = [], controlConfigs = [], options = {}) {
    const configs = Array.isArray(controlConfigs) ? controlConfigs : [];
    const controlStates = {};

    configs.forEach((config) => {
      const id = Array.isArray(config) ? config[0] : config && config.id;
      const prop = Array.isArray(config) ? config[1] : config && config.prop;
      const value = Array.isArray(config) ? config[2] : config && config.value;
      if (!id || !prop) {
        return;
      }

      const mutationPlan = buildStudioStyleMutationPlan(elements, prop, value, options);
      controlStates[id] = mutationPlan.canApply;
    });

    return {
      controlStates
    };
  }

  function renderStudioStyleToolbarState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const toolbarState = options.toolbarState || {};
    Object.entries(toolbarState.controlStates || {}).forEach(([id, canRun]) => {
      const control = documentRef.getElementById(id);
      if (control) control.disabled = !canRun;
    });
    return true;
  }

  function syncStudioStyleToolbarState(options = {}) {
    const controlConfigs = Array.isArray(options.controlConfigs)
      ? options.controlConfigs
      : getStudioStyleToolbarControlConfigs();
    const toolbarState = buildStudioStyleToolbarState(
      options.elements,
      controlConfigs,
      {
        isLocked: options.isLocked,
        canMutateDeck: options.canMutateDeck
      }
    );
    return renderStudioStyleToolbarState({
      documentRef: options.documentRef,
      toolbarState
    });
  }

  function createStudioStyleToolbarStateSync(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getLockedState = typeof options.getLockedState === 'function'
      ? options.getLockedState
      : () => () => false;
    const getDocumentRef = typeof options.getDocumentRef === 'function'
      ? options.getDocumentRef
      : () => options.documentRef || null;

    return function syncStudioEditorStyleToolbarState(doc = null) {
      const resolvedDoc = doc || getDocument();
      return syncStudioStyleToolbarState({
        documentRef: getDocumentRef(),
        elements: getSelectedElements(),
        isLocked: getLockedState(resolvedDoc),
        canMutateDeck: () => !!getActiveSlide(resolvedDoc)
      });
    };
  }

  function syncStudioStyleFeedbackLabel(options = {}) {
    const feedbackConfig = {
      size: { id: 'fontSizeVal', suffix: 'px' },
      borderWidth: { id: 'borderWidthVal', suffix: 'px' },
      borderRadius: { id: 'borderRadiusVal', suffix: 'px' },
      opacity: { id: 'opacityVal', suffix: '%' }
    }[options.prop];
    const documentRef = options.documentRef;
    if (!feedbackConfig || !documentRef || typeof documentRef.getElementById !== 'function') return false;

    const label = documentRef.getElementById(feedbackConfig.id);
    if (!label) return false;
    label.textContent = `${options.displayValue}${feedbackConfig.suffix}`;
    return true;
  }

  function finalizeStudioStyleActionResult(result, options = {}) {
    if (!result && typeof options.syncInspectorForSelection === 'function') {
      options.syncInspectorForSelection();
    }
    return result;
  }

  function normalizeStudioStyleMutationValue(prop, value) {
    if (prop === 'opacity') {
      const displayValue = `${Math.max(10, Math.min(100, parseInt(value, 10) || 100))}`;
      return {
        styleValue: (Number(displayValue) / 100).toString(),
        displayValue
      };
    }

    if (prop === 'size' || prop === 'borderWidth' || prop === 'borderRadius') {
      const fallback = prop === 'size' ? 16 : 0;
      const parsedValue = typeof value === 'number'
        ? value
        : (typeof value === 'string' && value.trim() ? Number(value) : NaN);
      const normalizedValue = Number.isFinite(parsedValue) && parsedValue >= 0
        ? parsedValue
        : fallback;
      return {
        styleValue: `${normalizedValue}px`,
        displayValue: `${normalizedValue}`
      };
    }

    if (prop === 'objectPosition') {
      const allowedPositions = new Set([
        'left top', 'center top', 'right top',
        'left center', 'center center', 'right center',
        'left bottom', 'center bottom', 'right bottom'
      ]);
      const normalizedPosition = typeof value === 'string' ? value.trim().toLowerCase() : '';
      const styleValue = allowedPositions.has(normalizedPosition)
        ? normalizedPosition
        : 'center center';
      return {
        styleValue,
        displayValue: styleValue
      };
    }

    return {
      styleValue: value,
      displayValue: `${value}`
    };
  }

  function applyStudioStyleMutation(elements = [], prop, value) {
    const selection = Array.isArray(elements) ? elements : [];
    if (selection.length === 0) {
      return {
        didApply: false,
        displayValue: `${value}`
      };
    }

    const normalizedValue = normalizeStudioStyleMutationValue(prop, value);
    let didApply = false;

    selection.forEach((element, index) => {
      if (!element) {
        return;
      }

      if (prop === 'text') {
        if (index === 0) {
          element.textContent = value;
          didApply = true;
        }
        return;
      }

      if (prop === 'src') {
        if (index === 0 && typeof element.tagName === 'string' && element.tagName.toLowerCase() === 'img') {
          element.src = value;
          didApply = true;
        }
        return;
      }

      if (!element.style) {
        return;
      }

      if (prop === 'size') {
        element.style.fontSize = normalizedValue.styleValue;
        didApply = true;
      } else if (prop === 'family') {
        element.style.fontFamily = normalizedValue.styleValue;
        didApply = true;
      } else if (prop === 'weight') {
        element.style.fontWeight = normalizedValue.styleValue;
        didApply = true;
      } else if (prop === 'color') {
        element.style.color = normalizedValue.styleValue;
        didApply = true;
      } else if (prop === 'align') {
        element.style.textAlign = normalizedValue.styleValue;
        didApply = true;
      } else if (prop === 'opacity') {
        element.style.opacity = normalizedValue.styleValue;
        didApply = true;
      } else if (prop === 'zIndex') {
        element.style.zIndex = normalizedValue.styleValue;
        didApply = true;
      } else if (prop === 'borderStyle') {
        element.style.borderStyle = normalizedValue.styleValue;
        didApply = true;
      } else if (prop === 'borderWidth') {
        element.style.borderWidth = normalizedValue.styleValue;
        didApply = true;
      } else if (prop === 'borderRadius') {
        element.style.borderRadius = normalizedValue.styleValue;
        didApply = true;
      } else if (prop === 'borderColor') {
        element.style.borderColor = normalizedValue.styleValue;
        didApply = true;
      } else if (prop === 'objectFit') {
        element.style.objectFit = normalizedValue.styleValue;
        didApply = true;
      } else if (prop === 'objectPosition') {
        element.style.objectPosition = normalizedValue.styleValue;
        didApply = true;
      }
    });

    return {
      didApply,
      displayValue: normalizedValue.displayValue
    };
  }

  function applyStudioStyleMutationWithTransaction(elements = [], prop, value, options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const applyMutation = typeof options.applyStudioStyleMutation === 'function'
      ? options.applyStudioStyleMutation
      : applyStudioStyleMutation;
    const styleTransactionProperty = {
      size: 'fontSize',
      family: 'fontFamily',
      weight: 'fontWeight',
      color: 'color',
      align: 'textAlign',
      opacity: 'opacity',
      zIndex: 'zIndex',
      borderStyle: 'borderStyle',
      borderWidth: 'borderWidth',
      borderRadius: 'borderRadius',
      borderColor: 'borderColor',
      objectFit: 'objectFit',
      objectPosition: 'objectPosition'
    }[prop] || '';
    const propertyTransactionProperty = {
      text: 'textContent',
      src: 'src'
    }[prop] || '';
    const createStyleTransaction = typeof options.createStyleTransaction === 'function'
      ? options.createStyleTransaction
      : null;
    const createPropertyTransaction = typeof options.createPropertyTransaction === 'function'
      ? options.createPropertyTransaction
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const styleTransactionItems = createStyleTransaction && styleTransactionProperty
      ? selection.map((element) => ({
          element,
          elementId: getElementId(element),
          before: {
            [styleTransactionProperty]: element && element.style
              ? element.style[styleTransactionProperty]
              : ''
          }
        }))
      : [];
    const propertyTransactionItems = createPropertyTransaction && propertyTransactionProperty
      ? selection.slice(0, 1).map((element) => ({
          element,
          elementId: getElementId(element),
          property: propertyTransactionProperty,
          before: element ? element[propertyTransactionProperty] : ''
        }))
      : [];

    const rollbackStyleItems = styleTransactionProperty
      ? selection.map((element) => ({
          element,
          property: styleTransactionProperty,
          before: element && element.style ? element.style[styleTransactionProperty] : ''
        }))
      : [];
    const rollbackPropertyItems = propertyTransactionProperty
      ? selection.slice(0, 1).map((element) => ({
          element,
          property: propertyTransactionProperty,
          before: element ? element[propertyTransactionProperty] : ''
        }))
      : [];
    const restoreMutationBaseline = () => {
      rollbackStyleItems.forEach((item) => {
        try {
          if (item.element && item.element.style) {
            item.element.style[item.property] = item.before;
          }
        } catch (error) {
          // Keep failure handling deterministic when a target has disconnected.
        }
      });
      rollbackPropertyItems.forEach((item) => {
        try {
          if (item.element) item.element[item.property] = item.before;
        } catch (error) {
          // Keep failure handling deterministic when a target has disconnected.
        }
      });
    };

    let mutationResult;
    try {
      mutationResult = applyMutation(selection, prop, value);
    } catch (error) {
      restoreMutationBaseline();
      return {
        didApply: false,
        displayValue: `${value}`,
        transaction: null
      };
    }
    if (!mutationResult || !mutationResult.didApply) {
      restoreMutationBaseline();
      return {
        ...(mutationResult && typeof mutationResult === 'object' ? mutationResult : {}),
        didApply: false,
        transaction: null
      };
    }

    styleTransactionItems.forEach((item) => {
      item.after = {
        [styleTransactionProperty]: item.element && item.element.style
          ? item.element.style[styleTransactionProperty]
          : ''
      };
    });
    const styleTransaction = styleTransactionItems.length > 0
      ? createStyleTransaction(styleTransactionItems, { getElementId })
      : null;
    propertyTransactionItems.forEach((item) => {
      item.after = item.element ? item.element[propertyTransactionProperty] : '';
    });
    const propertyTransaction = propertyTransactionItems.length > 0
      ? createPropertyTransaction(propertyTransactionItems, { getElementId })
      : null;

    return {
      ...mutationResult,
      transaction: styleTransaction || propertyTransaction
    };
  }

  function getStudioEditorStyleText() {
    return `
      .slide {
        position: relative !important;
      }
      .editor-selected {
        outline: 2px solid #7028d0 !important;
        outline-offset: 3px !important;
        box-shadow: 0 0 18px rgba(112, 40, 208, 0.35) !important;
        transition: outline-color 0.14s ease, box-shadow 0.14s ease !important;
      }
      .editor-hoverable:hover:not(.editor-selected) {
        outline: 1px dashed rgba(112, 40, 208, 0.75) !important;
        outline-offset: 2px !important;
        cursor: pointer !important;
      }
      .editor-hoverable,
      .editor-hoverable * {
        -webkit-user-drag: none !important;
      }
      .editor-hoverable:hover,
      .editor-hoverable:active,
      .editor-hoverable:focus,
      .editor-hoverable:hover *,
      .editor-hoverable:active *,
      .editor-hoverable:focus * {
        transform: none !important;
        translate: none !important;
        scale: none !important;
        rotate: none !important;
      }
      .editor-hoverable,
      #editorSelectionOverlay,
      .editor-resize-handle {
        touch-action: none !important;
      }
      #editorSelectionOverlay {
        position: absolute;
        border: 1.5px solid rgba(112, 40, 208, 0.95);
        background: rgba(112, 40, 208, 0.08);
        box-shadow: 0 0 0 1px rgba(80, 80, 232, 0.4), 0 0 22px rgba(112, 40, 208, 0.22);
        pointer-events: none;
        z-index: 999999;
        transition: opacity 0.12s ease;
        opacity: 1;
      }
      .editor-resize-handle {
        position: absolute;
        width: 10px;
        height: 10px;
        border: 1px solid rgba(255, 255, 255, 0.85);
        background: #7028d0;
        border-radius: 50%;
        pointer-events: auto;
        box-shadow: 0 0 8px rgba(112, 40, 208, 0.5);
      }
      .editor-resize-handle[data-dir="n"] { left: 50%; top: -6px; transform: translateX(-50%); cursor: ns-resize; }
      .editor-resize-handle[data-dir="s"] { left: 50%; bottom: -6px; transform: translateX(-50%); cursor: ns-resize; }
      .editor-resize-handle[data-dir="e"] { right: -6px; top: 50%; transform: translateY(-50%); cursor: ew-resize; }
      .editor-resize-handle[data-dir="w"] { left: -6px; top: 50%; transform: translateY(-50%); cursor: ew-resize; }
      .editor-resize-handle[data-dir="nw"] { left: -6px; top: -6px; cursor: nwse-resize; }
      .editor-resize-handle[data-dir="ne"] { right: -6px; top: -6px; cursor: nesw-resize; }
      .editor-resize-handle[data-dir="sw"] { left: -6px; bottom: -6px; cursor: nesw-resize; }
      .editor-resize-handle[data-dir="se"] { right: -6px; bottom: -6px; cursor: nwse-resize; }
      #editorGuidesLayer {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 999998;
      }
      .editor-guide-line {
        position: absolute;
        opacity: 0;
        transition: opacity 0.12s ease;
      }
      .editor-guide-line.visible {
        opacity: 1;
      }
      .editor-guide-line.vertical {
        top: 0;
        bottom: 0;
        border-left: 1px dotted rgba(112, 40, 208, 0.95);
      }
      .editor-guide-line.horizontal {
        left: 0;
        right: 0;
        border-top: 1px dotted rgba(112, 40, 208, 0.95);
      }
      #editorDragHud {
        position: absolute;
        top: 12px;
        left: 12px;
        z-index: 1000000;
        pointer-events: none;
        background: rgba(5, 5, 8, 0.88);
        border: 1px solid rgba(112, 40, 208, 0.45);
        color: #ece7ff;
        border-radius: 8px;
        font: 600 11px/1.4 'JetBrains Mono', monospace;
        letter-spacing: 0.02em;
        padding: 6px 8px;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        opacity: 0;
        transform: translateY(-2px);
        transition: opacity 0.1s ease, transform 0.1s ease;
        white-space: nowrap;
      }
      #editorDragHud.visible {
        opacity: 1;
        transform: translateY(0);
      }
      #editorSelectionOverlay.drag-preview {
        border-style: dashed;
        border-color: rgba(112, 40, 208, 1);
        box-shadow: 0 0 0 1px rgba(96, 48, 216, 0.55), 0 0 26px rgba(112, 40, 208, 0.34);
      }
      .editor-dragging {
        transition: none !important;
        transition-property: none !important;
        cursor: grabbing !important;
      }
      .editor-dragging, .editor-dragging * {
        user-select: none !important;
      }
      [style*="position: absolute"] {
        cursor: move !important;
        user-select: none !important;
      }
      [data-editor-inline-editing="true"],
      [data-editor-inline-editing="true"] * {
        cursor: text !important;
        user-select: text !important;
        -webkit-user-select: text !important;
      }
      a {
        pointer-events: none !important;
      }
    `;
  }

  function ensureStudioEditorStyle(doc, options = {}) {
    if (!doc || !doc.head || typeof doc.getElementById !== 'function' || typeof doc.createElement !== 'function') {
      return null;
    }

    const styleId = options.styleId || DEFAULT_STUDIO_EDITOR_STYLE_ID;
    const existingStyle = doc.getElementById(styleId);
    if (existingStyle) {
      return existingStyle;
    }

    const styleEl = doc.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = typeof options.getStyleText === 'function'
      ? options.getStyleText()
      : getStudioEditorStyleText();
    doc.head.appendChild(styleEl);
    return styleEl;
  }

  return {
    DEFAULT_STUDIO_EDITOR_STYLE_ID,
    STUDIO_STYLE_VERSION_LABELS,
    getStudioStyleToolbarControlConfigs,
    getStudioStyleSelection,
    buildStudioStyleMutationPlan,
    buildStudioStyleToolbarState,
    renderStudioStyleToolbarState,
    syncStudioStyleToolbarState,
    createStudioStyleToolbarStateSync,
    syncStudioStyleFeedbackLabel,
    finalizeStudioStyleActionResult,
    normalizeStudioStyleMutationValue,
    applyStudioStyleMutation,
    applyStudioStyleMutationWithTransaction,
    getStudioEditorStyleText,
    ensureStudioEditorStyle
  };
});

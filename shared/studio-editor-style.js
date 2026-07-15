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
    family: 'Auto: Changed Font Family',
    weight: 'Auto: Changed Font Weight',
    align: 'Auto: Changed Alignment',
    zIndex: 'Auto: Changed Z-Index',
    borderStyle: 'Auto: Changed Border Style',
    borderWidth: 'Auto: Changed Border Width',
    borderRadius: 'Auto: Changed Corner Radius',
    borderColor: 'Auto: Changed Border Color',
    opacity: 'Auto: Changed Opacity'
  };

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

  function normalizeStudioStyleMutationValue(prop, value) {
    if (prop === 'opacity') {
      const displayValue = `${Math.max(10, Math.min(100, parseInt(value, 10) || 100))}`;
      return {
        styleValue: (Number(displayValue) / 100).toString(),
        displayValue
      };
    }

    if (prop === 'size' || prop === 'borderWidth' || prop === 'borderRadius') {
      return {
        styleValue: `${value}px`,
        displayValue: `${value}`
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
      }
    });

    return {
      didApply,
      displayValue: normalizedValue.displayValue
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
    getStudioStyleSelection,
    buildStudioStyleMutationPlan,
    buildStudioStyleToolbarState,
    renderStudioStyleToolbarState,
    normalizeStudioStyleMutationValue,
    applyStudioStyleMutation,
    getStudioEditorStyleText,
    ensureStudioEditorStyle
  };
});

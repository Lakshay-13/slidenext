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
    getStudioEditorStyleText,
    ensureStudioEditorStyle
  };
});

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorConfiguration = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const editorChromeNodeIds = [
    'editorSelectionOverlay',
    'editorGuidesLayer',
    'editorDragHud'
  ];
  const editorSelectableSelector = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'li', 'img', 'pre', 'code', 'button', 'a',
    'svg', 'canvas', 'video', 'figure', 'blockquote',
    '.editor-shape', '.editor-chart', '.editor-embed-placeholder', '.material-symbols-outlined', 'table',
    '.glass-card', '.glass-panel', '.nav-btn',
    '.pipeline-step', '.dim3-card', '.fail-card', '.av-node',
    "[class*='card']", "[class*='panel']", "[class*='node']", "[class*='step']", "[class*='box']",
    "[style*='position:absolute']", "[style*='position: absolute']",
    "[style*='position:fixed']", "[style*='position: fixed']"
  ].join(', ');
  const editorParentTargetSelector = [
    'button',
    'a',
    '[role="button"]',
    '.glass-card',
    '.glass-panel',
    '.nav-btn',
    "[class*='card']",
    "[class*='panel']",
    "[class*='node']",
    "[class*='step']",
    "[class*='box']"
  ].join(', ');
  const editorInlineTextTags = new Set([
    'span', 'strong', 'em', 'b', 'i', 'u', 'small', 'mark', 'sup', 'sub', 'label'
  ]);
  const editorInlineEditTextTags = new Set([
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'pre', 'code', 'blockquote', 'td', 'th',
    ...editorInlineTextTags
  ]);
  const resizeHandleDirections = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

  return {
    EDITOR_CHROME_NODE_IDS: editorChromeNodeIds,
    EDITOR_SELECTABLE_SELECTOR: editorSelectableSelector,
    EDITOR_PARENT_TARGET_SELECTOR: editorParentTargetSelector,
    EDITOR_INLINE_TEXT_TAGS: editorInlineTextTags,
    EDITOR_INLINE_EDIT_TEXT_TAGS: editorInlineEditTextTags,
    RESIZE_HANDLE_DIRECTIONS: resizeHandleDirections
  };
});

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioElementState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isStudioElementLocked(el) {
    return !!(el && el.dataset && el.dataset.editorLocked === 'true');
  }

  function isStudioElementHidden(el) {
    return !!(el && (
      (el.dataset && el.dataset.editorHidden === 'true')
      || el.hidden === true
    ));
  }

  function setStudioElementHiddenState(el, hidden) {
    if (!el) return;

    if (hidden) {
      if (el.dataset && !Object.prototype.hasOwnProperty.call(el.dataset, 'editorPrevDisplay')) {
        el.dataset.editorPrevDisplay = el.style && typeof el.style.display === 'string'
          ? el.style.display
          : '';
      }
      if (el.dataset) {
        el.dataset.editorHidden = 'true';
      }
      el.hidden = true;
      if (el.style) {
        el.style.display = 'none';
      }
      return;
    }

    const prevDisplay = el.dataset && Object.prototype.hasOwnProperty.call(el.dataset, 'editorPrevDisplay')
      ? el.dataset.editorPrevDisplay
      : '';
    if (el.style && typeof el.style.removeProperty === 'function') {
      if (prevDisplay) {
        el.style.display = prevDisplay;
      } else {
        el.style.removeProperty('display');
      }
    } else if (el.style) {
      el.style.display = prevDisplay || '';
    }
    if (el.dataset) {
      delete el.dataset.editorHidden;
      delete el.dataset.editorPrevDisplay;
    }
    el.hidden = false;
  }

  function sanitizeStudioDuplicatedSubtree(root, options = {}) {
    if (!root || root.nodeType !== 1) return root;

    const editorElementIdAttr = typeof options.editorElementIdAttr === 'string' && options.editorElementIdAttr
      ? options.editorElementIdAttr
      : 'data-editor-id';
    const transientClassNames = Array.isArray(options.transientClassNames) && options.transientClassNames.length > 0
      ? options.transientClassNames
      : ['editor-selected', 'editor-dragging'];
    const descendants = typeof root.querySelectorAll === 'function'
      ? Array.from(root.querySelectorAll('*'))
      : [];

    [root, ...descendants].forEach((node) => {
      if (typeof node.removeAttribute === 'function') {
        node.removeAttribute('id');
        node.removeAttribute(editorElementIdAttr);
      }
      if (node.classList && typeof node.classList.remove === 'function') {
        transientClassNames.forEach((className) => node.classList.remove(className));
      }
      if (node.dataset && node.dataset.editorHidden === 'true') {
        setStudioElementHiddenState(node, false);
      }
      if (node.dataset) {
        delete node.dataset.editorLocked;
      }
    });

    return root;
  }

  return {
    isStudioElementLocked,
    isStudioElementHidden,
    setStudioElementHiddenState,
    sanitizeStudioDuplicatedSubtree
  };
});

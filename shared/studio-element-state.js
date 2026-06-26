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

  return {
    isStudioElementLocked,
    isStudioElementHidden,
    setStudioElementHiddenState
  };
});

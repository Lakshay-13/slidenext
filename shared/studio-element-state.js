(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioElementState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function hasStudioHiddenClass(el) {
    return !!(el && el.classList && typeof el.classList.contains === 'function' && el.classList.contains('hidden'));
  }

  function isStudioElementLocked(el) {
    return !!(el && el.dataset && el.dataset.editorLocked === 'true');
  }

  function setStudioElementLockedState(el, locked) {
    if (!el || !el.dataset) return;
    if (locked) {
      el.dataset.editorLocked = 'true';
      return;
    }
    delete el.dataset.editorLocked;
  }

  const STUDIO_VISIBILITY_DATASET_KEYS = [
    'editorHidden',
    'editorPrevDisplay',
    'editorPrevAriaHidden'
  ];

  function getStudioElementVisibilityState(el) {
    if (!el) return null;
    const dataset = {};
    STUDIO_VISIBILITY_DATASET_KEYS.forEach((key) => {
      if (el.dataset && Object.prototype.hasOwnProperty.call(el.dataset, key)) {
        dataset[key] = String(el.dataset[key]);
      }
    });
    const ariaHidden = typeof el.getAttribute === 'function'
      ? el.getAttribute('aria-hidden')
      : null;
    return {
      hidden: el.hidden === true,
      display: el.style && typeof el.style.display === 'string' ? el.style.display : '',
      ariaHidden: typeof ariaHidden === 'string' ? ariaHidden : null,
      hasHiddenClass: hasStudioHiddenClass(el),
      dataset
    };
  }

  function applyStudioElementVisibilityState(el, state) {
    if (!el || !state || typeof state !== 'object') return false;

    const display = typeof state.display === 'string' ? state.display : '';
    if (el.style) {
      if (display) {
        el.style.display = display;
      } else if (typeof el.style.removeProperty === 'function') {
        el.style.removeProperty('display');
      } else {
        el.style.display = '';
      }
    }

    if (el.classList) {
      if (state.hasHiddenClass === true && typeof el.classList.add === 'function') {
        el.classList.add('hidden');
      } else if (state.hasHiddenClass !== true && typeof el.classList.remove === 'function') {
        el.classList.remove('hidden');
      }
    }

    if (typeof el.setAttribute === 'function' && typeof el.removeAttribute === 'function') {
      if (typeof state.ariaHidden === 'string') {
        el.setAttribute('aria-hidden', state.ariaHidden);
      } else {
        el.removeAttribute('aria-hidden');
      }
    }

    el.hidden = state.hidden === true;

    STUDIO_VISIBILITY_DATASET_KEYS.forEach((key) => {
      const dataset = state.dataset && typeof state.dataset === 'object'
        ? state.dataset
        : {};
      if (Object.prototype.hasOwnProperty.call(dataset, key)) {
        if (el.dataset) el.dataset[key] = String(dataset[key]);
      } else if (el.dataset) {
        delete el.dataset[key];
      }
    });
    return true;
  }

  function isStudioElementHidden(el) {
    const computedStyle = el && el.ownerDocument && el.ownerDocument.defaultView
      && typeof el.ownerDocument.defaultView.getComputedStyle === 'function'
      ? el.ownerDocument.defaultView.getComputedStyle(el)
      : null;
    return !!(el && (
      (el.dataset && el.dataset.editorHidden === 'true')
      || (typeof el.getAttribute === 'function' && el.getAttribute('aria-hidden') === 'true')
      || (el.style && el.style.display === 'none')
      || (computedStyle && computedStyle.display === 'none')
      || (computedStyle && computedStyle.visibility === 'hidden')
      || hasStudioHiddenClass(el)
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
        if (!Object.prototype.hasOwnProperty.call(el.dataset, 'editorPrevAriaHidden')) {
          const previousAriaHidden = typeof el.getAttribute === 'function'
            ? el.getAttribute('aria-hidden')
            : null;
          el.dataset.editorPrevAriaHidden = typeof previousAriaHidden === 'string'
            ? previousAriaHidden
            : '';
        }
      }
      el.hidden = true;
      if (typeof el.setAttribute === 'function') {
        el.setAttribute('aria-hidden', 'true');
      }
      if (el.classList && typeof el.classList.add === 'function') {
        el.classList.add('hidden');
      }
      if (el.style) {
        el.style.display = 'none';
      }
      return;
    }

    if (hasStudioHiddenClass(el) && el.classList && typeof el.classList.remove === 'function') {
      el.classList.remove('hidden');
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
    const prevAriaHidden = el.dataset && Object.prototype.hasOwnProperty.call(el.dataset, 'editorPrevAriaHidden')
      ? el.dataset.editorPrevAriaHidden
      : null;
    if (typeof el.setAttribute === 'function' && typeof el.removeAttribute === 'function') {
      if (prevAriaHidden === 'true' || prevAriaHidden === 'false') {
        el.setAttribute('aria-hidden', prevAriaHidden);
      } else {
        el.removeAttribute('aria-hidden');
      }
    }
    if (el.dataset) {
      delete el.dataset.editorHidden;
      delete el.dataset.editorPrevDisplay;
      delete el.dataset.editorPrevAriaHidden;
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
      if (isStudioElementHidden(node)) {
        setStudioElementHiddenState(node, false);
      }
      setStudioElementLockedState(node, false);
    });

    return root;
  }

  return {
    isStudioElementLocked,
    setStudioElementLockedState,
    getStudioElementVisibilityState,
    applyStudioElementVisibilityState,
    isStudioElementHidden,
    setStudioElementHiddenState,
    sanitizeStudioDuplicatedSubtree
  };
});

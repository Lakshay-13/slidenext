(function (root, factory) {
  let defaultElementStateApi = root && root.SlideNextStudioElementState;
  if (typeof module === 'object' && module.exports) {
    defaultElementStateApi = require('./studio-element-state.js');
  }
  const api = factory(defaultElementStateApi);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorElementStateAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (defaultElementStateApi) {
  function resolveElementStateApi(options) {
    return Object.prototype.hasOwnProperty.call(options, 'elementStateApi')
      ? options.elementStateApi
      : defaultElementStateApi;
  }

  function createStudioEditorElementStateAccessors(options = {}) {
    const elementStateApi = resolveElementStateApi(options);
    const editorElementIdAttr = typeof options.editorElementIdAttr === 'string'
      && options.editorElementIdAttr
      ? options.editorElementIdAttr
      : 'data-editor-id';
    const transientClassNames = Array.isArray(options.transientClassNames)
      && options.transientClassNames.length > 0
      ? [...options.transientClassNames]
      : ['editor-selected', 'editor-dragging'];

    return {
      getVisibilityState(element) {
        return elementStateApi
          && typeof elementStateApi.getStudioElementVisibilityState === 'function'
          ? elementStateApi.getStudioElementVisibilityState(element)
          : null;
      },
      setLockedState(element, locked) {
        if (elementStateApi
          && typeof elementStateApi.setStudioElementLockedState === 'function') {
          elementStateApi.setStudioElementLockedState(element, locked);
        }
      },
      isLocked(element) {
        return elementStateApi
          && typeof elementStateApi.isStudioElementLocked === 'function'
          ? elementStateApi.isStudioElementLocked(element)
          : false;
      },
      isHidden(element) {
        return elementStateApi
          && typeof elementStateApi.isStudioElementHidden === 'function'
          ? elementStateApi.isStudioElementHidden(element)
          : false;
      },
      setHiddenState(element, hidden) {
        if (!element || !element.isConnected) return;
        if (elementStateApi
          && typeof elementStateApi.setStudioElementHiddenState === 'function') {
          elementStateApi.setStudioElementHiddenState(element, hidden);
        }
      },
      sanitizeDuplicatedSubtree(rootElement) {
        if (elementStateApi
          && typeof elementStateApi.sanitizeStudioDuplicatedSubtree === 'function') {
          elementStateApi.sanitizeStudioDuplicatedSubtree(rootElement, {
            editorElementIdAttr,
            transientClassNames: [...transientClassNames]
          });
        }
      }
    };
  }

  return { createStudioEditorElementStateAccessors };
});

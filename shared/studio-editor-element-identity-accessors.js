(function (root, factory) {
  let defaultElementIdentityAdapter = root && root.SlideNextStudioEditorElementIdentityAdapter;
  if (typeof module === 'object' && module.exports) {
    defaultElementIdentityAdapter = require('./studio-editor-element-identity-adapter.js');
  }
  const api = factory(defaultElementIdentityAdapter);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorElementIdentityAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (defaultElementIdentityAdapter) {
  function resolveAdapter(options) {
    return Object.prototype.hasOwnProperty.call(options, 'elementIdentityAdapter')
      ? options.elementIdentityAdapter
      : defaultElementIdentityAdapter;
  }

  function createStudioEditorElementIdentityAccessors(options = {}) {
    const elementIdentityAdapter = resolveAdapter(options);
    const domApi = options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getDomOptions = typeof options.getDomOptions === 'function'
      ? options.getDomOptions
      : (overrides = {}) => overrides;

    return {
      isElementEligible(element, options = {}) {
        return elementIdentityAdapter
          && typeof elementIdentityAdapter.isStudioEditorElementEligible === 'function'
          ? elementIdentityAdapter.isStudioEditorElementEligible(element, {
              domApi,
              domOptions: getDomOptions(options)
            })
          : false;
      },
      assignElementId(element, options = {}) {
        return elementIdentityAdapter
          && typeof elementIdentityAdapter.assignStudioEditorElementId === 'function'
          ? elementIdentityAdapter.assignStudioEditorElementId(element, {
              domApi,
              domOptions: getDomOptions(options)
            })
          : '';
      },
      getElementById(editorId, doc = getDocument(), options = {}) {
        return elementIdentityAdapter
          && typeof elementIdentityAdapter.getStudioEditorElementById === 'function'
          ? elementIdentityAdapter.getStudioEditorElementById(editorId, doc, {
              domApi,
              domOptions: getDomOptions(options)
            })
          : null;
      }
    };
  }

  return { createStudioEditorElementIdentityAccessors };
});

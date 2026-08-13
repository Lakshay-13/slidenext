(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorElementIdentityAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function resolveDomApi(options = {}) {
    return options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
  }

  function isStudioEditorElementEligible(element, options = {}) {
    const domApi = resolveDomApi(options);
    const checkEligibility = typeof options.eligibilityReader === 'function'
      ? options.eligibilityReader
      : domApi
        && typeof domApi.isEligibleEditableElement === 'function'
        ? domApi.isEligibleEditableElement
        : null;
    if (!checkEligibility) {
      return false;
    }
    return checkEligibility(element, options.domOptions || {});
  }

  function assignStudioEditorElementId(element, options = {}) {
    const domApi = resolveDomApi(options);
    const assignElementId = typeof options.elementIdAssigner === 'function'
      ? options.elementIdAssigner
      : domApi
        && typeof domApi.assignStudioElementId === 'function'
        ? domApi.assignStudioElementId
        : null;
    if (!assignElementId) {
      return '';
    }
    return assignElementId(element, options.domOptions || {});
  }

  function getStudioEditorElementById(editorId, doc, options = {}) {
    const domApi = resolveDomApi(options);
    const readElementById = typeof options.elementByIdReader === 'function'
      ? options.elementByIdReader
      : domApi
        && typeof domApi.getElementByEditorId === 'function'
        ? domApi.getElementByEditorId
        : null;
    if (!readElementById) {
      return null;
    }
    return readElementById(editorId, doc, options.domOptions || {});
  }

  return {
    isStudioEditorElementEligible,
    assignStudioEditorElementId,
    getStudioEditorElementById
  };
});

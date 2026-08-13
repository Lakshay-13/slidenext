(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHoverableElementsAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function resolveDomApi(options = {}) {
    return options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
  }

  function makeStudioEditorElementsHoverable(rootNode, options = {}) {
    const domApi = resolveDomApi(options);
    const decorateElements = typeof options.hoverableDecorator === 'function'
      ? options.hoverableDecorator
      : domApi
        && typeof domApi.makeStudioElementsHoverable === 'function'
        ? domApi.makeStudioElementsHoverable
        : null;
    if (!decorateElements) {
      return [];
    }
    return decorateElements(rootNode, options.domOptions || {});
  }

  return { makeStudioEditorElementsHoverable };
});

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClosestPositionedAncestorAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioEditorClosestPositionedAncestor(element, options = {}) {
    const domApi = options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
    const resolveAncestor = typeof options.positionedAncestorResolver === 'function'
      ? options.positionedAncestorResolver
      : domApi
        && typeof domApi.getStudioClosestPositionedAncestor === 'function'
        ? domApi.getStudioClosestPositionedAncestor
        : null;
    if (!resolveAncestor) {
      return null;
    }
    return resolveAncestor(element, options.domOptions || {});
  }

  return {
    getStudioEditorClosestPositionedAncestor
  };
});

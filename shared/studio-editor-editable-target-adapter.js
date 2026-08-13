(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorEditableTargetAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function resolveDomApi(options = {}) {
    return options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
  }

  function resolveStudioEditorEditableTarget(node, options = {}) {
    const domApi = resolveDomApi(options);
    const resolveTarget = typeof options.targetResolver === 'function'
      ? options.targetResolver
      : domApi
        && typeof domApi.resolveStudioEditableTarget === 'function'
        ? domApi.resolveStudioEditableTarget
        : null;
    if (!resolveTarget) {
      return null;
    }
    return resolveTarget(node, options.domOptions || {});
  }

  return { resolveStudioEditorEditableTarget };
});

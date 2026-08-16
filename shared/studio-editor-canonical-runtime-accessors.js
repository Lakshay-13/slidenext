(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorCanonicalRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorCanonicalShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'canonicalRuntimeApi')) {
      shellOptions.canonicalRuntimeApi = options.canonicalRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorCanonicalShellRuntime === 'function'
      ? runtimeApi.createStudioEditorCanonicalShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorCanonicalRuntimeAccessors };
});

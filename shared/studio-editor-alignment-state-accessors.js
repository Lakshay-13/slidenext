(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAlignmentStateAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorAlignmentStateAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorAlignmentStateShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'alignmentStateApi')) {
      shellOptions.alignmentStateApi = options.alignmentStateApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorAlignmentStateShellRuntime === 'function'
      ? runtimeApi.createStudioEditorAlignmentStateShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorAlignmentStateAccessors };
});

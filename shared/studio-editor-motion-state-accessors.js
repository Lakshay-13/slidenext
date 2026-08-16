(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorMotionStateAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorMotionStateAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorMotionStateShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'motionStateApi')) {
      shellOptions.motionStateApi = options.motionStateApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorMotionStateShellRuntime === 'function'
      ? runtimeApi.createStudioEditorMotionStateShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorMotionStateAccessors };
});

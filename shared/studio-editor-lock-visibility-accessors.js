(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLockVisibilityAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLockVisibilityAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorLockVisibilityShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'lockVisibilityRuntimeApi')) {
      shellOptions.lockVisibilityRuntimeApi = options.lockVisibilityRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorLockVisibilityShellRuntime === 'function'
      ? runtimeApi.createStudioEditorLockVisibilityShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorLockVisibilityAccessors };
});

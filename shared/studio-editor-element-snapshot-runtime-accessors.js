(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorElementSnapshotRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorElementSnapshotRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorElementSnapshotShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'snapshotControllerApi')) {
      shellOptions.snapshotControllerApi = options.snapshotControllerApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorElementSnapshotShellRuntime === 'function'
      ? runtimeApi.createStudioEditorElementSnapshotShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorElementSnapshotRuntimeAccessors };
});

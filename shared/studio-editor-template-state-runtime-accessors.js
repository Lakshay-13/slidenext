(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTemplateStateRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorTemplateStateRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorTemplateState;

    return {
      createStudioEditorTemplateStateController(runtimeOptions = {}) {
        return runtimeApi
          && typeof runtimeApi.createStudioEditorTemplateStateController === 'function'
          ? runtimeApi.createStudioEditorTemplateStateController(runtimeOptions)
          : null;
      }
    };
  }

  return { createStudioEditorTemplateStateRuntimeAccessors };
});

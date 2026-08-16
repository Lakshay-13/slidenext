(function (root, factory) {
  let defaultEditableTargetAdapter = root && root.SlideNextStudioEditorEditableTargetAdapter;
  if (typeof module === 'object' && module.exports) {
    defaultEditableTargetAdapter = require('./studio-editor-editable-target-adapter.js');
  }
  const api = factory(defaultEditableTargetAdapter);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorEditableTargetAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (defaultEditableTargetAdapter) {
  function resolveAdapter(options) {
    return Object.prototype.hasOwnProperty.call(options, 'editableTargetAdapter')
      ? options.editableTargetAdapter
      : defaultEditableTargetAdapter;
  }

  function createStudioEditorEditableTargetAccessors(options = {}) {
    const editableTargetAdapter = resolveAdapter(options);
    const domApi = options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
    const getDomOptions = typeof options.getDomOptions === 'function'
      ? options.getDomOptions
      : (overrides = {}) => overrides;

    return {
      resolveEditableTarget(node, options = {}) {
        return editableTargetAdapter
          && typeof editableTargetAdapter.resolveStudioEditorEditableTarget === 'function'
          ? editableTargetAdapter.resolveStudioEditorEditableTarget(node, {
              domApi,
              domOptions: getDomOptions(options)
            })
          : null;
      }
    };
  }

  return { createStudioEditorEditableTargetAccessors };
});

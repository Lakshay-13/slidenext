(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorClipboardAccessors(options = {}) {
    const controller = options.controller || null;
    const getFallbackClipboard = typeof options.getFallbackClipboard === 'function'
      ? options.getFallbackClipboard
      : () => null;

    return {
      controller,
      getClipboard: () => controller
        && typeof controller.getClipboard === 'function'
        ? controller.getClipboard()
        : getFallbackClipboard()
    };
  }

  function createStudioEditorClipboardGlobalApi(options = {}) {
    const accessors = options.accessors || createStudioEditorClipboardAccessors(options);

    return {
      getStudioEditorClipboard: () => accessors.getClipboard()
    };
  }

  return {
    createStudioEditorClipboardAccessors,
    createStudioEditorClipboardGlobalApi
  };
});

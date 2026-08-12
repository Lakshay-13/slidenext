(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSourceAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorSourceAccessors(options = {}) {
    const controller = options.controller || null;

    function call(methodName, fallback, ...args) {
      return controller && typeof controller[methodName] === 'function'
        ? controller[methodName](...args)
        : fallback;
    }

    return {
      controller,
      open: () => call('open', false),
      setMode: (mode = 'html') => call('setMode', false, mode),
      applySourceHtml: (sourceHtml = '') => call(
        'applySourceHtml',
        { success: false, error: 'Source editor is unavailable' },
        sourceHtml
      ),
      apply: () => call('apply', false),
      close: () => call('close', false),
      reset: () => call('reset', false),
      resetPresentation: () => call('resetPresentation', false)
    };
  }

  return { createStudioEditorSourceAccessors };
});

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
    const copySelectedElements = typeof options.copySelectedElements === 'function'
      ? options.copySelectedElements
      : null;
    const pasteClipboardElements = typeof options.pasteClipboardElements === 'function'
      ? options.pasteClipboardElements
      : null;

    function callAction(action, fallback, ...args) {
      return typeof action === 'function' ? action(...args) : fallback;
    }

    return {
      controller,
      getClipboard: () => controller
        && typeof controller.getClipboard === 'function'
        ? controller.getClipboard()
        : getFallbackClipboard(),
      copySelectedElements: (...args) => callAction(copySelectedElements, false, ...args),
      pasteClipboardElements: (...args) => callAction(pasteClipboardElements, false, ...args),
      bindStudioEditorClipboardControls: (options = {}) => {
        const documentRef = options.documentRef || (typeof document !== 'undefined' ? document : null);
        if (!documentRef || typeof documentRef.getElementById !== 'function') return {};

        const bindings = {};
        const buttonHandlers = [
          ['copySelectionBtn', () => callAction(copySelectedElements, false)],
          ['pasteClipboardBtn', () => callAction(pasteClipboardElements, false)],
          ['slidePasteClipboardBtn', () => callAction(pasteClipboardElements, false)]
        ];
        buttonHandlers.forEach(([id, handler]) => {
          const button = documentRef.getElementById(id);
          if (!button || typeof button.addEventListener !== 'function') {
            bindings[id] = false;
            return;
          }
          button.addEventListener('click', handler);
          bindings[id] = true;
        });
        return bindings;
      }
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

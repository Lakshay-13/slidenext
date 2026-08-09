(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorShellController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorShellController(options = {}) {
    const documentRef = options.documentRef || null;
    const schedule = typeof options.schedule === 'function'
      ? options.schedule
      : (callback, delayMs) => setTimeout(callback, delayMs);

    function open(editor, iframe, url = '') {
      if (!editor || !iframe) return false;

      editor.classList.remove('hidden');
      void editor.offsetWidth;
      iframe.src = url;
      editor.classList.add('active');
      editor.style.opacity = '1';
      editor.style.pointerEvents = 'auto';
      if (documentRef && documentRef.body && documentRef.body.style) {
        documentRef.body.style.overflow = 'hidden';
      }
      return true;
    }

    function close(editor, iframe) {
      if (!editor || !iframe) return false;

      iframe.onload = null;
      iframe.src = '';
      editor.classList.remove('active');
      editor.style.opacity = '0';
      editor.style.pointerEvents = 'none';
      if (documentRef && documentRef.body && documentRef.body.style) {
        documentRef.body.style.overflow = '';
      }

      schedule(() => {
        if (!editor.classList.contains('active')) {
          editor.classList.add('hidden');
        }
      }, 300);
      return true;
    }

    return { open, close };
  }

  return {
    createStudioEditorShellController
  };
});

(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorShellController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorShellController(options = {}) {
    const documentRef = options.documentRef || null;
    const launchSourceApi = options.launchSourceApi
      || (root && root.SlideNextStudioEditorLaunchSource)
      || null;
    const schedule = typeof options.schedule === 'function'
      ? options.schedule
      : (callback, delayMs) => setTimeout(callback, delayMs);

    function applyFrameSource(iframe, url, source) {
      if (launchSourceApi
        && typeof launchSourceApi.applyStudioEditorLaunchSource === 'function') {
        return launchSourceApi.applyStudioEditorLaunchSource(iframe, url, source);
      }
      if (!iframe) return false;
      const srcdoc = source && typeof source.srcdoc === 'string'
        ? source.srcdoc
        : '';
      if (srcdoc) {
        iframe.srcdoc = srcdoc;
        if (typeof iframe.removeAttribute === 'function') {
          iframe.removeAttribute('src');
        } else {
          iframe.src = '';
        }
      } else {
        iframe.srcdoc = '';
        iframe.src = url;
      }
      return true;
    }

    function open(editor, iframe, url = '', source = {}) {
      if (!editor || !iframe) return false;

      editor.classList.remove('hidden');
      void editor.offsetWidth;
      applyFrameSource(iframe, url, source);
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
      iframe.srcdoc = '';
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

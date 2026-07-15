(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGridSnapView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function renderStudioGridSnapState(options = {}) {
    const documentRef = options.documentRef;
    const button = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('toggleGridSnapBtn')
      : null;
    if (!button) return false;

    const isEnabled = !!options.isEnabled;
    button.textContent = `Grid Snap: ${isEnabled ? 'On' : 'Off'}`;
    button.setAttribute('aria-pressed', String(isEnabled));
    return true;
  }

  function syncStudioGridSnapState(options = {}) {
    return renderStudioGridSnapState({
      documentRef: options.documentRef,
      isEnabled: options.isEnabled
    });
  }

  return { renderStudioGridSnapState, syncStudioGridSnapState };
});

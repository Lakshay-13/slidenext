(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorFrameAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorFrameAccessors(options = {}) {
    const documentRef = options.documentRef || null;
    const frameId = typeof options.frameId === 'string' && options.frameId.trim()
      ? options.frameId.trim()
      : 'studioFrame';
    const domOptions = options.domOptions && typeof options.domOptions === 'object'
      ? { ...options.domOptions }
      : {};
    const overlayOptions = options.overlayOptions && typeof options.overlayOptions === 'object'
      ? { ...options.overlayOptions }
      : {};

    function getFrame() {
      return documentRef && typeof documentRef.getElementById === 'function'
        ? documentRef.getElementById(frameId)
        : null;
    }

    function getDocument() {
      const frame = getFrame();
      return frame
        ? frame.contentDocument || (frame.contentWindow && frame.contentWindow.document) || null
        : null;
    }

    function getWindow() {
      const frame = getFrame();
      return frame ? frame.contentWindow || null : null;
    }

    return {
      getFrame,
      getDocument,
      getWindow,
      getDomOptions: (overrides = {}) => ({
        ...domOptions,
        ...(overrides && typeof overrides === 'object' ? overrides : {})
      }),
      getOverlayOptions: (overrides = {}) => ({
        ...overlayOptions,
        ...(overrides && typeof overrides === 'object' ? overrides : {})
      })
    };
  }

  function createStudioEditorFrameGlobalApi(options = {}) {
    const accessors = options.accessors || createStudioEditorFrameAccessors(options);

    return {
      getStudioFrame: () => accessors.getFrame(),
      getIframeDoc: () => accessors.getDocument(),
      getIframeWindow: () => accessors.getWindow(),
      getEditorDomOptions: (overrides = {}) => accessors.getDomOptions(overrides),
      getEditorOverlayOptions: (overrides = {}) => accessors.getOverlayOptions(overrides)
    };
  }

  return {
    createStudioEditorFrameAccessors,
    createStudioEditorFrameGlobalApi
  };
});

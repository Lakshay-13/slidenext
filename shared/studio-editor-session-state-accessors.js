(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSessionStateAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorSessionStateAccessors(options = {}) {
    const bridge = options.bridge || null;

    return {
      bridge,
      getPresentationUrl: () => bridge
        && typeof bridge.getPresentationUrl === 'function'
        ? bridge.getPresentationUrl()
        : '',
      setPresentationUrl: (nextUrl) => bridge
        && typeof bridge.setPresentationUrl === 'function'
        ? bridge.setPresentationUrl(nextUrl)
        : '',
      getSessionToken: () => bridge
        && typeof bridge.getSessionToken === 'function'
        ? bridge.getSessionToken()
        : 0,
      advanceSessionToken: () => bridge
        && typeof bridge.advanceSessionToken === 'function'
        ? bridge.advanceSessionToken()
        : 0
    };
  }

  function createStudioEditorSessionStateGlobalApi(options = {}) {
    const accessors = options.accessors || createStudioEditorSessionStateAccessors(options);

    return {
      getStudioCurrentPresentationUrl: () => accessors.getPresentationUrl(),
      setStudioCurrentPresentationUrl: (nextUrl) => accessors.setPresentationUrl(nextUrl),
      getStudioEditorSessionToken: () => accessors.getSessionToken(),
      advanceStudioEditorSessionToken: () => accessors.advanceSessionToken()
    };
  }

  return {
    createStudioEditorSessionStateAccessors,
    createStudioEditorSessionStateGlobalApi
  };
});

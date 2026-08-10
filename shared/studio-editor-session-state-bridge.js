(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSessionStateBridge = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSessionStateBridge(options = {}) {
    const runtimeApi = options.runtimeApi
      || (root && root.SlideNextStudioEditorSessionStateRuntime)
      || null;
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorSessionState)
      || null;
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorSessionStateRuntime === 'function'
      ? runtimeApi.createStudioEditorSessionStateRuntime({ controllerApi })
      : null;
    const sessionStateController = runtime
      ? runtime.sessionStateController
      : null;

    function read(methodName, fallback) {
      return sessionStateController
        && typeof sessionStateController[methodName] === 'function'
        ? sessionStateController[methodName]()
        : fallback;
    }

    function write(methodName, value, fallback) {
      return sessionStateController
        && typeof sessionStateController[methodName] === 'function'
        ? sessionStateController[methodName](value)
        : fallback;
    }

    return {
      runtime,
      sessionStateController,
      getPresentationUrl: () => read('getPresentationUrl', ''),
      setPresentationUrl: (nextUrl) => write('setPresentationUrl', nextUrl, ''),
      getSessionToken: () => read('getSessionToken', 0),
      advanceSessionToken: () => read('advanceSessionToken', 0)
    };
  }

  return {
    createStudioEditorSessionStateBridge
  };
});

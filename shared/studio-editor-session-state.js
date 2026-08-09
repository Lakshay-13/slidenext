(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSessionState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveController(options, key, globalName, factoryName) {
    if (options[key] && typeof options[key] === 'object') {
      return options[key];
    }

    const controllerApi = root && root[globalName];
    if (!controllerApi || typeof controllerApi[factoryName] !== 'function') {
      return null;
    }

    return controllerApi[factoryName]({});
  }

  function createStudioEditorSessionStateController(options = {}) {
    const presentationUrlController = resolveController(
      options,
      'presentationUrlController',
      'SlideNextStudioEditorPresentationUrlStateController',
      'createStudioEditorPresentationUrlStateController'
    );
    const sessionTokenController = resolveController(
      options,
      'sessionTokenController',
      'SlideNextStudioEditorSessionTokenStateController',
      'createStudioEditorSessionTokenStateController'
    );

    function getPresentationUrl() {
      return presentationUrlController
        && typeof presentationUrlController.getPresentationUrl === 'function'
        ? presentationUrlController.getPresentationUrl()
        : '';
    }

    function setPresentationUrl(nextUrl) {
      return presentationUrlController
        && typeof presentationUrlController.setPresentationUrl === 'function'
        ? presentationUrlController.setPresentationUrl(nextUrl)
        : '';
    }

    function getSessionToken() {
      return sessionTokenController
        && typeof sessionTokenController.getSessionToken === 'function'
        ? sessionTokenController.getSessionToken()
        : 0;
    }

    function advanceSessionToken() {
      return sessionTokenController
        && typeof sessionTokenController.advanceSessionToken === 'function'
        ? sessionTokenController.advanceSessionToken()
        : 0;
    }

    function reset() {
      if (presentationUrlController && typeof presentationUrlController.reset === 'function') {
        presentationUrlController.reset();
      }
      if (sessionTokenController && typeof sessionTokenController.reset === 'function') {
        sessionTokenController.reset();
      }
      return {
        presentationUrl: getPresentationUrl(),
        sessionToken: getSessionToken()
      };
    }

    return {
      getPresentationUrl,
      setPresentationUrl,
      getSessionToken,
      advanceSessionToken,
      reset
    };
  }

  return {
    createStudioEditorSessionStateController
  };
});

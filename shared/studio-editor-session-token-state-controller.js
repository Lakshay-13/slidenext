(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSessionTokenStateController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeSessionToken(value, fallback = 0) {
    return Number.isInteger(value) ? value : fallback;
  }

  function createStudioEditorSessionTokenStateController(options = {}) {
    let sessionToken = normalizeSessionToken(options.sessionToken);

    function getSessionToken() {
      return sessionToken;
    }

    function setSessionToken(nextToken) {
      sessionToken = normalizeSessionToken(nextToken, sessionToken);
      return sessionToken;
    }

    function advanceSessionToken() {
      sessionToken += 1;
      return sessionToken;
    }

    function reset() {
      sessionToken = 0;
      return sessionToken;
    }

    return {
      getSessionToken,
      setSessionToken,
      advanceSessionToken,
      reset
    };
  }

  return {
    normalizeSessionToken,
    createStudioEditorSessionTokenStateController
  };
});

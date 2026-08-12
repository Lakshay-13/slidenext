(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSaveButtonStateAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorSaveButtonStateAccessors(options = {}) {
    const bridge = options.bridge || null;

    return {
      bridge,
      getState: () => bridge
        && typeof bridge.getState === 'function'
        ? bridge.getState()
        : 'idle',
      setState: (nextState) => bridge
        && typeof bridge.setState === 'function'
        ? bridge.setState(nextState)
        : false
    };
  }

  return { createStudioEditorSaveButtonStateAccessors };
});

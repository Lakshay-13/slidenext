(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorShellStateRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(api, globalName) {
    return api || (root && root[globalName]) || null;
  }

  function createBridge(api, factoryName, options) {
    return api && typeof api[factoryName] === 'function'
      ? api[factoryName](options)
      : null;
  }

  function createStudioEditorShellStateRuntime(options = {}) {
    const sessionStateBridge = createBridge(
      resolveApi(options.sessionStateBridgeApi, 'SlideNextStudioEditorSessionStateBridge'),
      'createStudioEditorSessionStateBridge',
      {
        runtimeApi: resolveApi(options.sessionStateRuntimeApi, 'SlideNextStudioEditorSessionStateRuntime'),
        controllerApi: resolveApi(options.sessionStateControllerApi, 'SlideNextStudioEditorSessionState')
      }
    );
    const sessionStateAccessors = createBridge(
      resolveApi(options.sessionStateAccessorsApi, 'SlideNextStudioEditorSessionStateAccessors'),
      'createStudioEditorSessionStateAccessors',
      { bridge: sessionStateBridge }
    );
    const stateBridge = createBridge(
      resolveApi(options.stateBridgeApi, 'SlideNextStudioEditorStateBridge'),
      'createStudioEditorStateBridge',
      {
        runtimeApi: resolveApi(options.stateRuntimeApi, 'SlideNextStudioEditorStateRuntime'),
        presentationMetadataApi: resolveApi(
          options.presentationMetadataApi,
          'SlideNextStudioEditorPresentationMetadataStateStore'
        ),
        presentationLabelApi: resolveApi(
          options.presentationLabelApi,
          'SlideNextStudioEditorPresentationLabelStateStore'
        ),
        slideIndexApi: resolveApi(options.slideIndexApi, 'SlideNextStudioEditorSlideIndexStore'),
        selectionApi: resolveApi(options.selectionApi, 'SlideNextStudioEditorSelectionStateStore'),
        getElementId: options.getElementId
      }
    );
    const stateAccessors = createBridge(
      resolveApi(options.stateAccessorsApi, 'SlideNextStudioEditorStateAccessors'),
      'createStudioEditorStateAccessors',
      {
        bridge: stateBridge,
        getDocument: options.getDocument,
        getActiveSlide: options.getActiveSlide,
        getElementById: options.getElementById
      }
    );

    return {
      sessionStateBridge,
      sessionStateAccessors,
      stateBridge,
      stateAccessors
    };
  }

  return {
    createStudioEditorShellStateRuntime
  };
});

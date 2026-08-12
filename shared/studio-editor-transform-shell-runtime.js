(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTransformShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorTransformShellRuntime(options = {}) {
    const transformRuntimeApi = resolveApi(
      options,
      'transformRuntimeApi',
      'SlideNextStudioEditorTransformRuntime'
    );
    if (!transformRuntimeApi
      || typeof transformRuntimeApi.createStudioEditorTransformRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.transformRuntimeApi;
    runtimeOptions.controllerApi = resolveApi(
      options,
      'controllerApi',
      'SlideNextStudioEditorTransformController'
    );
    runtimeOptions.transformApi = resolveApi(
      options,
      'transformApi',
      'SlideNextStudioEditorTransform'
    );
    runtimeOptions.canonicalTransformApi = resolveApi(
      options,
      'canonicalTransformApi',
      'SlideNextStudioEditorCanonicalTransform'
    );
    runtimeOptions.canonicalDeckApi = resolveApi(
      options,
      'canonicalDeckApi',
      'SlideNextCanonicalDeck'
    );
    runtimeOptions.transactionApi = resolveApi(
      options,
      'transactionApi',
      'SlideNextStudioEditorTransaction'
    );
    runtimeOptions.domApi = resolveApi(
      options,
      'domApi',
      'SlideNextStudioEditorDom'
    );
    runtimeOptions.interactionOptionsApi = resolveApi(
      options,
      'interactionOptionsApi',
      'SlideNextStudioEditorInteractionOptions'
    );
    runtimeOptions.interactionsApi = resolveApi(
      options,
      'interactionsApi',
      'SlideNextStudioEditorInteractions'
    );
    runtimeOptions.eventsApi = resolveApi(
      options,
      'eventsApi',
      'SlideNextStudioEditorEvents'
    );
    runtimeOptions.selectionBoundsApi = resolveApi(
      options,
      'selectionBoundsApi',
      'SlideNextStudioEditorSelectionBounds'
    );

    return transformRuntimeApi.createStudioEditorTransformRuntime(runtimeOptions);
  }

  return {
    createStudioEditorTransformShellRuntime
  };
});

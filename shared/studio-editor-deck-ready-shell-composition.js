(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorDeckReadyShellComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function resolveApi(options, optionName, globalName) {
    if (hasOwn(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorDeckReadyShellComposition(options = {}) {
    const runtimeAccessorsApi = resolveApi(
      options,
      'runtimeAccessorsApi',
      'SlideNextStudioEditorDeckReadyRuntimeAccessors'
    );
    const runtimeAccessors = runtimeAccessorsApi
      && typeof runtimeAccessorsApi.createStudioEditorDeckReadyRuntimeAccessors === 'function'
      ? runtimeAccessorsApi.createStudioEditorDeckReadyRuntimeAccessors({
          runtimeApi: resolveApi(
            options,
            'runtimeApi',
            'SlideNextStudioEditorDeckReadyShellRuntime'
          ),
          deckReadyRuntimeApi: resolveApi(
            options,
            'deckReadyRuntimeApi',
            'SlideNextStudioEditorDeckReadyRuntime'
          ),
          runtimeOptions: {
            controllerApi: resolveApi(
              options,
              'controllerApi',
              'SlideNextStudioEditorDeckReadyController'
            ),
            deckReadyApi: resolveApi(
              options,
              'deckReadyApi',
              'SlideNextStudioDeckReady'
            ),
            getDocumentRef: options.getDocumentRef,
            getDocument: options.getDocument,
            getPresentationUrl: options.getPresentationUrl,
            getPersistedDeckState: options.getPersistedDeckState,
            resolvePersistedDeckStateWithContent:
              options.resolvePersistedDeckStateWithContent,
            getStoredCanonicalDeck: options.getStoredCanonicalDeck,
            getSaveButtonState: options.getSaveButtonState
          }
        })
      : null;
    const runtime = runtimeAccessors ? runtimeAccessors.runtime : null;
    const deckReadyController = runtime ? runtime.deckReadyController : null;

    return {
      runtimeAccessors,
      runtime,
      deckReadyController
    };
  }

  return {
    createStudioEditorDeckReadyShellComposition
  };
});

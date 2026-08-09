(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorStateRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(api, globalName) {
    return api || (root && root[globalName]) || null;
  }

  function createStore(api, factoryName, options = {}) {
    return api && typeof api[factoryName] === 'function'
      ? api[factoryName](options)
      : null;
  }

  function createStudioEditorStateRuntime(options = {}) {
    const presentationMetadataStateStore = createStore(
      resolveApi(options.presentationMetadataApi, 'SlideNextStudioEditorPresentationMetadataStateStore'),
      'createStudioEditorPresentationMetadataStateStore'
    );
    const presentationLabelStateStore = createStore(
      resolveApi(options.presentationLabelApi, 'SlideNextStudioEditorPresentationLabelStateStore'),
      'createStudioEditorPresentationLabelStateStore'
    );
    const slideIndexStore = createStore(
      resolveApi(options.slideIndexApi, 'SlideNextStudioEditorSlideIndexStore'),
      'createStudioEditorSlideIndexStore',
      { initialSlideIndex: 0 }
    );
    const selectionStateStore = createStore(
      resolveApi(options.selectionApi, 'SlideNextStudioEditorSelectionStateStore'),
      'createStudioEditorSelectionStateStore'
    );

    return {
      presentationMetadataStateStore,
      presentationLabelStateStore,
      slideIndexStore,
      selectionStateStore
    };
  }

  return {
    createStudioEditorStateRuntime
  };
});

(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorStateBridge = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorStateBridge(options = {}) {
    const runtimeApi = options.runtimeApi
      || (root && root.SlideNextStudioEditorStateRuntime)
      || null;
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorStateRuntime === 'function'
      ? runtimeApi.createStudioEditorStateRuntime({
          presentationMetadataApi: options.presentationMetadataApi
            || (root && root.SlideNextStudioEditorPresentationMetadataStateStore)
            || null,
          presentationLabelApi: options.presentationLabelApi
            || (root && root.SlideNextStudioEditorPresentationLabelStateStore)
            || null,
          slideIndexApi: options.slideIndexApi
            || (root && root.SlideNextStudioEditorSlideIndexStore)
            || null,
          selectionApi: options.selectionApi
            || (root && root.SlideNextStudioEditorSelectionStateStore)
            || null,
          getElementId: options.getElementId
        })
      : null;
    const presentationMetadataStateStore = runtime
      ? runtime.presentationMetadataStateStore
      : null;
    const presentationLabelStateStore = runtime
      ? runtime.presentationLabelStateStore
      : null;
    const slideIndexStore = runtime
      ? runtime.slideIndexStore
      : null;
    const selectionStateStore = runtime
      ? runtime.selectionStateStore
      : null;

    function read(store, methodName, fallback) {
      return store
        && typeof store[methodName] === 'function'
        ? store[methodName]()
        : fallback;
    }

    function write(store, methodName, value, fallback) {
      return store
        && typeof store[methodName] === 'function'
        ? store[methodName](value)
        : fallback;
    }

    return {
      runtime,
      presentationMetadataStateStore,
      presentationLabelStateStore,
      slideIndexStore,
      selectionStateStore,
      getPresentationMetadata: () => read(presentationMetadataStateStore, 'getPresentationMetadata', null),
      setPresentationMetadata: (nextMetadata) => write(
        presentationMetadataStateStore,
        'setPresentationMetadata',
        nextMetadata,
        null
      ),
      getTitle: () => read(presentationLabelStateStore, 'getTitle', ''),
      setTitle: (nextTitle) => write(presentationLabelStateStore, 'setTitle', nextTitle, false),
      getCategory: () => read(presentationLabelStateStore, 'getCategory', ''),
      setCategory: (nextCategory) => write(presentationLabelStateStore, 'setCategory', nextCategory, false),
      getSlideIndex: () => read(slideIndexStore, 'getSlideIndex', 0),
      setSlideIndex: (nextValue) => write(slideIndexStore, 'setSlideIndex', nextValue, false),
      getSelectedElements: () => read(selectionStateStore, 'getSelectedElements', []),
      getSelectedElement: () => read(selectionStateStore, 'getSelectedElement', null),
      getSelectedElementIds: () => read(selectionStateStore, 'getSelectedElementIds', []),
      setSelectionState: (nextState) => write(selectionStateStore, 'setState', nextState, false),
      clearSelectionState: () => read(selectionStateStore, 'clear', false),
      getPreserveSelectionOnNextActiveSlideSync: () => read(
        selectionStateStore,
        'getPreserveSelectionOnNextActiveSlideSync',
        false
      ),
      setPreserveSelectionOnNextActiveSlideSync: (nextValue) => write(
        selectionStateStore,
        'setPreserveSelectionOnNextActiveSlideSync',
        nextValue,
        false
      )
    };
  }

  return {
    createStudioEditorStateBridge
  };
});

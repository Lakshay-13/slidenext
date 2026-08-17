(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorDeckSnapshotShellComposition = api;
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

  function createStudioEditorDeckSnapshotShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorDeckSnapshotAccessors'
    );
    const snapshotApi = resolveApi(
      options,
      'snapshotApi',
      'SlideNextStudioDeckSnapshot'
    );
    const deckSnapshotAccessors = accessorsApi
      && typeof accessorsApi.createStudioEditorDeckSnapshotAccessors === 'function'
      ? accessorsApi.createStudioEditorDeckSnapshotAccessors({
          controller: options.controller,
          snapshotApi,
          getDocument: options.getDocument,
          createDeckViewStateOptions: options.createDeckViewStateOptions,
          resolveCanonicalDeckViewState: options.resolveCanonicalDeckViewState,
          buildCanonicalDeck: options.buildCanonicalDeck,
          getPendingCanonicalDeck: options.getPendingCanonicalDeck,
          isCanonicalDeck: options.isCanonicalDeck,
          resolveFallbackActiveSlideId: options.resolveFallbackActiveSlideId,
          resolveLiveActiveSlide: options.resolveLiveActiveSlide,
          getActiveSlideId: options.getActiveSlideId,
          getSlideById: options.getSlideById,
          buildSlideLayerSnapshot: options.buildSlideLayerSnapshot,
          getSlides: options.getSlides,
          getActiveSlide: options.getActiveSlide,
          getSlideId: options.getSlideId,
          getSlideEditableElements: options.getSlideEditableElements,
          getNormalizedSlideLayerOrder: options.getNormalizedSlideLayerOrder,
          buildElementSnapshot: options.buildElementSnapshot,
          buildDomSnapshot: options.buildDomSnapshot
        })
      : null;
    const snapshotUiApi = resolveApi(
      options,
      'snapshotUiApi',
      'SlideNextStudioEditorSnapshotUi'
    );
    const snapshotUi = snapshotUiApi
      && typeof snapshotUiApi.createStudioEditorSnapshotUi === 'function'
      ? snapshotUiApi.createStudioEditorSnapshotUi({
          deckSnapshotApi: snapshotApi,
          deckSnapshotAccessors,
          elementSnapshotAccessors: options.elementSnapshotAccessors,
          buildEditorDeckSnapshot: options.buildEditorDeckSnapshot,
          getCurrentSlideIndex: options.getCurrentSlideIndex
        })
      : null;

    return {
      deckSnapshotAccessors,
      snapshotUi
    };
  }

  return {
    createStudioEditorDeckSnapshotShellComposition
  };
});

(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSnapshotUi = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveDependency(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorSnapshotUi(options = {}) {
    const deckSnapshotApi = resolveDependency(options, 'deckSnapshotApi', 'SlideNextStudioDeckSnapshot');
    const deckSnapshotAccessors = options.deckSnapshotAccessors || null;
    const elementSnapshotAccessors = options.elementSnapshotAccessors || null;
    const buildEditorDeckSnapshot = typeof options.buildEditorDeckSnapshot === 'function'
      ? options.buildEditorDeckSnapshot
      : () => null;
    const getCurrentSlideIndex = typeof options.getCurrentSlideIndex === 'function'
      ? options.getCurrentSlideIndex
      : () => 0;

    function getActiveSlideIndex(doc) {
      const resolveActiveSlideIndex = deckSnapshotApi
        && typeof deckSnapshotApi.resolveStudioActiveSlideIndex === 'function'
        ? deckSnapshotApi.resolveStudioActiveSlideIndex
        : null;
      if (!resolveActiveSlideIndex) return getCurrentSlideIndex();
      return resolveActiveSlideIndex(
        buildEditorDeckSnapshot(doc),
        getCurrentSlideIndex()
      );
    }

    function getLayerDisplayMetadata(element) {
      return elementSnapshotAccessors
        && typeof elementSnapshotAccessors.getDisplayMetadata === 'function'
        ? elementSnapshotAccessors.getDisplayMetadata(element)
        : null;
    }

    function buildElementSnapshot(element) {
      return elementSnapshotAccessors
        && typeof elementSnapshotAccessors.build === 'function'
        ? elementSnapshotAccessors.build(element)
        : null;
    }

    function buildLayerSnapshot(elements) {
      return elementSnapshotAccessors
        && typeof elementSnapshotAccessors.buildLayer === 'function'
        ? elementSnapshotAccessors.buildLayer(elements)
        : [];
    }

    return {
      getActiveSlideIndex,
      getLayerDisplayMetadata,
      buildElementSnapshot,
      buildLayerSnapshot,
      deckSnapshotAccessors
    };
  }

  return {
    createStudioEditorSnapshotUi
  };
});

(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionOverlayComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSelectionOverlayComposition(options = {}) {
    const accessorsApi = Object.prototype.hasOwnProperty.call(options, 'accessorsApi')
      ? options.accessorsApi
      : root && root.SlideNextStudioEditorSelectionOverlayAccessors;
    const accessors = accessorsApi
      && typeof accessorsApi.createStudioEditorSelectionOverlayAccessors === 'function'
      ? accessorsApi.createStudioEditorSelectionOverlayAccessors(options)
      : null;
    const synchronizer = accessors
      && typeof accessors.sync === 'function'
      ? accessors.sync
      : null;

    return {
      accessors,
      synchronizer,
      sync: (doc) => typeof synchronizer === 'function'
        ? synchronizer(doc)
        : false
    };
  }

  return {
    createStudioEditorSelectionOverlayComposition
  };
});

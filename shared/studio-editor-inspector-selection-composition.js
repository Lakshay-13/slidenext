(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorInspectorSelectionComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorInspectorSelectionComposition(options = {}) {
    const accessorsApi = Object.prototype.hasOwnProperty.call(options, 'accessorsApi')
      ? options.accessorsApi
      : root && root.SlideNextStudioEditorInspectorSelectionAccessors;
    const accessors = accessorsApi
      && typeof accessorsApi.createStudioEditorInspectorSelectionAccessors === 'function'
      ? accessorsApi.createStudioEditorInspectorSelectionAccessors(options)
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
    createStudioEditorInspectorSelectionComposition
  };
});

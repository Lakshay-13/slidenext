(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorDeckSnapshotController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorDeckSnapshotController(options = {}) {
    const hasOption = (name) => Object.prototype.hasOwnProperty.call(options, name);
    const resolveDependency = (name, globalName) => hasOption(name)
      ? options[name]
      : (root && root[globalName]) || null;
    const snapshotApi = resolveDependency('snapshotApi', 'SlideNextStudioDeckSnapshot');
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const createDeckViewStateOptions = typeof options.createDeckViewStateOptions === 'function'
      ? options.createDeckViewStateOptions
      : () => ({});
    const resolveCanonicalDeckViewState = typeof options.resolveCanonicalDeckViewState === 'function'
      ? options.resolveCanonicalDeckViewState
      : () => null;
    const resolveFallbackActiveSlideId = typeof options.resolveFallbackActiveSlideId === 'function'
      ? options.resolveFallbackActiveSlideId
      : () => '';
    const resolveLiveActiveSlide = typeof options.resolveLiveActiveSlide === 'function'
      ? options.resolveLiveActiveSlide
      : () => null;
    const buildDomSnapshot = typeof options.buildDomSnapshot === 'function'
      ? options.buildDomSnapshot
      : () => null;
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const getSlideById = typeof options.getSlideById === 'function'
      ? options.getSlideById
      : () => null;
    const buildSlideLayerSnapshot = typeof options.buildSlideLayerSnapshot === 'function'
      ? options.buildSlideLayerSnapshot
      : () => null;

    function build(doc = getDocument(), buildOptions = {}) {
      const createDeckSnapshotBuilder = snapshotApi
        && typeof snapshotApi.createStudioDeckSnapshotBuilder === 'function'
        ? snapshotApi.createStudioDeckSnapshotBuilder
        : null;
      if (!createDeckSnapshotBuilder) return null;

      const buildDeckSnapshot = createDeckSnapshotBuilder({
        getDocument,
        createDeckViewStateOptions,
        resolveCanonicalDeckViewState,
        resolveFallbackActiveSlideId,
        resolveLiveActiveSlide,
        buildDomSnapshot,
        getActiveSlideId,
        getSlideById,
        buildSlideLayerSnapshot
      });
      return typeof buildDeckSnapshot === 'function'
        ? buildDeckSnapshot(doc, buildOptions)
        : null;
    }

    return {
      build,
      buildDeckSnapshot: build
    };
  }

  return {
    createStudioEditorDeckSnapshotController
  };
});

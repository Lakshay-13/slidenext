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
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
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
    const buildDomSnapshotOverride = typeof options.buildDomSnapshot === 'function'
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
    const getSlides = typeof options.getSlides === 'function' ? options.getSlides : () => [];
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getSlideId = typeof options.getSlideId === 'function' ? options.getSlideId : () => '';
    const getSlideEditableElements = typeof options.getSlideEditableElements === 'function'
      ? options.getSlideEditableElements
      : () => [];
    const getNormalizedSlideLayerOrder = typeof options.getNormalizedSlideLayerOrder === 'function'
      ? options.getNormalizedSlideLayerOrder
      : () => [];
    const buildElementSnapshot = typeof options.buildElementSnapshot === 'function'
      ? options.buildElementSnapshot
      : () => null;

    function buildFromDom(doc = getDocument(), buildOptions = {}) {
      const buildSnapshotFromDom = snapshotApi
        && typeof snapshotApi.buildStudioDeckSnapshotFromDom === 'function'
        ? snapshotApi.buildStudioDeckSnapshotFromDom
        : null;
      if (!buildSnapshotFromDom) return null;

      return buildSnapshotFromDom(doc, {
        includeLayers: !!buildOptions.includeLayers,
        getSlides,
        getActiveSlide,
        getSlideId,
        getSlideEditableElements,
        getNormalizedSlideLayerOrder,
        elementSnapshotOptions: {
          buildElementSnapshot
        }
      });
    }

    const buildDomSnapshot = typeof options.buildDomSnapshot === 'function'
      ? buildDomSnapshotOverride
      : buildFromDom;

    function build(doc = getDocument(), buildOptions = {}) {
      const createDeckSnapshotBuilder = snapshotApi
        && typeof snapshotApi.createStudioDeckSnapshotBuilder === 'function'
        ? snapshotApi.createStudioDeckSnapshotBuilder
        : null;
      if (!createDeckSnapshotBuilder) return null;

      const buildDeckSnapshot = createDeckSnapshotBuilder({
        getDocument,
        buildCanonicalDeck,
        getPendingCanonicalDeck,
        ...(isCanonicalDeck ? { isCanonicalDeck } : {}),
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
      buildFromDom,
      buildDeckSnapshot: build
    };
  }

  return {
    createStudioEditorDeckSnapshotController
  };
});

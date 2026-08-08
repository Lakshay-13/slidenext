(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalLayout = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function buildStudioCanonicalLayoutBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;

    if (!canonicalDeckApi) {
      return null;
    }
    const readCanonicalDeckBaseline = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader({
          getCanonicalDeckBaseline,
          isCanonicalDeck: typeof canonicalDeckApi.isCanonicalDeck === 'function'
            ? canonicalDeckApi.isCanonicalDeck
            : null,
          buildCanonicalDeckBaseline: buildCanonicalDeck
        })
      : (sourceDocument) => {
          if (getCanonicalDeckBaseline) {
            try {
              const liveCanonicalDeck = getCanonicalDeckBaseline(sourceDocument);
              if (liveCanonicalDeck
                && (typeof canonicalDeckApi.isCanonicalDeck !== 'function'
                  || canonicalDeckApi.isCanonicalDeck(liveCanonicalDeck))) {
                return liveCanonicalDeck;
              }
            } catch (err) {
              // Fall through to the document rebuild path.
            }
          }
          if (!buildCanonicalDeck) return null;
          return buildCanonicalDeck(sourceDocument);
        };

    return readCanonicalDeckBaseline(options.sourceDocument);
  }

  function buildStudioCanonicalLayoutDeck(layoutUpdates, options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const updateCanonicalNodeLayout = canonicalDeckApi
      && typeof canonicalDeckApi.updateCanonicalNodeLayout === 'function'
      ? canonicalDeckApi.updateCanonicalNodeLayout
      : null;
    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(options, 'canonicalDeckBeforeMutation')
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalLayoutBaseline(options);

    if (!updateCanonicalNodeLayout) {
      return null;
    }

    return updateCanonicalNodeLayout(canonicalDeckBeforeMutation, Array.isArray(layoutUpdates) ? layoutUpdates : []);
  }

  function buildStudioCanonicalLayoutMutation(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    const nextItems = Array.isArray(options.nextItems) ? options.nextItems : [];
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    if (!canonicalDeckApi || (!buildCanonicalDeck && !buildCanonicalDeckBaseline)) return null;

    const layoutUpdates = nextItems.map((item) => {
      const nodeId = getElementId(item && item.element);
      if (!nodeId || !Number.isFinite(item && item.nextAbsLeft) || !Number.isFinite(item && item.nextAbsTop)) {
        return null;
      }
      return {
        id: nodeId,
        layout: {
          mode: 'absolute',
          x: item.nextAbsLeft,
          y: item.nextAbsTop
        }
      };
    }).filter(Boolean);
    if (layoutUpdates.length === 0) return null;

    const canonicalDeckBeforeMutation = buildStudioCanonicalLayoutBaseline({
      canonicalDeckApi,
      canonicalStateApi,
      buildCanonicalDeck,
      buildCanonicalDeckBaseline,
      getCanonicalDeckBaseline,
      sourceDocument: options.sourceDocument
    });
    return buildStudioCanonicalLayoutDeck(layoutUpdates, {
      canonicalDeckApi,
      canonicalDeckBeforeMutation
    });
  }

  function buildStudioCanonicalLayerOrderMutation(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    const orderedElements = Array.isArray(options.orderedElements) ? options.orderedElements : [];
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const layoutUpdates = orderedElements.map((element) => {
      const elementId = getElementId(element);
      const zIndex = element && element.style ? Number(element.style.zIndex) : NaN;
      return elementId && Number.isFinite(zIndex)
        ? { id: elementId, layout: { zIndex } }
        : null;
    }).filter(Boolean);
    if (layoutUpdates.length === 0) return null;

    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(
      options,
      'canonicalDeckBeforeMutation'
    )
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalLayoutBaseline({
          canonicalDeckApi,
          canonicalStateApi,
          buildCanonicalDeck: options.buildCanonicalDeck,
          buildCanonicalDeckBaseline: options.buildCanonicalDeckBaseline,
          getCanonicalDeckBaseline,
          sourceDocument: options.sourceDocument
        });

    return buildStudioCanonicalLayoutDeck(layoutUpdates, {
      canonicalDeckApi,
      canonicalDeckBeforeMutation
    });
  }

  function createStudioCanonicalLayoutMutationBuilder(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    return (mutationOptions = {}) => buildStudioCanonicalLayoutMutation({
      ...mutationOptions,
      canonicalDeckApi,
      canonicalStateApi,
      buildCanonicalDeck,
      buildCanonicalDeckBaseline,
      getCanonicalDeckBaseline
    });
  }

  function createStudioCanonicalLayerOrderMutationBuilder(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    return (mutationOptions = {}) => buildStudioCanonicalLayerOrderMutation({
      ...mutationOptions,
      canonicalDeckApi,
      canonicalStateApi,
      buildCanonicalDeck,
      buildCanonicalDeckBaseline,
      getCanonicalDeckBaseline
    });
  }

  return {
    buildStudioCanonicalLayoutBaseline,
    buildStudioCanonicalLayoutDeck,
    buildStudioCanonicalLayoutMutation,
    buildStudioCanonicalLayerOrderMutation,
    createStudioCanonicalLayoutMutationBuilder,
    createStudioCanonicalLayerOrderMutationBuilder
  };
});

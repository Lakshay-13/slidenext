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
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
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
    const createCanonicalDeckResolver = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckResolver === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckResolver
      : null;
    const createCanonicalDeckBaselineReader = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader
      : null;
    if (createCanonicalDeckResolver) {
      const resolveCanonicalDeck = createCanonicalDeckResolver({
        getCanonicalDeck: () => null,
        getPendingCanonicalDeck,
        getCanonicalDeckBaseline,
        isCanonicalDeck: typeof canonicalDeckApi.isCanonicalDeck === 'function'
          ? canonicalDeckApi.isCanonicalDeck
          : null,
        buildCanonicalDeckBaseline: buildCanonicalDeck
      });
      return typeof resolveCanonicalDeck === 'function'
        ? resolveCanonicalDeck(options.sourceDocument)
        : null;
    }
    if (createCanonicalDeckBaselineReader) {
      const readCanonicalDeckBaseline = createCanonicalDeckBaselineReader({
        getPendingCanonicalDeck,
        getCanonicalDeckBaseline,
        isCanonicalDeck: typeof canonicalDeckApi.isCanonicalDeck === 'function'
          ? canonicalDeckApi.isCanonicalDeck
          : null,
        buildCanonicalDeckBaseline: buildCanonicalDeck
      });
      return typeof readCanonicalDeckBaseline === 'function'
        ? readCanonicalDeckBaseline(options.sourceDocument)
        : null;
    }

    const isValidCanonicalDeck = (value) => {
      if (!value) return false;
      const validate = typeof canonicalDeckApi.isCanonicalDeck === 'function'
        ? canonicalDeckApi.isCanonicalDeck
        : (candidate) => !!candidate
          && typeof candidate === 'object'
          && !Array.isArray(candidate)
          && Array.isArray(candidate.slides);
      try {
        return validate(value) === true;
      } catch (err) {
        return false;
      }
    };
    const readCanonicalDeckBaseline = (sourceDocument) => {
      if (getPendingCanonicalDeck) {
        try {
          const pendingCanonicalDeck = getPendingCanonicalDeck(sourceDocument);
          if (isValidCanonicalDeck(pendingCanonicalDeck)) return pendingCanonicalDeck;
        } catch (err) {
          // Fall through to the live baseline and document rebuild paths.
        }
      }
      if (getCanonicalDeckBaseline) {
        try {
          const liveCanonicalDeck = getCanonicalDeckBaseline(sourceDocument);
          if (isValidCanonicalDeck(liveCanonicalDeck)) return liveCanonicalDeck;
        } catch (err) {
          // Fall through to the document rebuild path.
        }
      }
      if (!buildCanonicalDeck) return null;
      try {
        const rebuiltCanonicalDeck = buildCanonicalDeck(sourceDocument, {
          preferLiveCanonicalDeck: false
        });
        return isValidCanonicalDeck(rebuiltCanonicalDeck) ? rebuiltCanonicalDeck : null;
      } catch (err) {
        return null;
      }
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

    try {
      return updateCanonicalNodeLayout(
        canonicalDeckBeforeMutation,
        Array.isArray(layoutUpdates) ? layoutUpdates : []
      );
    } catch (err) {
      return null;
    }
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
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    const nextItems = Array.isArray(options.nextItems) ? options.nextItems : [];
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    if (!canonicalDeckApi
      || (!getCanonicalDeckBaseline && !buildCanonicalDeck && !buildCanonicalDeckBaseline)) {
      return null;
    }

    const layoutUpdates = nextItems.map((item) => {
      const nodeId = getElementId(item && item.element);
      if (!nodeId || !Number.isFinite(item && item.nextAbsLeft) || !Number.isFinite(item && item.nextAbsTop)) {
        return null;
      }
      const layout = {
        mode: 'absolute',
        x: item.nextAbsLeft,
        y: item.nextAbsTop
      };
      if (Number.isFinite(item && item.nextWidth)) layout.width = item.nextWidth;
      if (Number.isFinite(item && item.nextHeight)) layout.height = item.nextHeight;
      return {
        id: nodeId,
        layout
      };
    }).filter(Boolean);
    if (layoutUpdates.length === 0) return null;

    const canonicalDeckBeforeMutation = buildStudioCanonicalLayoutBaseline({
      canonicalDeckApi,
      canonicalStateApi,
      buildCanonicalDeck,
      buildCanonicalDeckBaseline,
      getPendingCanonicalDeck,
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
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    const orderedElements = Array.isArray(options.orderedElements) ? options.orderedElements : [];
    const nextOrder = Array.isArray(options.nextOrder) ? options.nextOrder : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const elementsToUpdate = nextOrder || orderedElements;
    const layoutUpdates = elementsToUpdate.map((element, index) => {
      const elementId = getElementId(element);
      const zIndex = nextOrder
        ? index
        : element && element.style
          ? Number(element.style.zIndex)
          : NaN;
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
          getPendingCanonicalDeck,
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

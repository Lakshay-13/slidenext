(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrderController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLayerOrderController(options = {}) {
    const layerOrderApi = options.layerOrderApi
      || (root && root.SlideNextStudioEditorLayerOrder)
      || null;
    const canonicalLayoutApi = options.canonicalLayoutApi
      || (root && root.SlideNextStudioEditorCanonicalLayout)
      || null;
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const getNormalizedSlideLayerOrder = typeof options.getNormalizedSlideLayerOrder === 'function'
      ? options.getNormalizedSlideLayerOrder
      : () => [];
    const isElementLocked = typeof options.isElementLocked === 'function'
      ? options.isElementLocked
      : () => false;
    const assignElementId = typeof options.assignElementId === 'function'
      ? (element) => {
          const assignedId = options.assignElementId(element);
          if (assignedId) return assignedId;
          return element && element.dataset && element.dataset.editorId;
        }
      : (element) => element && element.dataset && element.dataset.editorId;
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
    const applyLayerOrderMutation = typeof options.applyLayerOrderMutation === 'function'
      ? options.applyLayerOrderMutation
      : () => ({ didApply: false, transaction: null });

    function isValidCanonicalDeck(value) {
      if (!value) return false;
      const validate = canonicalDeckApi
        && typeof canonicalDeckApi.isCanonicalDeck === 'function'
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
    }

    const createCanonicalDeckResolver = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckResolver === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckResolver
      : null;
    const createCanonicalDeckBaselineReader = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader
      : null;
    const resolveCanonicalDeck = createCanonicalDeckResolver
      ? (() => {
          const sharedResolver = createCanonicalDeckResolver({
            getCanonicalDeck: () => null,
            getPendingCanonicalDeck,
            getCanonicalDeckBaseline,
            isCanonicalDeck: canonicalDeckApi
              && typeof canonicalDeckApi.isCanonicalDeck === 'function'
              ? canonicalDeckApi.isCanonicalDeck
              : null,
            buildCanonicalDeckBaseline
          });
          return typeof sharedResolver === 'function' ? sharedResolver : () => null;
        })()
      : createCanonicalDeckBaselineReader
        ? (() => {
            const sharedReader = createCanonicalDeckBaselineReader({
              getPendingCanonicalDeck,
              getCanonicalDeckBaseline,
              isCanonicalDeck: canonicalDeckApi
                && typeof canonicalDeckApi.isCanonicalDeck === 'function'
                ? canonicalDeckApi.isCanonicalDeck
                : null,
              buildCanonicalDeckBaseline
            });
            return typeof sharedReader === 'function' ? sharedReader : () => null;
          })()
        : (sourceDocument) => {
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
            if (buildCanonicalDeckBaseline) {
              try {
                const rebuiltCanonicalDeck = buildCanonicalDeckBaseline(sourceDocument, {
                  preferLiveCanonicalDeck: false
                });
                return isValidCanonicalDeck(rebuiltCanonicalDeck)
                  ? rebuiltCanonicalDeck
                  : null;
              } catch (err) {
                return null;
              }
            }
            return null;
          };

    function resolveLockedReader(sourceDocument) {
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.findCanonicalNodeById !== 'function') {
        return isElementLocked;
      }
      const canonicalDeck = resolveCanonicalDeck(sourceDocument);
      if (!canonicalDeck) return isElementLocked;
      if (canonicalStateApi
        && typeof canonicalStateApi.createStudioEditorCanonicalVisibilityReaderForDeck === 'function') {
        return canonicalStateApi.createStudioEditorCanonicalVisibilityReaderForDeck(canonicalDeck, {
          property: 'locked',
          canonicalDeckApi,
          getElementId: assignElementId,
          fallbackReader: isElementLocked
        });
      }
      if (canonicalStateApi
        && typeof canonicalStateApi.createStudioEditorCanonicalLockReaderFromApi === 'function') {
        return canonicalStateApi.createStudioEditorCanonicalLockReaderFromApi(canonicalDeck, {
          canonicalDeckApi,
          getElementId: assignElementId,
          fallbackReader: isElementLocked
        });
      }
      return (element) => {
        let canonicalLockState = null;
        try {
          const canonicalNode = canonicalDeckApi.findCanonicalNodeById(
            canonicalDeck,
            assignElementId(element)
          );
          const value = canonicalNode
            && canonicalNode.visibility
            && canonicalNode.visibility.locked;
          if (typeof value === 'boolean') canonicalLockState = value;
        } catch (err) {
          canonicalLockState = null;
        }
        return canonicalLockState === true || isElementLocked(element);
      };
    }

    function reorder(action, targetElements = [], reorderOptions = {}) {
      const sourceDocument = reorderOptions && reorderOptions.doc
        || (Array.isArray(targetElements)
          ? targetElements.find((element) => element && element.ownerDocument)?.ownerDocument
          : null)
        || getIframeDoc();
      const slide = getActiveSlide(sourceDocument);
      if (!slide || !layerOrderApi || typeof layerOrderApi.buildStudioLayerOrderMutationPlan !== 'function') {
        return false;
      }
      let buildCanonicalLayerOrderMutation = null;
      try {
        buildCanonicalLayerOrderMutation = canonicalLayoutApi
          && typeof canonicalLayoutApi.createStudioCanonicalLayerOrderMutationBuilder === 'function'
          ? canonicalLayoutApi.createStudioCanonicalLayerOrderMutationBuilder({
              canonicalDeckApi,
              buildCanonicalDeck,
              buildCanonicalDeckBaseline,
              getPendingCanonicalDeck,
              getCanonicalDeckBaseline
            })
          : null;
      } catch (error) {
        return false;
      }
      const buildCanonicalLayoutBaseline = canonicalLayoutApi
        && typeof canonicalLayoutApi.buildStudioCanonicalLayoutBaseline === 'function'
        ? canonicalLayoutApi.buildStudioCanonicalLayoutBaseline
        : null;
      let canonicalDeckBefore = null;
      if (buildCanonicalLayoutBaseline) {
        try {
          canonicalDeckBefore = buildCanonicalLayoutBaseline({
            canonicalDeckApi,
            buildCanonicalDeck,
            buildCanonicalDeckBaseline,
            getPendingCanonicalDeck,
            getCanonicalDeckBaseline,
            sourceDocument
          });
        } catch (error) {
          return false;
        }
      }
      const initialOrder = getNormalizedSlideLayerOrder(slide);
      const readLockedState = resolveLockedReader(sourceDocument);
      const reorderResult = layerOrderApi.buildStudioLayerOrderMutationPlan(targetElements, action, {
        orderedElements: initialOrder,
        isEligibleElement: (element) => !!(element && element.isConnected && slide.contains(element)),
        isLocked: readLockedState
      });
      if (!reorderResult || !reorderResult.didChange) return false;
      const getLayerOrderElementId = (element) => assignElementId(element);
      const mutation = applyLayerOrderMutation(
        slide,
        initialOrder,
        reorderResult.nextOrder,
        { getElementId: getLayerOrderElementId }
      );
      if (!mutation || !mutation.didApply) return false;
      let canonicalDeck = null;
      try {
        canonicalDeck = buildCanonicalLayerOrderMutation
            ? buildCanonicalLayerOrderMutation({
              orderedElements: initialOrder,
              nextOrder: reorderResult.nextOrder,
              canonicalDeckApi,
              canonicalDeckBeforeMutation: canonicalDeckBefore,
              getElementId: getLayerOrderElementId
            })
          : null;
      } catch (error) {
        canonicalDeck = null;
      }
      if (canonicalDeckBefore && !canonicalDeck) {
        try {
          applyLayerOrderMutation(
            slide,
            reorderResult.nextOrder,
            initialOrder,
            { getElementId: getLayerOrderElementId }
          );
        } catch (error) {
          // Keep the action failed closed even if the inverse adapter rejects.
        }
        return false;
      }
      if (typeof reorderOptions.onTransaction === 'function') {
        reorderOptions.onTransaction(mutation.transaction);
      }
      if (typeof reorderOptions.onCanonicalDeck === 'function') {
        reorderOptions.onCanonicalDeck(canonicalDeck);
      }
      return true;
    }

    return {
      reorder
    };
  }

  return {
    createStudioEditorLayerOrderController
  };
});

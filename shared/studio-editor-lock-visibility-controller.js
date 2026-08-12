(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLockVisibilityController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLockVisibilityController(options = {}) {
    const lockStateApi = options.lockStateApi
      || (root && root.SlideNextStudioEditorLockState)
      || null;
    const visibilityStateApi = options.visibilityStateApi
      || (root && root.SlideNextStudioEditorVisibilityState)
      || null;
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    const canonicalVisibilityApi = options.canonicalVisibilityApi
      || (root && root.SlideNextStudioEditorCanonicalVisibility)
      || null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const isHidden = typeof options.isHidden === 'function'
      ? options.isHidden
      : () => false;
    const setLocked = typeof options.setLocked === 'function'
      ? options.setLocked
      : null;
    const setHidden = typeof options.setHidden === 'function'
      ? options.setHidden
      : null;
    const getVisibilityState = typeof options.getVisibilityState === 'function'
      ? options.getVisibilityState
      : null;
    const assignLockElementId = typeof options.assignLockElementId === 'function'
      ? (element) => {
          const assignedId = options.assignLockElementId(element);
          if (assignedId) return assignedId;
          return element && element.dataset && element.dataset.editorId;
        }
      : (element) => element && element.dataset && element.dataset.editorId;
    const assignVisibilityElementId = typeof options.assignVisibilityElementId === 'function'
      ? (element) => {
          const assignedId = options.assignVisibilityElementId(element);
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
    const applyLockMutation = typeof options.applyLockMutation === 'function'
      ? options.applyLockMutation
      : () => ({ didApply: false, transaction: null });
    const applyVisibilityMutation = typeof options.applyVisibilityMutation === 'function'
      ? options.applyVisibilityMutation
      : () => ({ didApply: false, transaction: null });
    const finalizeSelectionToggleMutation = typeof options.finalizeSelectionToggleMutation === 'function'
      ? options.finalizeSelectionToggleMutation
      : null;

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
              const rebuiltCanonicalDeck = buildCanonicalDeckBaseline(sourceDocument);
              return isValidCanonicalDeck(rebuiltCanonicalDeck)
                ? rebuiltCanonicalDeck
                : null;
            } catch (err) {
              return null;
            }
          }
          return null;
        };

    function resolveCanonicalVisibilityReader(property, sourceDocument, fallbackReader, getElementId) {
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.findCanonicalNodeById !== 'function'
        || !canonicalStateApi) {
        return fallbackReader;
      }
      const canonicalDeck = resolveCanonicalDeck(sourceDocument);
      if (!canonicalDeck) return fallbackReader;
      if (typeof canonicalStateApi.createStudioEditorCanonicalVisibilityReaderForDeck === 'function') {
        return canonicalStateApi.createStudioEditorCanonicalVisibilityReaderForDeck(canonicalDeck, {
          property,
          canonicalDeckApi,
          getElementId,
          fallbackReader
        });
      }
      if (property === 'locked'
        && typeof canonicalStateApi.createStudioEditorCanonicalLockReaderFromApi === 'function') {
        return canonicalStateApi.createStudioEditorCanonicalLockReaderFromApi(canonicalDeck, {
          canonicalDeckApi,
          getElementId,
          fallbackReader
        });
      }
      if (typeof canonicalStateApi.createStudioEditorCanonicalVisibilityReaderFromApi === 'function') {
        return canonicalStateApi.createStudioEditorCanonicalVisibilityReaderFromApi(canonicalDeck, {
          property,
          canonicalDeckApi,
          getElementId,
          fallbackReader
        });
      }
      return fallbackReader;
    }

    function buildCanonicalVisibilityMutation(selection, nextState, doc, getElementId) {
      const canonicalVisibilityBuilders = canonicalVisibilityApi
        && typeof canonicalVisibilityApi.createStudioCanonicalVisibilityMutationBuilders === 'function'
        ? canonicalVisibilityApi.createStudioCanonicalVisibilityMutationBuilders({
            canonicalDeckApi,
            buildCanonicalDeck: buildCanonicalDeck
              ? () => buildCanonicalDeck(doc)
              : null,
            buildCanonicalDeckBaseline: buildCanonicalDeckBaseline
              ? () => buildCanonicalDeckBaseline(doc)
              : null,
            getCanonicalDeckBaseline: getCanonicalDeckBaseline
              ? () => getCanonicalDeckBaseline(doc)
              : null
          })
        : null;
      const buildMutation = canonicalVisibilityBuilders
        && typeof canonicalVisibilityBuilders.buildCanonicalVisibilityMutation === 'function'
        ? canonicalVisibilityBuilders.buildCanonicalVisibilityMutation
        : null;
      const buildBaseline = canonicalVisibilityBuilders
        && typeof canonicalVisibilityBuilders.buildCanonicalVisibilityBaseline === 'function'
        ? canonicalVisibilityBuilders.buildCanonicalVisibilityBaseline
        : null;
      const canonicalDeckBeforeMutation = buildBaseline
        ? buildBaseline({ sourceDocument: doc })
        : null;
      return {
        canonicalDeck: buildMutation
          ? buildMutation(selection, nextState, {
              sourceDocument: doc,
              canonicalDeckBeforeMutation,
              getElementId
            })
          : null,
        hasCanonicalBaseline: !!canonicalDeckBeforeMutation
      };
    }

    function toggleLock() {
      if (!lockStateApi || typeof lockStateApi.buildStudioLockMutationPlan !== 'function') {
        return false;
      }
      const doc = getIframeDoc();
      const getLockElementId = (element) => {
        return assignLockElementId(element);
      };
      const readLockedState = resolveCanonicalVisibilityReader(
        'locked',
        doc,
        isLocked,
        getLockElementId
      );
      const lockMutationPlan = lockStateApi.buildStudioLockMutationPlan(getSelectedElements(doc), {
        isLocked: readLockedState,
        canMutateDeck: () => !!getActiveSlide(doc)
      });
      if (!lockMutationPlan || !lockMutationPlan.didChange) return false;
      let canonicalVisibilityMutation = null;
      try {
        canonicalVisibilityMutation = buildCanonicalVisibilityMutation(
          lockMutationPlan.selection,
          { locked: lockMutationPlan.shouldLock },
          doc,
          getLockElementId
        );
      } catch (error) {
        return false;
      }
      if (canonicalVisibilityMutation.hasCanonicalBaseline
        && !canonicalVisibilityMutation.canonicalDeck) {
        return false;
      }
      const canonicalDeck = canonicalVisibilityMutation.canonicalDeck;
      const mutation = applyLockMutation(
        lockMutationPlan.selection,
        lockMutationPlan.shouldLock,
        {
          isLocked: readLockedState,
          setLocked,
          getElementId: getLockElementId
        }
      );
      if (!mutation || !mutation.didApply) return false;
      if (!finalizeSelectionToggleMutation) return false;
      return finalizeSelectionToggleMutation(lockMutationPlan.versionLabel, {
        doc,
        transaction: mutation.transaction,
        ...(canonicalDeck ? { canonicalDeck } : {})
      });
    }

    function toggleVisibility(options = {}) {
      if (!visibilityStateApi
        || typeof visibilityStateApi.buildStudioVisibilityMutationPlan !== 'function') {
        return false;
      }
      const doc = options.doc || getIframeDoc();
      const getVisibilityElementId = (element) => {
        if (typeof options.assignElementId === 'function') {
          const assignedId = options.assignElementId(element);
          if (assignedId) return assignedId;
        }
        return assignVisibilityElementId(element);
      };
      const readHiddenState = resolveCanonicalVisibilityReader(
        'hidden',
        doc,
        isHidden,
        getVisibilityElementId
      );
      const visibilityMutationPlan = visibilityStateApi.buildStudioVisibilityMutationPlan(
        getSelectedElements(doc),
        {
          isHidden: readHiddenState,
          canMutateDeck: () => !!getActiveSlide(doc)
        }
      );
      if (!visibilityMutationPlan || !visibilityMutationPlan.didChange) return false;
      let canonicalVisibilityMutation = null;
      try {
        canonicalVisibilityMutation = buildCanonicalVisibilityMutation(
          visibilityMutationPlan.selection,
          { hidden: visibilityMutationPlan.shouldHide },
          doc,
          getVisibilityElementId
        );
      } catch (error) {
        return false;
      }
      if (canonicalVisibilityMutation.hasCanonicalBaseline
        && !canonicalVisibilityMutation.canonicalDeck) {
        return false;
      }
      const canonicalDeck = canonicalVisibilityMutation.canonicalDeck;
      const mutation = applyVisibilityMutation(
        visibilityMutationPlan.selection,
        visibilityMutationPlan.shouldHide,
        {
          isHidden: readHiddenState,
          setHidden,
          getVisibilityState,
          getElementId: getVisibilityElementId
        }
      );
      if (!mutation || !mutation.didApply) return false;
      if (!finalizeSelectionToggleMutation) return false;
      return finalizeSelectionToggleMutation(visibilityMutationPlan.versionLabel, {
        ...options,
        doc,
        transaction: mutation.transaction,
        ...(canonicalDeck ? { canonicalDeck } : {})
      });
    }

    return {
      toggleLock,
      toggleVisibility
    };
  }

  return {
    createStudioEditorLockVisibilityController
  };
});

(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorStyleController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorStyleController(options = {}) {
    const styleApi = options.styleApi
      || (root && root.SlideNextStudioEditorStyle)
      || null;
    const canonicalStyleApi = options.canonicalStyleApi
      || (root && root.SlideNextStudioEditorCanonicalStyle)
      || null;
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
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
    const isElementLocked = typeof options.isElementLocked === 'function'
      ? options.isElementLocked
      : () => false;
    const syncInspectorForSelection = typeof options.syncInspectorForSelection === 'function'
      ? options.syncInspectorForSelection
      : () => {};
    const documentRef = options.documentRef
      || (root && root.document)
      || null;
    const highlightAlignButton = typeof options.highlightAlignButton === 'function'
      ? options.highlightAlignButton
      : null;
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
    const applyStyleMutation = typeof options.applyStyleMutation === 'function'
      ? options.applyStyleMutation
      : () => ({ didApply: false, displayValue: '', transaction: null });
    const finalizeDeckMutation = typeof options.finalizeDeckMutation === 'function'
      ? options.finalizeDeckMutation
      : null;

    function resolveCanonicalDeck(sourceDocument) {
      if (getCanonicalDeckBaseline) {
        try {
          const liveCanonicalDeck = getCanonicalDeckBaseline(sourceDocument);
          if (liveCanonicalDeck) return liveCanonicalDeck;
        } catch (err) {
          // Fall through to the document rebuild path.
        }
      }
      if (buildCanonicalDeckBaseline) {
        try {
          return buildCanonicalDeckBaseline(sourceDocument);
        } catch (err) {
          return null;
        }
      }
      return null;
    }

    function resolveLockedReader(sourceDocument) {
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.findCanonicalNodeById !== 'function') {
        return isElementLocked;
      }
      const canonicalDeck = resolveCanonicalDeck(sourceDocument);
      if (!canonicalDeck) return isElementLocked;
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

    function finalizeStyleActionResult(result) {
      if (styleApi && typeof styleApi.finalizeStudioStyleActionResult === 'function') {
        return styleApi.finalizeStudioStyleActionResult(result, {
          syncInspectorForSelection
        });
      }
      syncInspectorForSelection();
      return result;
    }

    function syncFeedbackLabel(prop, displayValue) {
      if (prop === 'align') {
        if (highlightAlignButton) highlightAlignButton(displayValue);
        return;
      }
      if (styleApi && typeof styleApi.syncStudioStyleFeedbackLabel === 'function') {
        styleApi.syncStudioStyleFeedbackLabel({
          documentRef,
          prop,
          displayValue
        });
        return;
      }
      const feedbackIds = {
        size: 'fontSizeVal',
        borderWidth: 'borderWidthVal',
        borderRadius: 'borderRadiusVal',
        opacity: 'opacityVal'
      };
      const feedbackId = feedbackIds[prop];
      if (!feedbackId || !documentRef || typeof documentRef.getElementById !== 'function') return;
      const label = documentRef.getElementById(feedbackId);
      if (!label) return;
      const suffix = prop === 'opacity' ? '%' : 'px';
      label.textContent = `${displayValue}${suffix}`;
    }

    function apply(prop, value) {
      if (!styleApi || typeof styleApi.buildStudioStyleMutationPlan !== 'function') {
        return finalizeStyleActionResult(false);
      }
      const doc = getIframeDoc();
      const styleMutationPlan = styleApi.buildStudioStyleMutationPlan(getSelectedElements(), prop, value, {
        isLocked: resolveLockedReader(doc),
        canMutateDeck: () => !!getActiveSlide(doc)
      });
      if (!styleMutationPlan || !styleMutationPlan.canApply) {
        return finalizeStyleActionResult(false);
      }
      const canonicalStyleBuilders = canonicalStyleApi
        && typeof canonicalStyleApi.createStudioCanonicalStyleMutationBuilders === 'function'
        ? canonicalStyleApi.createStudioCanonicalStyleMutationBuilders({
            canonicalDeckApi,
            buildCanonicalDeck,
            buildCanonicalDeckBaseline,
            getCanonicalDeckBaseline
          })
        : null;
      const buildCanonicalStyleBaseline = canonicalStyleBuilders
        && typeof canonicalStyleBuilders.buildCanonicalStyleBaseline === 'function'
        ? canonicalStyleBuilders.buildCanonicalStyleBaseline
        : null;
      const canonicalDeckBeforeMutation = buildCanonicalStyleBaseline
        ? buildCanonicalStyleBaseline({ sourceDocument: doc })
        : null;
      const getStyleElementId = (element) => assignElementId(element);
      const styleMutationResult = applyStyleMutation(
        styleApi,
        styleMutationPlan.selection,
        prop,
        value,
        { getElementId: getStyleElementId }
      );
      const transaction = styleMutationResult && styleMutationResult.transaction
        ? styleMutationResult.transaction
        : null;
      if (!styleMutationResult || !styleMutationResult.didApply) {
        return finalizeStyleActionResult(false);
      }

      syncFeedbackLabel(prop, styleMutationResult.displayValue);
      const canonicalDeck = canonicalStyleBuilders
        && typeof canonicalStyleBuilders.buildCanonicalStyleMutation === 'function'
        ? canonicalStyleBuilders.buildCanonicalStyleMutation({
            canonicalDeckBeforeMutation,
            sourceDocument: doc,
            selection: styleMutationPlan.selection,
            prop,
            value,
            getElementId: getStyleElementId
          })
        : null;
      if (finalizeDeckMutation) {
        finalizeDeckMutation(styleMutationPlan.versionLabel, {
          syncSelectionOverlay: true,
          refreshLayersList: prop === 'zIndex',
          debounceHistory: true,
          transaction,
          ...(canonicalDeck ? { canonicalDeck } : {})
        });
      }
      return true;
    }

    return {
      apply
    };
  }

  return {
    createStudioEditorStyleController
  };
});

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
    const chartApi = options.chartApi
      || (root && root.SlideNextStudioEditorChartMutation)
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
    const transactionApi = options.transactionApi
      || (root && root.SlideNextStudioEditorTransaction)
      || null;
    const domApi = options.domApi
      || (root && root.SlideNextStudioEditorDom)
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
    const applyStyleMutation = typeof options.applyStyleMutation === 'function'
      ? options.applyStyleMutation
      : () => ({ didApply: false, displayValue: '', transaction: null });
    const finalizeDeckMutation = typeof options.finalizeDeckMutation === 'function'
      ? options.finalizeDeckMutation
      : null;

    function finalizeStyleMutation(versionLabel, options = {}) {
      if (!finalizeDeckMutation) return false;
      try {
        return finalizeDeckMutation(versionLabel, options);
      } catch (error) {
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

    function resolveCanonicalStyleValue(prop, value, mutationResult) {
      if (mutationResult
        && Object.prototype.hasOwnProperty.call(mutationResult, 'styleValue')
        && mutationResult.styleValue !== undefined
        && mutationResult.styleValue !== null) {
        return mutationResult.styleValue;
      }
      if (!styleApi || typeof styleApi.normalizeStudioStyleMutationValue !== 'function') {
        return undefined;
      }
      try {
        const normalizedValue = styleApi.normalizeStudioStyleMutationValue(prop, value);
        return normalizedValue && normalizedValue.styleValue !== undefined
          ? normalizedValue.styleValue
          : undefined;
      } catch (error) {
        return undefined;
      }
    }

    function rollbackStyleMutation(transaction, doc) {
      if (!transaction
        || !transactionApi
        || typeof transactionApi.applyStudioEditorTransaction !== 'function') {
        syncInspectorForSelection();
        return false;
      }
      const getElementById = domApi
        && typeof domApi.getElementByEditorId === 'function'
        ? (elementId) => domApi.getElementByEditorId(elementId, doc)
        : () => null;
      let rollbackResult = null;
      try {
        rollbackResult = transactionApi.applyStudioEditorTransaction(transaction, 'undo', {
          getElementById
        });
      } catch (error) {
        rollbackResult = null;
      }
      syncInspectorForSelection();
      return !!(rollbackResult && rollbackResult.didApply);
    }

    function apply(prop, value) {
      if (!styleApi || typeof styleApi.buildStudioStyleMutationPlan !== 'function') {
        return finalizeStyleActionResult(false);
      }
      let doc = null;
      let styleMutationPlan = null;
      try {
        doc = getIframeDoc();
        styleMutationPlan = styleApi.buildStudioStyleMutationPlan(getSelectedElements(doc), prop, value, {
          isLocked: resolveLockedReader(doc),
          canMutateDeck: () => !!getActiveSlide(doc)
        });
      } catch (error) {
        return finalizeStyleActionResult(false);
      }
      if (!styleMutationPlan || !styleMutationPlan.canApply) {
        return finalizeStyleActionResult(false);
      }
      if (!finalizeDeckMutation) {
        return finalizeStyleActionResult(false);
      }
      let canonicalStyleBuilders = null;
      let canonicalDeckBeforeMutation = null;
      try {
        canonicalStyleBuilders = canonicalStyleApi
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
        canonicalDeckBeforeMutation = buildCanonicalStyleBaseline
          ? buildCanonicalStyleBaseline({ sourceDocument: doc })
          : null;
      } catch (error) {
        return finalizeStyleActionResult(false);
      }
      const getStyleElementId = (element) => assignElementId(element);
      let styleMutationResult = null;
      try {
        styleMutationResult = applyStyleMutation(
          styleApi,
          styleMutationPlan.selection,
          prop,
          value,
          {
            getElementId: getStyleElementId,
            chartApi
          }
        );
      } catch (error) {
        return finalizeStyleActionResult(false);
      }
      const transaction = styleMutationResult && styleMutationResult.transaction
        ? styleMutationResult.transaction
        : null;
      if (!styleMutationResult || !styleMutationResult.didApply) {
        return finalizeStyleActionResult(false);
      }

      syncFeedbackLabel(prop, styleMutationResult.displayValue);
      const canonicalStyleValue = resolveCanonicalStyleValue(prop, value, styleMutationResult);
      let canonicalDeck = null;
      if (canonicalStyleBuilders
        && typeof canonicalStyleBuilders.buildCanonicalStyleMutation === 'function') {
        try {
          canonicalDeck = canonicalStyleBuilders.buildCanonicalStyleMutation({
            canonicalDeckBeforeMutation,
            sourceDocument: doc,
            selection: styleMutationPlan.selection,
            prop,
            value,
            ...(canonicalStyleValue !== undefined ? { styleValue: canonicalStyleValue } : {}),
            getElementId: getStyleElementId
          });
        } catch (err) {
          canonicalDeck = null;
        }
      }
      if (canonicalDeckBeforeMutation && !canonicalDeck) {
        rollbackStyleMutation(transaction, doc);
        return finalizeStyleActionResult(false);
      }
      const finalizeResult = finalizeStyleMutation(styleMutationPlan.versionLabel, {
        syncSelectionOverlay: true,
        refreshLayersList: prop === 'zIndex',
        debounceHistory: true,
        transaction,
        ...(canonicalDeck ? { canonicalDeck } : {})
      });
      if (finalizeResult === false) {
        rollbackStyleMutation(transaction, doc);
        return finalizeStyleActionResult(false);
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

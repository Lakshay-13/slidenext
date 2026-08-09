(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVisibilityState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioVisibilitySelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);

    return selection.filter((element) => isEligibleElement(element));
  }

  function buildStudioVisibilityActionState(elements = [], options = {}) {
    const selection = getStudioVisibilitySelection(elements, options);
    const isHidden = typeof options.isHidden === 'function'
      ? options.isHidden
      : () => false;
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => true;
    const hasSelection = selection.length > 0;
    const canToggle = canMutateDeck() && hasSelection;

    return {
      hasSelection,
      canToggle,
      allHidden: canToggle && selection.every((element) => isHidden(element))
    };
  }

  function buildStudioVisibilityToolbarState(elements = [], options = {}) {
    const actionState = buildStudioVisibilityActionState(elements, options);

    return {
      ...actionState,
      iconText: actionState.allHidden ? 'visibility' : 'visibility_off',
      labelText: actionState.allHidden ? 'Show Selected' : 'Hide Selected'
    };
  }

  function renderStudioVisibilityToolbarState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const actionState = options.actionState || {};
    const button = documentRef.getElementById('toggleVisibilitySelectionBtn');
    const icon = documentRef.getElementById('toggleVisibilitySelectionIcon');
    const label = documentRef.getElementById('toggleVisibilitySelectionLabel');
    if (button) button.disabled = !actionState.canToggle;
    if (icon) icon.textContent = actionState.iconText || (actionState.allHidden ? 'visibility' : 'visibility_off');
    if (label) label.textContent = actionState.labelText || (actionState.allHidden ? 'Show Selected' : 'Hide Selected');
    return true;
  }

  function syncStudioVisibilityToolbarState(options = {}) {
    const actionState = buildStudioVisibilityToolbarState(options.elements, {
      isHidden: options.isHidden,
      canMutateDeck: options.canMutateDeck
    });
    return renderStudioVisibilityToolbarState({
      documentRef: options.documentRef,
      actionState
    });
  }

  function createStudioVisibilityToolbarStateSync(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getHiddenState = typeof options.getHiddenState === 'function'
      ? options.getHiddenState
      : () => () => false;
    const getDocumentRef = typeof options.getDocumentRef === 'function'
      ? options.getDocumentRef
      : () => options.documentRef || null;

    return function syncStudioEditorVisibilityToolbarState(doc = null) {
      const resolvedDoc = doc || getDocument();
      return syncStudioVisibilityToolbarState({
        documentRef: getDocumentRef(),
        elements: getSelectedElements(),
        isHidden: getHiddenState(resolvedDoc),
        canMutateDeck: () => !!getActiveSlide(resolvedDoc)
      });
    };
  }

  function buildStudioVisibilityMutationPlan(elements = [], options = {}) {
    const selection = getStudioVisibilitySelection(elements, options);
    const isHidden = typeof options.isHidden === 'function'
      ? options.isHidden
      : () => false;
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => true;

    if (selection.length === 0 || !canMutateDeck()) {
      return {
        selection,
        shouldHide: false,
        didChange: false,
        versionLabel: ''
      };
    }

    const shouldHide = !selection.every((element) => isHidden(element));
    return {
      selection,
      shouldHide,
      didChange: true,
      versionLabel: shouldHide ? 'Auto: Hid Element' : 'Auto: Showed Element'
    };
  }

  function applyStudioVisibilityMutation(elements = [], shouldHide = false, options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isHidden = typeof options.isHidden === 'function'
      ? options.isHidden
      : (element) => !!(element && element.hidden);
    const setHidden = typeof options.setHidden === 'function'
      ? options.setHidden
      : (element, hidden) => {
          if (!element) return;
          element.hidden = hidden;
        };
    const getVisibilityState = typeof options.getVisibilityState === 'function'
      ? options.getVisibilityState
      : () => null;
    const createVisibilityTransaction = typeof options.createVisibilityTransaction === 'function'
      ? options.createVisibilityTransaction
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const visibilityTransactionItems = createVisibilityTransaction
      ? selection
          .filter((element) => element && element.isConnected && isHidden(element) !== shouldHide)
          .map((element) => ({
            element,
            elementId: getElementId(element),
            before: getVisibilityState(element)
          }))
      : [];
    let changedCount = 0;

    selection.forEach((element) => {
      if (!element || !element.isConnected || isHidden(element) === shouldHide) return;
      setHidden(element, shouldHide);
      changedCount += 1;
    });

    if (changedCount === 0) {
      return {
        didApply: false,
        changedCount: 0,
        transaction: null
      };
    }

    visibilityTransactionItems.forEach((item) => {
      item.after = getVisibilityState(item.element);
    });
    const transaction = createVisibilityTransaction
      ? createVisibilityTransaction(visibilityTransactionItems, { getElementId })
      : null;

    return {
      didApply: true,
      changedCount,
      transaction
    };
  }

  function applyStudioVisibilityWithTransaction(elements = [], shouldHide = false, options = {}) {
    const applyStudioVisibilityMutation = typeof options.applyStudioVisibilityMutation === 'function'
      ? options.applyStudioVisibilityMutation
      : null;
    const createStudioVisibilityTransaction = typeof options.createStudioVisibilityTransaction === 'function'
      ? options.createStudioVisibilityTransaction
      : null;
    const isHidden = typeof options.isHidden === 'function'
      ? options.isHidden
      : () => false;
    const setHidden = typeof options.setHidden === 'function'
      ? options.setHidden
      : () => {};
    const getVisibilityState = typeof options.getVisibilityState === 'function'
      ? options.getVisibilityState
      : () => null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;

    if (applyStudioVisibilityMutation) {
      const mutation = applyStudioVisibilityMutation(elements, shouldHide, {
        isHidden,
        setHidden,
        getVisibilityState,
        createVisibilityTransaction: createStudioVisibilityTransaction,
        getElementId
      });
      return mutation && typeof mutation === 'object'
        ? mutation
        : { didApply: false, transaction: null };
    }

    const selection = Array.isArray(elements) ? elements : [];
    const visibilityTransactionItems = createStudioVisibilityTransaction
      ? selection
          .filter((element) => element && element.isConnected && isHidden(element) !== shouldHide)
          .map((element) => ({
            element,
            elementId: getElementId(element),
            before: getVisibilityState(element)
          }))
      : [];
    let changedCount = 0;
    selection.forEach((element) => {
      if (!element || !element.isConnected || isHidden(element) === shouldHide) return;
      setHidden(element, shouldHide);
      changedCount += 1;
    });
    if (changedCount === 0) {
      return { didApply: false, transaction: null };
    }
    visibilityTransactionItems.forEach((item) => {
      item.after = getVisibilityState(item.element);
    });
    const transaction = createStudioVisibilityTransaction
      ? createStudioVisibilityTransaction(visibilityTransactionItems, { getElementId })
      : null;
    return {
      didApply: true,
      transaction
    };
  }

  return {
    getStudioVisibilitySelection,
    buildStudioVisibilityActionState,
    buildStudioVisibilityToolbarState,
    renderStudioVisibilityToolbarState,
    syncStudioVisibilityToolbarState,
    createStudioVisibilityToolbarStateSync,
    buildStudioVisibilityMutationPlan,
    applyStudioVisibilityMutation,
    applyStudioVisibilityWithTransaction
  };
});

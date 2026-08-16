(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLockState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioLockSelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);

    return selection.filter((element) => {
      try {
        return isEligibleElement(element);
      } catch (error) {
        return false;
      }
    });
  }

  function buildStudioLockActionState(elements = [], options = {}) {
    const selection = getStudioLockSelection(elements, options);
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => true;
    const hasSelection = selection.length > 0;
    let canToggle = false;
    let allLocked = false;
    let canRemove = false;
    try {
      canToggle = canMutateDeck() && hasSelection;
      if (canToggle) {
        const hasLockedSelection = selection.some((element) => isLocked(element));
        allLocked = selection.every((element) => isLocked(element));
        canRemove = !hasLockedSelection;
      }
    } catch (error) {
      // Keep lock and deletion controls disabled when canonical lock state is uncertain.
      canToggle = false;
      allLocked = false;
      canRemove = false;
    }

    return {
      hasSelection,
      canToggle,
      allLocked,
      canRemove
    };
  }

  function buildStudioLockToolbarState(elements = [], options = {}) {
    const actionState = buildStudioLockActionState(elements, options);

    return {
      ...actionState,
      iconText: actionState.allLocked ? 'lock_open' : 'lock',
      labelText: actionState.allLocked ? 'Unlock Selected' : 'Lock Selected'
    };
  }

  function renderStudioLockToolbarState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const actionState = options.actionState || {};
    const button = documentRef.getElementById('toggleLockSelectionBtn');
    const icon = documentRef.getElementById('toggleLockSelectionIcon');
    const label = documentRef.getElementById('toggleLockSelectionLabel');
    if (button) button.disabled = !actionState.canToggle;
    if (icon) icon.textContent = actionState.iconText || (actionState.allLocked ? 'lock_open' : 'lock');
    if (label) label.textContent = actionState.labelText || (actionState.allLocked ? 'Unlock Selected' : 'Lock Selected');
    return true;
  }

  function syncStudioLockToolbarState(options = {}) {
    const actionState = buildStudioLockToolbarState(options.elements, {
      isLocked: options.isLocked,
      canMutateDeck: options.canMutateDeck
    });
    return renderStudioLockToolbarState({
      documentRef: options.documentRef,
      actionState
    });
  }

  function createStudioLockToolbarStateSync(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getLockedState = typeof options.getLockedState === 'function'
      ? options.getLockedState
      : () => () => false;
    const getDocumentRef = typeof options.getDocumentRef === 'function'
      ? options.getDocumentRef
      : () => options.documentRef || null;

    return function syncStudioEditorLockToolbarState(doc = null) {
      const resolvedDoc = doc || getDocument();
      return syncStudioLockToolbarState({
        documentRef: getDocumentRef(),
        elements: getSelectedElements(resolvedDoc),
        isLocked: getLockedState(resolvedDoc),
        canMutateDeck: () => !!getActiveSlide(resolvedDoc)
      });
    };
  }

  function buildStudioLockMutationPlan(elements = [], options = {}) {
    const selection = getStudioLockSelection(elements, options);
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => true;

    let deckReady = false;
    try {
      deckReady = canMutateDeck();
    } catch (error) {
      deckReady = false;
    }

    if (selection.length === 0 || !deckReady) {
      return {
        selection,
        shouldLock: false,
        didChange: false,
        versionLabel: ''
      };
    }

    let shouldLock = false;
    try {
      shouldLock = !selection.every((element) => isLocked(element));
    } catch (error) {
      return {
        selection,
        shouldLock: false,
        didChange: false,
        versionLabel: ''
      };
    }
    return {
      selection,
      shouldLock,
      didChange: true,
      versionLabel: shouldLock ? 'Auto: Locked Element' : 'Auto: Unlocked Element'
    };
  }

  function applyStudioLockMutation(elements = [], shouldLock = false, options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : (element) => !!(element && element.dataset && element.dataset.editorLocked === 'true');
    const setLocked = typeof options.setLocked === 'function'
      ? options.setLocked
      : (element, locked) => {
          if (!element || !element.dataset) return;
          if (locked) {
            element.dataset.editorLocked = 'true';
          } else {
            delete element.dataset.editorLocked;
          }
        };
    const createDatasetTransaction = typeof options.createDatasetTransaction === 'function'
      ? options.createDatasetTransaction
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const transactionItems = createDatasetTransaction
      ? selection
          .filter((element) => element && element.isConnected && isLocked(element) !== shouldLock)
          .map((element) => ({
            element,
            elementId: getElementId(element),
            property: 'editorLocked',
            before: element.dataset && element.dataset.editorLocked
              ? element.dataset.editorLocked
              : '',
            after: shouldLock ? 'true' : ''
          }))
      : [];
    const transaction = createDatasetTransaction
      ? createDatasetTransaction(transactionItems, { getElementId })
      : null;
    let changedCount = 0;

    selection.forEach((element) => {
      if (!element || !element.isConnected || isLocked(element) === shouldLock) return;
      setLocked(element, shouldLock);
      changedCount += 1;
    });

    return {
      didApply: changedCount > 0,
      changedCount,
      transaction: changedCount > 0 ? transaction : null
    };
  }

  function applyStudioLockWithTransaction(elements = [], shouldLock = false, options = {}) {
    const applyStudioLockMutation = typeof options.applyStudioLockMutation === 'function'
      ? options.applyStudioLockMutation
      : null;
    const createStudioDatasetTransaction = typeof options.createStudioDatasetTransaction === 'function'
      ? options.createStudioDatasetTransaction
      : null;
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const setLocked = typeof options.setLocked === 'function'
      ? options.setLocked
      : () => {};
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;

    if (applyStudioLockMutation) {
      const mutation = applyStudioLockMutation(elements, shouldLock, {
        isLocked,
        setLocked,
        createDatasetTransaction: createStudioDatasetTransaction,
        getElementId
      });
      return mutation && typeof mutation === 'object'
        ? mutation
        : { didApply: false, transaction: null };
    }

    const selection = Array.isArray(elements) ? elements : [];
    const transactionItems = createStudioDatasetTransaction
      ? selection
          .filter((element) => element && element.isConnected && isLocked(element) !== shouldLock)
          .map((element) => {
            getElementId(element);
            return {
              element,
              property: 'editorLocked',
              before: element.dataset && element.dataset.editorLocked
                ? element.dataset.editorLocked
                : '',
              after: shouldLock ? 'true' : ''
            };
          })
      : [];
    const transaction = createStudioDatasetTransaction
      ? createStudioDatasetTransaction(transactionItems)
      : null;
    let changedCount = 0;
    selection.forEach((element) => {
      if (!element || !element.isConnected || isLocked(element) === shouldLock) return;
      setLocked(element, shouldLock);
      changedCount += 1;
    });
    return {
      didApply: changedCount > 0,
      transaction: changedCount > 0 ? transaction : null
    };
  }

  return {
    getStudioLockSelection,
    buildStudioLockActionState,
    buildStudioLockToolbarState,
    renderStudioLockToolbarState,
    syncStudioLockToolbarState,
    createStudioLockToolbarStateSync,
    buildStudioLockMutationPlan,
    applyStudioLockMutation,
    applyStudioLockWithTransaction
  };
});

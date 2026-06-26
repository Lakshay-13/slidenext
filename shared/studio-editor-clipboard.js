(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboard = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function hasStudioClipboardItems(clipboard) {
    return !!(clipboard && Array.isArray(clipboard.items) && clipboard.items.length > 0);
  }

  function getStudioClipboardSelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);
    const eligibleSelection = selection.filter((element) => isEligibleElement(element));
    const orderedElements = Array.isArray(options.orderedElements) ? options.orderedElements : null;

    if (!orderedElements) {
      return eligibleSelection;
    }
    return orderedElements.filter((element) => eligibleSelection.includes(element));
  }

  function canStudioCopySelection(elements = [], options = {}) {
    const eligibleSelection = getStudioClipboardSelection(elements, options);

    if (eligibleSelection.length === 0) {
      return false;
    }
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    return !eligibleSelection.some((element) => isLocked(element));
  }

  function buildStudioClipboardActionState(elements = [], clipboard = null, options = {}) {
    return buildStudioClipboardMutationPlan(elements, clipboard, options);
  }

  function buildStudioClipboardMutationPlan(elements = [], clipboard = null, options = {}) {
    const selection = getStudioClipboardSelection(elements, options);
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const canCopy = selection.length > 0 && !selection.some((element) => isLocked(element));

    return {
      selection,
      canCopy,
      canDuplicate: canCopy,
      canPaste: hasStudioClipboardItems(clipboard)
    };
  }

  return {
    hasStudioClipboardItems,
    getStudioClipboardSelection,
    canStudioCopySelection,
    buildStudioClipboardActionState,
    buildStudioClipboardMutationPlan
  };
});

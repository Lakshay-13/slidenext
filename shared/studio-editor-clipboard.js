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

  function canStudioCopySelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);
    const eligibleSelection = selection.filter((element) => isEligibleElement(element));

    if (eligibleSelection.length === 0) {
      return false;
    }
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    return !eligibleSelection.some((element) => isLocked(element));
  }

  function buildStudioClipboardActionState(elements = [], clipboard = null, options = {}) {
    return {
      canCopy: canStudioCopySelection(elements, options),
      canPaste: hasStudioClipboardItems(clipboard)
    };
  }

  return {
    hasStudioClipboardItems,
    canStudioCopySelection,
    buildStudioClipboardActionState
  };
});

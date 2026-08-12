(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardSelectionController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorClipboardSelectionController(options = {}) {
    const hasOption = (name) => Object.prototype.hasOwnProperty.call(options, name);
    const resolveDependency = (name, globalName) => hasOption(name)
      ? options[name]
      : (root && root[globalName]) || null;
    const clipboardApi = resolveDependency('clipboardApi', 'SlideNextStudioEditorClipboard');
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getClipboard = typeof options.getClipboard === 'function'
      ? options.getClipboard
      : () => null;
    const isElementLocked = typeof options.isElementLocked === 'function'
      ? options.isElementLocked
      : () => false;
    const getCanonicalVisibilityReader = typeof options.getCanonicalVisibilityReader === 'function'
      ? options.getCanonicalVisibilityReader
      : null;
    const buildPayload = typeof options.buildPayload === 'function'
      ? options.buildPayload
      : () => [];

    function build(doc = null) {
      const resolvedDoc = doc || getIframeDoc();
      const readLockedState = getCanonicalVisibilityReader
        ? getCanonicalVisibilityReader('locked', resolvedDoc, isElementLocked)
        : isElementLocked;
      const buildSharedSelectionPlan = clipboardApi
        && typeof clipboardApi.buildStudioClipboardSelectionMutationPlan === 'function'
        ? clipboardApi.buildStudioClipboardSelectionMutationPlan
        : null;
      if (buildSharedSelectionPlan) {
        return buildSharedSelectionPlan(getSelectedElements(resolvedDoc), getClipboard(), {
          isLocked: readLockedState,
          canMutateDeck: () => !!getActiveSlide(resolvedDoc),
          buildPayloadItems(selection) {
            return buildPayload(selection, resolvedDoc);
          }
        });
      }

      if (!clipboardApi || typeof clipboardApi.buildStudioClipboardMutationPlan !== 'function') {
        return {
          selection: [],
          canCopy: false,
          canDuplicate: false,
          canPaste: false,
          payloadItems: [],
          canBuildPayload: false
        };
      }

      const clipboardMutationPlan = clipboardApi.buildStudioClipboardMutationPlan(
        getSelectedElements(resolvedDoc),
        getClipboard(),
        {
          isLocked: readLockedState,
          canMutateDeck: () => !!getActiveSlide(resolvedDoc)
        }
      );
      const payloadItems = (clipboardMutationPlan.canCopy || clipboardMutationPlan.canDuplicate)
        ? buildPayload(clipboardMutationPlan.selection, resolvedDoc)
        : [];
      const canBuildPayload = payloadItems.length > 0;

      return {
        ...clipboardMutationPlan,
        payloadItems,
        canBuildPayload,
        canCopy: clipboardMutationPlan.canCopy && canBuildPayload,
        canDuplicate: clipboardMutationPlan.canDuplicate && canBuildPayload
      };
    }

    return {
      build,
      buildClipboardSelectionMutationPlan: build
    };
  }

  return {
    createStudioEditorClipboardSelectionController
  };
});

(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideMutationAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const RUNTIME_OPTION_NAMES = [
    'mutationRuntimeApi',
    'reorderApi',
    'insertionApi',
    'deletionApi',
    'duplicationApi',
    'slideCommandsApi',
    'canonicalSlideApi',
    'canonicalDeckApi',
    'transactionApi',
    'insertionMutationApi',
    'insertionTransactionApi',
    'reorderMutationApi',
    'reorderTransactionApi',
    'deckViewApi',
    'deletionMutationApi',
    'deletionTransactionApi',
    'deckImportApi',
    'getIframeDoc',
    'getSlides',
    'getSlideId',
    'buildCanonicalDeckBaseline',
    'getCanonicalDeckBaseline',
    'getPendingCanonicalDeck',
    'captureSlideMutationState',
    'resolveInsertionActionState',
    'createBlankSlide',
    'saveHistoryState',
    'setActiveSlide',
    'alert',
    'restoreDeckViewAfterSlideMutation',
    'rollbackMutation',
    'getActiveSlide',
    'sanitizeDuplicatedSubtree',
    'assignSlideId',
    'makeElementsHoverable',
    'generateThumbnails',
    'finalizeMutation'
  ];

  function createStudioEditorSlideMutationAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorSlideMutationShellRuntime;
    const runtimeOptions = {};
    RUNTIME_OPTION_NAMES.forEach((name) => {
      if (Object.prototype.hasOwnProperty.call(options, name)) {
        runtimeOptions[name] = options[name];
      }
    });
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorSlideMutationShellRuntime === 'function'
      ? runtimeApi.createStudioEditorSlideMutationShellRuntime(runtimeOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorSlideMutationAccessors };
});

(function initStudioEditorWallpaperFinalization(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorWallpaperFinalization = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorWallpaperFinalization(options = {}) {
    const deckMutationApi = options.deckMutationApi
      && typeof options.deckMutationApi.finalizeStudioEditorWallpaperMutation === 'function'
      ? options.deckMutationApi
      : null;
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    const generateThumbnails = typeof options.generateThumbnails === 'function'
      ? options.generateThumbnails
      : null;
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : null;
    const triggerAutoSave = typeof options.triggerAutoSave === 'function'
      ? options.triggerAutoSave
      : null;
    const triggerAutoVersion = typeof options.triggerAutoVersion === 'function'
      ? options.triggerAutoVersion
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;

    return function finalizeWallpaperMutation(
      versionLabel = '',
      transaction = null,
      canonicalDeck = null
    ) {
      if (!deckMutationApi) return false;
      return deckMutationApi.finalizeStudioEditorWallpaperMutation(
        versionLabel,
        transaction,
        canonicalDeck,
        {
          mutationApi,
          finalizeMutation,
          generateThumbnails,
          saveHistoryState,
          triggerAutoSave,
          triggerAutoVersion,
          isCanonicalDeck
        }
      );
    };
  }

  function createStudioEditorWallpaperFinalizationGlobalApi(options = {}) {
    const finalize = typeof options.finalizeWallpaperMutation === 'function'
      ? options.finalizeWallpaperMutation
      : null;
    return {
      finalizeWallpaperMutation: (...args) => finalize ? finalize(...args) : false
    };
  }

  return {
    createStudioEditorWallpaperFinalization,
    createStudioEditorWallpaperFinalizationGlobalApi
  };
}));

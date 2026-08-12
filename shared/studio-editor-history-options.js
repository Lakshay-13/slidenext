(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryOptions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorHistoryOptionsResolver(options = {}) {
    const getDeckSanitizerOptions = typeof options.getDeckSanitizerOptions === 'function'
      ? options.getDeckSanitizerOptions
      : () => ({
          chromeNodeIds: [],
          transientClassNames: [],
          editorElementIdAttr: '',
          editorSlideIdAttr: ''
        });
    const resolveMetadataPersistenceOptions = typeof options.resolveMetadataPersistenceOptions === 'function'
      ? options.resolveMetadataPersistenceOptions
      : ({ persistenceOptions } = {}) => persistenceOptions || {};
    const deckImport = options.deckImportApi && typeof options.deckImportApi === 'object'
      ? options.deckImportApi
      : null;
    const deckPersistence = options.deckPersistenceApi && typeof options.deckPersistenceApi === 'object'
      ? options.deckPersistenceApi
      : null;
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const getSelectedElementIds = typeof options.getSelectedElementIds === 'function'
      ? options.getSelectedElementIds
      : () => [];
    const areIdListsEqual = typeof options.areIdListsEqual === 'function'
      ? options.areIdListsEqual
      : () => false;

    return function resolveStudioEditorHistoryOptions(historyInput = {}) {
      const historyOptionsInput = historyInput && typeof historyInput === 'object'
        ? historyInput
        : {};
      const deckSanitizerOptions = getDeckSanitizerOptions(historyOptionsInput);
      const chromeNodeIds = deckSanitizerOptions.chromeNodeIds;
      const removableClassNames = deckSanitizerOptions.transientClassNames;
      const editorElementIdAttr = deckSanitizerOptions.editorElementIdAttr;
      const editorSlideIdAttr = deckSanitizerOptions.editorSlideIdAttr;
      const persistenceOptions = resolveMetadataPersistenceOptions({
        persistenceOptions: historyOptionsInput.persistenceOptions
      });
      const {
        chromeNodeIds: _overrideChromeNodeIds,
        transientClassNames: _overrideTransientClassNames,
        editorElementIdAttr: _overrideEditorElementIdAttr,
        editorSlideIdAttr: _overrideEditorSlideIdAttr,
        persistenceOptions: _overridePersistenceOptions,
        ...historyOptions
      } = historyOptionsInput;
      const sanitizeFrameRoot = deckImport
        && typeof deckImport.sanitizeDeckSourceClone === 'function'
        ? (rootNode) => {
            deckImport.sanitizeDeckSourceClone(rootNode, {
              ignoredNodeIds: chromeNodeIds,
              transientClassNames: removableClassNames,
              editorElementIdAttr,
              editorSlideIdAttr,
              persistenceOptions
            });
          }
        : deckPersistence
          && typeof deckPersistence.stripTransientDeckRuntimeState === 'function'
          ? (rootNode) => {
              deckPersistence.stripTransientDeckRuntimeState(rootNode, persistenceOptions);
            }
          : null;

      return {
        chromeNodeIds,
        removableClassNames,
        editorElementIdAttr,
        editorSlideIdAttr,
        sanitizeFrameRoot,
        getActiveSlideId,
        getSelectedElementIds,
        areIdListsEqual,
        ...historyOptions
      };
    };
  }

  function createStudioEditorHistoryStackOptionsResolver(options = {}) {
    const getHistoryOptions = typeof options.getHistoryOptions === 'function'
      ? options.getHistoryOptions
      : () => ({});
    const getHistoryApi = typeof options.getHistoryApi === 'function'
      ? options.getHistoryApi
      : () => null;

    return function resolveStudioEditorHistoryStackOptions(historyInput = {}) {
      const historyOptionsInput = historyInput && typeof historyInput === 'object'
        ? historyInput
        : {};
      const historyApi = getHistoryApi();
      return {
        ...getHistoryOptions(historyOptionsInput),
        normalizeEntry: historyApi
          && typeof historyApi.normalizeStudioHistoryEntry === 'function'
          ? historyApi.normalizeStudioHistoryEntry
          : undefined,
        areEntriesEqual: historyApi
          && typeof historyApi.areStudioHistoryEntriesEqual === 'function'
          ? historyApi.areStudioHistoryEntriesEqual
          : undefined,
        maxUndoEntries: 50,
        ...historyOptionsInput
      };
    };
  }

  return {
    createStudioEditorHistoryOptionsResolver,
    createStudioEditorHistoryStackOptionsResolver
  };
});

(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorHistoryController(options = {}) {
    const hasOption = (name) => Object.prototype.hasOwnProperty.call(options, name);
    const resolveDependency = (name, globalName) => hasOption(name)
      ? options[name]
      : (root && root[globalName]) || null;
    const historyApi = resolveDependency('historyApi', 'SlideNextStudioHistory');
    const historyStateApi = resolveDependency(
      'historyStateApi',
      'SlideNextStudioEditorHistoryState'
    );
    const canonicalStateApi = resolveDependency(
      'canonicalStateApi',
      'SlideNextStudioEditorCanonicalState'
    );
    const restoreApi = resolveDependency(
      'restoreApi',
      'SlideNextStudioEditorHistoryRestore'
    );
    const transactionApi = resolveDependency(
      'transactionApi',
      'SlideNextStudioEditorTransaction'
    );
    const elementStateApi = resolveDependency(
      'elementStateApi',
      'SlideNextStudioElementState'
    );
    const documentRef = options.documentRef || (root && root.document) || null;
    const getPendingTransaction = typeof options.getPendingTransaction === 'function'
      ? options.getPendingTransaction
      : () => null;
    const setPendingTransaction = typeof options.setPendingTransaction === 'function'
      ? options.setPendingTransaction
      : () => {};
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : () => null;
    const setPendingCanonicalDeck = typeof options.setPendingCanonicalDeck === 'function'
      ? options.setPendingCanonicalDeck
      : () => {};
    const setLiveCanonicalDeck = typeof options.setLiveCanonicalDeck === 'function'
      ? options.setLiveCanonicalDeck
      : () => {};
    const getLiveCanonicalDeck = typeof options.getLiveCanonicalDeck === 'function'
      ? options.getLiveCanonicalDeck
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const getTimer = typeof options.getTimer === 'function'
      ? options.getTimer
      : () => null;
    const setTimer = typeof options.setTimer === 'function'
      ? options.setTimer
      : () => {};
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : () => null;
    const buildMutationCanonicalDeck = typeof options.buildMutationCanonicalDeck === 'function'
      ? options.buildMutationCanonicalDeck
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const getHistoryOptions = typeof options.getHistoryOptions === 'function'
      ? options.getHistoryOptions
      : () => ({});
    const buildPersistableDeckHtml = typeof options.buildPersistableDeckHtml === 'function'
      ? options.buildPersistableDeckHtml
      : () => '';
    const resolveFallbackActiveSlideId = typeof options.resolveFallbackActiveSlideId === 'function'
      ? options.resolveFallbackActiveSlideId
      : () => '';
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const getSelectedElementIds = typeof options.getSelectedElementIds === 'function'
      ? options.getSelectedElementIds
      : () => [];
    const getHistoryStateOptions = typeof options.getHistoryStateOptions === 'function'
      ? options.getHistoryStateOptions
      : () => ({});
    const getUndoStack = typeof options.getUndoStack === 'function'
      ? options.getUndoStack
      : () => [];
    const getRedoStack = typeof options.getRedoStack === 'function'
      ? options.getRedoStack
      : () => [];
    const setUndoStack = typeof options.setUndoStack === 'function'
      ? options.setUndoStack
      : () => {};
    const setRedoStack = typeof options.setRedoStack === 'function'
      ? options.setRedoStack
      : () => {};
    const triggerAutoSave = typeof options.triggerAutoSave === 'function'
      ? options.triggerAutoSave
      : () => {};
    const updateHistoryButtons = typeof options.updateHistoryButtons === 'function'
      ? options.updateHistoryButtons
      : () => {};
    const restoreHandlerOptions = typeof options.restoreHandlerOptions === 'function'
      ? options.restoreHandlerOptions
      : () => (options.restoreHandlerOptions || {});

    let saveAdapter = null;
    let frameHtmlBuilder = null;
    let historyEntryBuilder = null;
    let captureAdapter = null;
    let stepAdapter = null;
    let restoreHandler = null;
    let historyButtonSync = null;

    function buildSaveAdapter() {
      if (!historyStateApi
        || typeof historyStateApi.createStudioEditorHistorySaveAdapter !== 'function') {
        return null;
      }
      return historyStateApi.createStudioEditorHistorySaveAdapter({
        historyApi,
        transactionApi,
        getPendingTransaction,
        setPendingTransaction,
        setPendingCanonicalDeck,
        setLiveCanonicalDeck,
        getLiveCanonicalDeck,
        isCanonicalDeck,
        getTimer,
        setTimer,
        captureState: () => capture(),
        scheduleOptions: {
          clearScheduledCapture: clearTimeout,
          scheduleCapture: (callback, delayMs) => setTimeout(callback, delayMs)
        }
      });
    }

    function save(debounce = false, transaction = null, canonicalDeck = null) {
      if (typeof saveAdapter !== 'function') {
        saveAdapter = buildSaveAdapter();
      }
      if (typeof saveAdapter !== 'function') {
        return { didCapture: false, nextTimer: getTimer() };
      }
      return saveAdapter(
        debounce,
        transaction,
        ...(arguments.length > 2 ? [canonicalDeck] : [])
      );
    }

    function buildFrameHtml(doc = getDocument(), buildOptions = {}) {
      if (typeof frameHtmlBuilder !== 'function') {
        const createFrameHtmlBuilder = historyStateApi
          && typeof historyStateApi.createStudioEditorHistoryFrameHtmlStateAdapter === 'function'
          ? historyStateApi.createStudioEditorHistoryFrameHtmlStateAdapter
          : null;
        frameHtmlBuilder = createFrameHtmlBuilder
          ? createFrameHtmlBuilder({
              historyStateApi,
              historyApi,
              getHistoryOptions,
              buildPersistableDeckHtml
            })
          : null;
      }
      return typeof frameHtmlBuilder === 'function'
        ? frameHtmlBuilder(doc, buildOptions)
        : '';
    }

    function createEntry(doc = getDocument()) {
      if (typeof historyEntryBuilder !== 'function') {
        const createEntryAdapter = historyStateApi
          && typeof historyStateApi.createStudioEditorHistoryEntryAdapter === 'function'
          ? historyStateApi.createStudioEditorHistoryEntryAdapter
          : null;
        historyEntryBuilder = createEntryAdapter
          ? createEntryAdapter({
              historyStateApi,
              canonicalStateApi,
              historyApi,
              getDocument,
              getPendingCanonicalDeck,
              buildCanonicalDeck,
              buildMutationCanonicalDeck,
              getCanonicalDeckBaseline,
              isCanonicalDeck,
              getHistoryOptions,
              resolveFallbackActiveSlideId,
              buildHistoryHtml: buildFrameHtml,
              getActiveSlideId,
              getSelectedElementIds,
              preferCanonicalDeck: true,
              getPendingTransaction
            })
          : null;
      }
      return typeof historyEntryBuilder === 'function'
        ? historyEntryBuilder(doc)
        : null;
    }

    function clearPendingState() {
      setPendingTransaction(null);
      setPendingCanonicalDeck(null);
    }

    function capture() {
      if (typeof captureAdapter !== 'function') {
        const createCaptureAdapter = historyStateApi
          && typeof historyStateApi.createStudioEditorHistoryCaptureStateAdapter === 'function'
          ? historyStateApi.createStudioEditorHistoryCaptureStateAdapter
          : null;
        captureAdapter = createCaptureAdapter
          ? createCaptureAdapter({
              historyStateApi,
              historyApi,
              createHistoryEntry: createEntry,
              getUndoStack,
              getRedoStack,
              getHistoryStateOptions,
              setUndoStack,
              setRedoStack,
              updateHistoryButtons,
              clearPendingState
            })
          : null;
      }
      if (typeof captureAdapter !== 'function') {
        clearPendingState();
        return {
          didCapture: false,
          undoStack: getUndoStack(),
          redoStack: getRedoStack(),
          historyEntry: null
        };
      }
      return captureAdapter();
    }

    function updateButtons() {
      if (!historyApi || typeof historyApi.syncStudioHistoryButtons !== 'function') return false;
      if (!historyButtonSync
        && typeof historyApi.createStudioHistoryButtonStateSync === 'function') {
        historyButtonSync = historyApi.createStudioHistoryButtonStateSync({
          getDocument: () => documentRef,
          getUndoStack,
          getRedoStack
        });
      }
      if (typeof historyButtonSync === 'function') {
        return historyButtonSync();
      }
      return historyApi.syncStudioHistoryButtons({
        documentRef,
        undoStack: getUndoStack(),
        redoStack: getRedoStack()
      });
    }

    function flushPending() {
      const pendingTransaction = getPendingTransaction();
      const pendingCanonicalDeck = getPendingCanonicalDeck();
      const hasPendingTransaction = pendingTransaction !== undefined && pendingTransaction !== null;
      const hasPendingCanonicalDeck = pendingCanonicalDeck !== undefined && pendingCanonicalDeck !== null;
      if (!hasPendingTransaction && !hasPendingCanonicalDeck) return false;
      let saveResult;
      if (hasPendingCanonicalDeck) {
        saveResult = save(false, hasPendingTransaction ? pendingTransaction : null, pendingCanonicalDeck);
      } else {
        saveResult = save(false, pendingTransaction);
      }
      return saveResult !== false
        && !(saveResult && typeof saveResult === 'object' && saveResult.didCapture === false);
    }

    function restore(entry, historyStep = null) {
      if (typeof restoreHandler !== 'function') {
        const createRestoreAdapter = restoreApi
          && typeof restoreApi.createStudioEditorHistoryRestoreStateAdapter === 'function'
          ? restoreApi.createStudioEditorHistoryRestoreStateAdapter
          : null;
        restoreHandler = createRestoreAdapter
          ? createRestoreAdapter({
              restoreApi,
              historyApi,
              ...restoreHandlerOptions()
            })
          : null;
      }
      return typeof restoreHandler === 'function'
        ? restoreHandler(entry, historyStep)
        : false;
    }

    function getStepAdapter() {
      if (stepAdapter) return stepAdapter;
      const createStepAdapter = historyStateApi
        && typeof historyStateApi.createStudioEditorHistoryStepStateAdapter === 'function'
        ? historyStateApi.createStudioEditorHistoryStepStateAdapter
        : null;
      stepAdapter = createStepAdapter
        ? createStepAdapter({
            historyStateApi,
            historyApi,
            getUndoStack,
            getRedoStack,
            setUndoStack,
            setRedoStack,
            restoreHistoryEntry: restore,
            updateHistoryButtons,
            triggerAutoSave,
            flushPendingHistory: flushPending
          })
        : null;
      return stepAdapter;
    }

    function undo() {
      const adapter = getStepAdapter();
      return adapter && typeof adapter.undo === 'function'
        ? adapter.undo()
        : {
            didUndo: false,
            undoStack: getUndoStack(),
            redoStack: getRedoStack(),
            restoreEntry: null
          };
    }

    function redo() {
      const adapter = getStepAdapter();
      return adapter && typeof adapter.redo === 'function'
        ? adapter.redo()
        : {
            didRedo: false,
            undoStack: getUndoStack(),
            redoStack: getRedoStack(),
            restoreEntry: null
          };
    }

    return {
      save,
      buildFrameHtml,
      createEntry,
      capture,
      updateButtons,
      flushPending,
      undo,
      redo,
      restore
    };
  }

  return {
    createStudioEditorHistoryController
  };
});

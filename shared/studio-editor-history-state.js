(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorHistorySaveAdapter(options = {}) {
    const historyApi = options.historyApi && typeof options.historyApi === 'object'
      ? options.historyApi
      : null;
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const getPendingTransaction = typeof options.getPendingTransaction === 'function'
      ? options.getPendingTransaction
      : () => null;
    const setPendingTransaction = typeof options.setPendingTransaction === 'function'
      ? options.setPendingTransaction
      : () => {};
    const setPendingCanonicalDeck = typeof options.setPendingCanonicalDeck === 'function'
      ? options.setPendingCanonicalDeck
      : () => {};
    const setLiveCanonicalDeck = typeof options.setLiveCanonicalDeck === 'function'
      ? options.setLiveCanonicalDeck
      : () => {};
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const getTimer = typeof options.getTimer === 'function'
      ? options.getTimer
      : () => null;
    const setTimer = typeof options.setTimer === 'function'
      ? options.setTimer
      : () => {};
    const captureState = typeof options.captureState === 'function'
      ? options.captureState
      : () => {};
    const scheduleOptions = options.scheduleOptions && typeof options.scheduleOptions === 'object'
      ? options.scheduleOptions
      : {};

    let historyHandler = null;

    function resolveFallbackResult() {
      return {
        didCapture: false,
        nextTimer: getTimer()
      };
    }

    function createHistoryHandler() {
      if (!historyApi || typeof historyApi.createStudioHistorySaveHandler !== 'function') {
        return null;
      }
      return historyApi.createStudioHistorySaveHandler({
        transactionApi,
        getPendingTransaction,
        setPendingTransaction,
        setPendingCanonicalDeck,
        setLiveCanonicalDeck,
        isCanonicalDeck,
        getTimer,
        setTimer,
        captureState,
        scheduleOptions
      });
    }

    return function saveHistoryState(debounce = false, transaction = null, canonicalDeck = null) {
      if (!historyHandler) {
        historyHandler = createHistoryHandler();
      }
      if (typeof historyHandler !== 'function') {
        return resolveFallbackResult();
      }
      return historyHandler(
        debounce,
        transaction,
        ...(arguments.length > 2 ? [canonicalDeck] : [])
      );
    };
  }

  function createStudioEditorHistoryEntryBuilder(options = {}) {
    const historyApi = options.historyApi && typeof options.historyApi === 'object'
      ? options.historyApi
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : () => null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : () => null;
    const getHistoryOptions = typeof options.getHistoryOptions === 'function'
      ? options.getHistoryOptions
      : () => ({});
    const resolveFallbackActiveSlideId = typeof options.resolveFallbackActiveSlideId === 'function'
      ? options.resolveFallbackActiveSlideId
      : () => '';
    const buildHistoryHtml = typeof options.buildHistoryHtml === 'function'
      ? options.buildHistoryHtml
      : () => '';
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const getSelectedElementIds = typeof options.getSelectedElementIds === 'function'
      ? options.getSelectedElementIds
      : () => [];
    const getPendingTransaction = typeof options.getPendingTransaction === 'function'
      ? options.getPendingTransaction
      : () => null;

    return function createHistoryEntry(doc) {
      if (!historyApi || typeof historyApi.buildStudioHistoryEntry !== 'function') {
        return null;
      }
      const pendingCanonicalDeck = getPendingCanonicalDeck();
      const historyCanonicalDeckBuilder = pendingCanonicalDeck
        ? (sourceDoc) => buildCanonicalDeck(sourceDoc, {
            canonicalDeckOverride: pendingCanonicalDeck
          })
        : buildCanonicalDeck;
      return historyApi.buildStudioHistoryEntry(doc, {
        getDocument,
        buildCanonicalDeck: historyCanonicalDeckBuilder,
        getHistoryOptions,
        resolveFallbackActiveSlideId,
        buildHistoryHtml,
        getActiveSlideId,
        getSelectedElementIds,
        transaction: getPendingTransaction()
      });
    };
  }

  function createStudioEditorHistoryEntryAdapter(options = {}) {
    const historyStateApi = options.historyStateApi && typeof options.historyStateApi === 'object'
      ? options.historyStateApi
      : null;
    const createHistoryEntryBuilder = typeof options.createHistoryEntryBuilder === 'function'
      ? options.createHistoryEntryBuilder
      : historyStateApi && typeof historyStateApi.createStudioEditorHistoryEntryBuilder === 'function'
        ? historyStateApi.createStudioEditorHistoryEntryBuilder
        : null;
    if (!createHistoryEntryBuilder) {
      return () => null;
    }

    const builderOptions = { ...options };
    delete builderOptions.historyStateApi;
    delete builderOptions.createHistoryEntryBuilder;
    const historyEntryBuilder = createHistoryEntryBuilder(builderOptions);
    return function createHistoryEntry(doc) {
      return typeof historyEntryBuilder === 'function'
        ? historyEntryBuilder(doc)
        : null;
    };
  }

  function createStudioEditorHistoryCaptureAdapter(options = {}) {
    const historyApi = options.historyApi && typeof options.historyApi === 'object'
      ? options.historyApi
      : null;
    const createHistoryEntry = typeof options.createHistoryEntry === 'function'
      ? options.createHistoryEntry
      : () => null;
    const getUndoStack = typeof options.getUndoStack === 'function'
      ? options.getUndoStack
      : () => [];
    const getRedoStack = typeof options.getRedoStack === 'function'
      ? options.getRedoStack
      : () => [];
    const getHistoryStateOptions = typeof options.getHistoryStateOptions === 'function'
      ? options.getHistoryStateOptions
      : () => ({});
    const setUndoStack = typeof options.setUndoStack === 'function'
      ? options.setUndoStack
      : () => {};
    const setRedoStack = typeof options.setRedoStack === 'function'
      ? options.setRedoStack
      : () => {};
    const updateHistoryButtons = typeof options.updateHistoryButtons === 'function'
      ? options.updateHistoryButtons
      : () => {};
    const clearPendingState = typeof options.clearPendingState === 'function'
      ? options.clearPendingState
      : () => {};

    let historyCapturer = null;

    function resolveFallbackResult() {
      clearPendingState();
      return {
        didCapture: false,
        undoStack: getUndoStack(),
        redoStack: getRedoStack(),
        historyEntry: null
      };
    }

    function createHistoryCapturer() {
      if (!historyApi || typeof historyApi.createStudioHistoryStateCapturer !== 'function') {
        return null;
      }
      return historyApi.createStudioHistoryStateCapturer({
        createHistoryEntry,
        getUndoStack,
        getRedoStack,
        getHistoryStateOptions,
        setUndoStack,
        setRedoStack,
        updateHistoryButtons,
        afterCapture: clearPendingState
      });
    }

    return function captureState() {
      if (!historyCapturer) {
        historyCapturer = createHistoryCapturer();
      }
      if (typeof historyCapturer !== 'function') {
        return resolveFallbackResult();
      }
      return historyCapturer();
    };
  }

  function createStudioEditorHistoryCaptureStateAdapter(options = {}) {
    const historyStateApi = options.historyStateApi && typeof options.historyStateApi === 'object'
      ? options.historyStateApi
      : null;
    const createHistoryCaptureAdapter = typeof options.createHistoryCaptureAdapter === 'function'
      ? options.createHistoryCaptureAdapter
      : historyStateApi && typeof historyStateApi.createStudioEditorHistoryCaptureAdapter === 'function'
        ? historyStateApi.createStudioEditorHistoryCaptureAdapter
        : null;
    const getUndoStack = typeof options.getUndoStack === 'function'
      ? options.getUndoStack
      : () => [];
    const getRedoStack = typeof options.getRedoStack === 'function'
      ? options.getRedoStack
      : () => [];
    const clearPendingState = typeof options.clearPendingState === 'function'
      ? options.clearPendingState
      : () => {};
    const fallbackCaptureState = () => {
      clearPendingState();
      return {
        didCapture: false,
        undoStack: getUndoStack(),
        redoStack: getRedoStack(),
        historyEntry: null
      };
    };
    if (!createHistoryCaptureAdapter) {
      return fallbackCaptureState;
    }

    const adapterOptions = { ...options };
    delete adapterOptions.historyStateApi;
    delete adapterOptions.createHistoryCaptureAdapter;
    const captureState = createHistoryCaptureAdapter(adapterOptions);
    return typeof captureState === 'function' ? captureState : fallbackCaptureState;
  }

  function createStudioEditorHistoryStepAdapter(options = {}) {
    const historyApi = options.historyApi && typeof options.historyApi === 'object'
      ? options.historyApi
      : null;
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
    const restoreHistoryEntry = typeof options.restoreHistoryEntry === 'function'
      ? options.restoreHistoryEntry
      : () => {};
    const updateHistoryButtons = typeof options.updateHistoryButtons === 'function'
      ? options.updateHistoryButtons
      : () => {};
    const triggerAutoSave = typeof options.triggerAutoSave === 'function'
      ? options.triggerAutoSave
      : () => {};

    const runners = {
      undo: null,
      redo: null
    };

    function resolveFallbackResult(direction) {
      return {
        [direction === 'undo' ? 'didUndo' : 'didRedo']: false,
        undoStack: getUndoStack(),
        redoStack: getRedoStack(),
        restoreEntry: null
      };
    }

    function createRunner(direction) {
      if (!historyApi || typeof historyApi.createStudioHistoryStepRunner !== 'function') {
        return null;
      }
      const isUndo = direction === 'undo';
      return historyApi.createStudioHistoryStepRunner({
        stepHistory: isUndo
          ? historyApi.stepStudioHistoryUndo
          : historyApi.stepStudioHistoryRedo,
        didStepKey: isUndo ? 'didUndo' : 'didRedo',
        getUndoStack,
        getRedoStack,
        setUndoStack,
        setRedoStack,
        restoreHistoryEntry,
        updateHistoryButtons,
        triggerAutoSave
      });
    }

    function run(direction) {
      if (typeof runners[direction] !== 'function') {
        runners[direction] = createRunner(direction);
      }
      if (typeof runners[direction] !== 'function') {
        return resolveFallbackResult(direction);
      }
      return runners[direction]();
    }

    return {
      undo: () => run('undo'),
      redo: () => run('redo')
    };
  }

  function createStudioEditorHistoryStepStateAdapter(options = {}) {
    const historyStateApi = options.historyStateApi && typeof options.historyStateApi === 'object'
      ? options.historyStateApi
      : null;
    const createHistoryStepAdapter = typeof options.createHistoryStepAdapter === 'function'
      ? options.createHistoryStepAdapter
      : historyStateApi && typeof historyStateApi.createStudioEditorHistoryStepAdapter === 'function'
        ? historyStateApi.createStudioEditorHistoryStepAdapter
        : null;
    if (!createHistoryStepAdapter) return null;

    const adapterOptions = { ...options };
    delete adapterOptions.historyStateApi;
    delete adapterOptions.createHistoryStepAdapter;
    const stepAdapter = createHistoryStepAdapter(adapterOptions);
    return stepAdapter && typeof stepAdapter === 'object' ? stepAdapter : null;
  }

  function createStudioEditorHistoryFrameHtmlBuilder(options = {}) {
    const historyApi = options.historyApi && typeof options.historyApi === 'object'
      ? options.historyApi
      : null;
    const getHistoryOptions = typeof options.getHistoryOptions === 'function'
      ? options.getHistoryOptions
      : () => ({});
    const buildPersistableDeckHtml = typeof options.buildPersistableDeckHtml === 'function'
      ? options.buildPersistableDeckHtml
      : () => '';

    return function buildHistoryFrameHtml(doc, buildOptions = {}) {
      const historyOptions = getHistoryOptions(buildOptions);
      const buildStudioHistoryCaptureHtml = historyApi
        && typeof historyApi.buildStudioHistoryCaptureHtml === 'function'
        ? historyApi.buildStudioHistoryCaptureHtml
        : null;
      if (!buildStudioHistoryCaptureHtml) return '';

      const buildFallbackHistoryHtml = (sourceDoc = doc) => sourceDoc
        ? buildPersistableDeckHtml(sourceDoc, {
            canonicalDeck: buildOptions.canonicalDeck
          })
        : '';
      return buildStudioHistoryCaptureHtml(doc, {
        frameOptions: historyOptions,
        canonicalDeck: buildOptions.canonicalDeck,
        buildFallbackHtml: buildFallbackHistoryHtml
      });
    };
  }

  function createStudioEditorHistoryFrameHtmlStateAdapter(options = {}) {
    const historyStateApi = options.historyStateApi && typeof options.historyStateApi === 'object'
      ? options.historyStateApi
      : null;
    const createFrameHtmlBuilder = typeof options.createFrameHtmlBuilder === 'function'
      ? options.createFrameHtmlBuilder
      : historyStateApi && typeof historyStateApi.createStudioEditorHistoryFrameHtmlBuilder === 'function'
        ? historyStateApi.createStudioEditorHistoryFrameHtmlBuilder
        : null;
    if (!createFrameHtmlBuilder) return null;

    const builderOptions = { ...options };
    delete builderOptions.historyStateApi;
    delete builderOptions.createFrameHtmlBuilder;
    const frameHtmlBuilder = createFrameHtmlBuilder(builderOptions);
    return typeof frameHtmlBuilder === 'function' ? frameHtmlBuilder : null;
  }

  return {
    createStudioEditorHistorySaveAdapter,
    createStudioEditorHistoryEntryBuilder,
    createStudioEditorHistoryEntryAdapter,
    createStudioEditorHistoryCaptureAdapter,
    createStudioEditorHistoryCaptureStateAdapter,
    createStudioEditorHistoryStepAdapter,
    createStudioEditorHistoryStepStateAdapter,
    createStudioEditorHistoryFrameHtmlBuilder,
    createStudioEditorHistoryFrameHtmlStateAdapter
  };
});

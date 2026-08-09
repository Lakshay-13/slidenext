(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioHistory = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isStudioHistoryCanonicalDeckLike(value) {
    return !!value
      && typeof value === 'object'
      && !Array.isArray(value)
      && Array.isArray(value.slides);
  }

  function isValidStudioHistoryCanonicalDeck(value, validator) {
    if (!value) return false;
    const validate = typeof validator === 'function'
      ? validator
      : isStudioHistoryCanonicalDeckLike;
    try {
      return validate(value) === true;
    } catch (err) {
      return false;
    }
  }

  function normalizeStudioHistoryFrameHtml(html = '') {
    const nextHtml = typeof html === 'string' ? html : '';
    if (!nextHtml) {
      return '';
    }

    const withoutDocType = nextHtml.replace(/^\s*<!doctype[^>]*>\s*/i, '');
    const htmlMatch = withoutDocType.match(/^\s*<html(?:\s[^>]*)?>([\s\S]*)<\/html>\s*$/i);
    return htmlMatch ? htmlMatch[1] : withoutDocType;
  }

  function normalizeStudioHistoryIdList(values = []) {
    const seenIds = new Set();
    if (!Array.isArray(values)) return [];

    return values.reduce((ids, value) => {
      const id = typeof value === 'string' ? value.trim() : value;
      if (!id || seenIds.has(id)) return ids;
      seenIds.add(id);
      ids.push(id);
      return ids;
    }, []);
  }

  function cloneStudioHistoryData(value) {
    if (!value || typeof value !== 'object') return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return value;
    }
  }

  function resolveStudioHistoryFrameHtml(historyEntry, options = {}) {
    const html = historyEntry && typeof historyEntry.html === 'string' ? historyEntry.html : '';
    if (html) {
      return normalizeStudioHistoryFrameHtml(html);
    }

    const canonicalDeck = historyEntry && historyEntry.canonicalDeck && typeof historyEntry.canonicalDeck === 'object'
      ? historyEntry.canonicalDeck
      : null;
    const buildDeckSourceHtml = typeof options.buildDeckSourceHtml === 'function'
      ? options.buildDeckSourceHtml
      : typeof globalThis !== 'undefined'
        && globalThis.SlideNextDeckHtml
        && typeof globalThis.SlideNextDeckHtml.buildDeckSourceHtml === 'function'
        ? globalThis.SlideNextDeckHtml.buildDeckSourceHtml
        : null;

    if (!canonicalDeck || !buildDeckSourceHtml) {
      return normalizeStudioHistoryFrameHtml(html);
    }

    const historyActiveSlideId = historyEntry && typeof historyEntry.activeSlideId === 'string'
      ? historyEntry.activeSlideId
      : '';
    const deckHtmlOptions = options.deckHtmlOptions && typeof options.deckHtmlOptions === 'object'
      ? options.deckHtmlOptions
      : {};
    const renderOptions = deckHtmlOptions.renderOptions && typeof deckHtmlOptions.renderOptions === 'object'
      ? deckHtmlOptions.renderOptions
      : {};
    const resolvedDeckHtmlOptions = {
      ...deckHtmlOptions,
      renderOptions: {
        preferSourceHtml: false,
        preferHeadSourceHtml: false,
        preferBodySourceHtml: false,
        preferSlideSourceHtml: false,
        preferNodeSourceHtml: false,
        ...(historyActiveSlideId && !renderOptions.activeSlideId
          ? { activeSlideId: historyActiveSlideId }
          : {}),
        ...renderOptions
      }
    };

    try {
      return normalizeStudioHistoryFrameHtml(
        buildDeckSourceHtml(canonicalDeck, resolvedDeckHtmlOptions)
      );
    } catch (err) {
      return normalizeStudioHistoryFrameHtml(html);
    }
  }

  function buildStudioHistoryFrameHtml(doc, options = {}) {
    if (!doc || !doc.documentElement) return '';

    const clone = doc.documentElement.cloneNode(true);
    const chromeNodeIds = Array.isArray(options.chromeNodeIds) ? options.chromeNodeIds : [];
    const removableClassNames = Array.isArray(options.removableClassNames) ? options.removableClassNames : [];
    const editorElementIdAttr = typeof options.editorElementIdAttr === 'string' ? options.editorElementIdAttr.trim() : '';
    const editorSlideIdAttr = typeof options.editorSlideIdAttr === 'string' ? options.editorSlideIdAttr.trim() : '';
    const sanitizeFrameRoot = typeof options.sanitizeFrameRoot === 'function'
      ? options.sanitizeFrameRoot
      : null;

    chromeNodeIds.forEach((nodeId) => {
      clone.querySelectorAll(`#${nodeId}`).forEach((node) => node.remove());
    });

    removableClassNames.forEach((className) => {
      clone.querySelectorAll(`.${className}`).forEach((el) => {
        el.classList.remove(className);
      });
    });

    [editorElementIdAttr, editorSlideIdAttr].filter(Boolean).forEach((attrName) => {
      clone.querySelectorAll(`[${attrName}]`).forEach((node) => {
        node.removeAttribute(attrName);
      });
    });

    if (sanitizeFrameRoot) {
      sanitizeFrameRoot(clone);
    }

    return clone.innerHTML;
  }

  function buildStudioHistoryCaptureHtml(doc, options = {}) {
    const frameOptions = options.frameOptions && typeof options.frameOptions === 'object'
      ? options.frameOptions
      : options;
    const frameHtml = buildStudioHistoryFrameHtml(doc, frameOptions);
    if (frameHtml) {
      return frameHtml;
    }

    const buildFallbackHtml = typeof options.buildFallbackHtml === 'function'
      ? options.buildFallbackHtml
      : () => '';
    return buildFallbackHtml(doc, options) || '';
  }

  function buildStudioHistoryEntry(doc, options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => doc;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : () => null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const getHistoryOptions = typeof options.getHistoryOptions === 'function'
      ? options.getHistoryOptions
      : () => ({});
    const resolveFallbackActiveSlideId = typeof options.resolveFallbackActiveSlideId === 'function'
      ? options.resolveFallbackActiveSlideId
      : () => '';
    const createHistoryEntry = typeof options.createHistoryEntry === 'function'
      ? options.createHistoryEntry
      : createStudioHistoryEntry;

    const nextDoc = doc || getDocument();
    let canonicalDeck = null;
    try {
      canonicalDeck = buildCanonicalDeck(nextDoc);
      if (!isValidStudioHistoryCanonicalDeck(canonicalDeck, isCanonicalDeck)) {
        canonicalDeck = null;
      }
    } catch (err) {
      // Preserve history capture for legacy or partially supported decks.
      canonicalDeck = null;
    }
    const historyOptions = getHistoryOptions();

    return createHistoryEntry(nextDoc, {
      ...historyOptions,
      getActiveSlideId: options.getActiveSlideId,
      getSelectedElementIds: options.getSelectedElementIds,
      activeSlideId: nextDoc ? '' : resolveFallbackActiveSlideId(nextDoc, canonicalDeck),
      selectedElementIds: [],
      buildHistoryHtml: options.buildHistoryHtml,
      canonicalDeck,
      isCanonicalDeck,
      transaction: options.transaction,
      preferCanonicalDeck: options.preferCanonicalDeck === true
    });
  }

  function createStudioHistoryEntry(doc, options = {}) {
    const buildHistoryHtml = typeof options.buildHistoryHtml === 'function'
      ? options.buildHistoryHtml
      : (sourceDoc, buildOptions) => buildStudioHistoryFrameHtml(sourceDoc, buildOptions);
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const getSelectedElementIds = typeof options.getSelectedElementIds === 'function'
      ? options.getSelectedElementIds
      : () => [];

    const activeSlideId = doc
      ? (getActiveSlideId(doc) || '')
      : (typeof options.activeSlideId === 'string' ? options.activeSlideId : '');
    const selectedElementIds = doc
      ? normalizeStudioHistoryIdList(getSelectedElementIds(doc))
      : normalizeStudioHistoryIdList(options.selectedElementIds);
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const candidateCanonicalDeck = options.canonicalDeck && typeof options.canonicalDeck === 'object'
      ? options.canonicalDeck
      : null;
    const canonicalDeck = isValidStudioHistoryCanonicalDeck(candidateCanonicalDeck, isCanonicalDeck)
      ? candidateCanonicalDeck
      : null;
    const transaction = normalizeStudioHistoryTransaction(options.transaction);
    const html = canonicalDeck && (transaction || options.preferCanonicalDeck === true)
      ? ''
      : normalizeStudioHistoryFrameHtml(buildHistoryHtml(doc, options));

    if (!doc && !html && !canonicalDeck) {
      return null;
    }

    const historyEntry = {
      html,
      activeSlideId,
      selectedElementIds,
      canonicalDeck
    };
    if (transaction) {
      historyEntry.transaction = transaction;
    }
    return historyEntry;
  }

  function normalizeStudioHistoryTransaction(transaction) {
    return transaction && typeof transaction === 'object' ? transaction : null;
  }

  function normalizeStudioHistoryEntry(entry) {
    if (!entry) {
      return { html: '', activeSlideId: '', selectedElementIds: [], canonicalDeck: null };
    }
    if (typeof entry === 'string') {
      return {
        html: normalizeStudioHistoryFrameHtml(entry),
        activeSlideId: '',
        selectedElementIds: [],
        canonicalDeck: null
      };
    }

    const candidateCanonicalDeck = entry.canonicalDeck && typeof entry.canonicalDeck === 'object'
      ? entry.canonicalDeck
      : null;
    const normalizedEntry = {
      html: normalizeStudioHistoryFrameHtml(entry.html || ''),
      activeSlideId: entry.activeSlideId || '',
      selectedElementIds: normalizeStudioHistoryIdList(entry.selectedElementIds),
      canonicalDeck: isValidStudioHistoryCanonicalDeck(candidateCanonicalDeck)
        ? cloneStudioHistoryData(candidateCanonicalDeck)
        : null
    };
    const transaction = normalizeStudioHistoryTransaction(entry.transaction);
    if (transaction) {
      normalizedEntry.transaction = cloneStudioHistoryData(transaction);
    }
    return normalizedEntry;
  }

  function areStudioHistoryEntriesEqual(a, b, options = {}) {
    const areIdListsEqual = typeof options.areIdListsEqual === 'function'
      ? options.areIdListsEqual
      : (left = [], right = []) => {
          if (left.length !== right.length) return false;
          return left.every((id, index) => id === right[index]);
        };
    const areCanonicalDecksEqual = typeof options.areCanonicalDecksEqual === 'function'
      ? options.areCanonicalDecksEqual
      : (left, right) => {
          if (left === right) return true;
          if (!left || !right) return !left && !right;
          try {
            return JSON.stringify(left) === JSON.stringify(right);
          } catch (err) {
            return false;
          }
        };

    const normalizedA = normalizeStudioHistoryEntry(a);
    const normalizedB = normalizeStudioHistoryEntry(b);

    return normalizedA.html === normalizedB.html
      && normalizedA.activeSlideId === normalizedB.activeSlideId
      && areIdListsEqual(normalizedA.selectedElementIds, normalizedB.selectedElementIds)
      && areCanonicalDecksEqual(normalizedA.canonicalDeck, normalizedB.canonicalDeck)
      && areCanonicalDecksEqual(normalizedA.transaction, normalizedB.transaction);
  }

  function captureStudioHistoryState(undoStack = [], redoStack = [], historyEntry, options = {}) {
    const normalizeEntry = typeof options.normalizeEntry === 'function'
      ? options.normalizeEntry
      : normalizeStudioHistoryEntry;
    const areEntriesEqual = typeof options.areEntriesEqual === 'function'
      ? options.areEntriesEqual
      : (left, right, compareOptions) => areStudioHistoryEntriesEqual(left, right, compareOptions);
    const maxUndoEntries = Number.isInteger(options.maxUndoEntries) && options.maxUndoEntries > 0
      ? options.maxUndoEntries
      : 50;

    const nextUndoStack = [...undoStack];
    const nextRedoStack = [...redoStack];
    if (!historyEntry) {
      return {
        undoStack: nextUndoStack,
        redoStack: nextRedoStack,
        didCapture: false
      };
    }

    const lastEntry = nextUndoStack.length > 0 ? normalizeEntry(nextUndoStack[nextUndoStack.length - 1]) : null;
    const normalizedHistoryEntry = normalizeEntry(historyEntry);
    if (lastEntry && areEntriesEqual(lastEntry, normalizedHistoryEntry, options)) {
      return {
        undoStack: nextUndoStack,
        redoStack: nextRedoStack,
        didCapture: false
      };
    }

    nextUndoStack.push(normalizedHistoryEntry);
    if (nextUndoStack.length > maxUndoEntries) {
      nextUndoStack.shift();
    }

    return {
      undoStack: nextUndoStack,
      redoStack: [],
      didCapture: true
    };
  }

  function createStudioHistoryStateCapturer(options = {}) {
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
    const afterCapture = typeof options.afterCapture === 'function'
      ? options.afterCapture
      : () => {};
    const captureHistoryState = typeof options.captureHistoryState === 'function'
      ? options.captureHistoryState
      : captureStudioHistoryState;

    return function captureHistoryStateAction() {
      const historyEntry = createHistoryEntry();
      const currentUndoStack = getUndoStack();
      const currentRedoStack = getRedoStack();
      if (!historyEntry) {
        afterCapture();
        return {
          undoStack: currentUndoStack,
          redoStack: currentRedoStack,
          historyEntry: null,
          didCapture: false
        };
      }

      const nextHistoryState = captureHistoryState(
        currentUndoStack,
        currentRedoStack,
        historyEntry,
        getHistoryStateOptions()
      );
      if (!nextHistoryState.didCapture) {
        afterCapture();
        return {
          ...nextHistoryState,
          historyEntry
        };
      }

      setUndoStack(nextHistoryState.undoStack);
      setRedoStack(nextHistoryState.redoStack);
      updateHistoryButtons();
      afterCapture();
      return {
        ...nextHistoryState,
        historyEntry
      };
    };
  }

  function createStudioHistoryStepRunner(options = {}) {
    const stepHistory = typeof options.stepHistory === 'function'
      ? options.stepHistory
      : () => ({});
    const didStepKey = typeof options.didStepKey === 'string' && options.didStepKey.trim()
      ? options.didStepKey
      : 'didStep';
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
    const flushPendingHistory = typeof options.flushPendingHistory === 'function'
      ? options.flushPendingHistory
      : () => {};

    return function runHistoryStep() {
      flushPendingHistory();
      const nextHistoryState = stepHistory(getUndoStack(), getRedoStack(), options);
      if (!nextHistoryState || !nextHistoryState[didStepKey]) {
        return nextHistoryState;
      }

      const restoreFailed = () => ({
        ...nextHistoryState,
        [didStepKey]: false,
        undoStack: getUndoStack(),
        redoStack: getRedoStack(),
        restoreEntry: null
      });
      let restoreResult;
      try {
        restoreResult = Object.prototype.hasOwnProperty.call(nextHistoryState, 'transaction')
          ? restoreHistoryEntry(nextHistoryState.restoreEntry, nextHistoryState.transaction)
          : restoreHistoryEntry(nextHistoryState.restoreEntry);
      } catch (err) {
        return restoreFailed();
      }
      if (restoreResult === false) return restoreFailed();

      setUndoStack(nextHistoryState.undoStack);
      setRedoStack(nextHistoryState.redoStack);
      updateHistoryButtons();
      triggerAutoSave();
      return nextHistoryState;
    };
  }

  function stepStudioHistoryUndo(undoStack = [], redoStack = []) {
    const nextUndoStack = [...undoStack];
    const nextRedoStack = [...redoStack];
    if (nextUndoStack.length <= 1) {
      return {
        undoStack: nextUndoStack,
        redoStack: nextRedoStack,
        restoreEntry: null,
        didUndo: false
      };
    }

    const currentState = nextUndoStack.pop();
    nextRedoStack.push(currentState);

    const nextHistoryState = {
      undoStack: nextUndoStack,
      redoStack: nextRedoStack,
      restoreEntry: nextUndoStack[nextUndoStack.length - 1] || null,
      didUndo: true
    };
    const transaction = normalizeStudioHistoryTransaction(currentState && currentState.transaction);
    if (transaction) {
      nextHistoryState.transaction = {
        transaction,
        direction: 'undo'
      };
    }
    return nextHistoryState;
  }

  function stepStudioHistoryRedo(undoStack = [], redoStack = []) {
    const nextUndoStack = [...undoStack];
    const nextRedoStack = [...redoStack];
    if (nextRedoStack.length === 0) {
      return {
        undoStack: nextUndoStack,
        redoStack: nextRedoStack,
        restoreEntry: null,
        didRedo: false
      };
    }

    const restoreEntry = nextRedoStack.pop();
    nextUndoStack.push(restoreEntry);

    const nextHistoryState = {
      undoStack: nextUndoStack,
      redoStack: nextRedoStack,
      restoreEntry,
      didRedo: true
    };
    const transaction = normalizeStudioHistoryTransaction(restoreEntry && restoreEntry.transaction);
    if (transaction) {
      nextHistoryState.transaction = {
        transaction,
        direction: 'redo'
      };
    }
    return nextHistoryState;
  }

  function getStudioHistoryButtonState(undoStack = [], redoStack = [], options = {}) {
    const minUndoStackLength = Number.isInteger(options.minUndoStackLength) && options.minUndoStackLength > 0
      ? options.minUndoStackLength
      : 2;

    return {
      undoDisabled: undoStack.length < minUndoStackLength,
      redoDisabled: redoStack.length === 0
    };
  }

  function createStudioHistoryButtonUpdater(options = {}) {
    const getUndoStack = typeof options.getUndoStack === 'function'
      ? options.getUndoStack
      : () => [];
    const getRedoStack = typeof options.getRedoStack === 'function'
      ? options.getRedoStack
      : () => [];
    const getUndoButton = typeof options.getUndoButton === 'function'
      ? options.getUndoButton
      : () => null;
    const getRedoButton = typeof options.getRedoButton === 'function'
      ? options.getRedoButton
      : () => null;
    const getHistoryButtonState = typeof options.getHistoryButtonState === 'function'
      ? options.getHistoryButtonState
      : getStudioHistoryButtonState;

    return function updateHistoryButtons() {
      const historyButtonState = getHistoryButtonState(getUndoStack(), getRedoStack(), options);
      const undoButton = getUndoButton();
      if (undoButton) {
        undoButton.disabled = historyButtonState.undoDisabled;
      }
      const redoButton = getRedoButton();
      if (redoButton) {
        redoButton.disabled = historyButtonState.redoDisabled;
      }
      return historyButtonState;
    };
  }

  function syncStudioHistoryButtons(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;

    return createStudioHistoryButtonUpdater({
      getUndoStack: () => options.undoStack,
      getRedoStack: () => options.redoStack,
      getUndoButton: () => documentRef.getElementById('studioUndoBtn'),
      getRedoButton: () => documentRef.getElementById('studioRedoBtn')
    })();
  }

  function scheduleStudioHistoryCapture(currentTimer, debounce, captureFn, options = {}) {
    const clearScheduledCapture = typeof options.clearScheduledCapture === 'function'
      ? options.clearScheduledCapture
      : (timerId) => clearTimeout(timerId);
    const scheduleCapture = typeof options.scheduleCapture === 'function'
      ? options.scheduleCapture
      : (callback, delayMs) => setTimeout(callback, delayMs);
    const debounceMs = Number.isInteger(options.debounceMs) && options.debounceMs >= 0
      ? options.debounceMs
      : 800;
    const hasCurrentTimer = currentTimer !== null && typeof currentTimer !== 'undefined';

    if (!debounce) {
      if (hasCurrentTimer) {
        clearScheduledCapture(currentTimer);
      }
      captureFn();
      return {
        nextTimer: null,
        didCapture: true
      };
    }

    if (hasCurrentTimer) {
      clearScheduledCapture(currentTimer);
    }

    return {
      nextTimer: scheduleCapture(() => {
        captureFn();
      }, debounceMs),
      didCapture: false
    };
  }

  function createStudioHistorySaveHandler(options = {}) {
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
      : isStudioHistoryCanonicalDeckLike;
    const getTimer = typeof options.getTimer === 'function'
      ? options.getTimer
      : () => null;
    const setTimer = typeof options.setTimer === 'function'
      ? options.setTimer
      : () => {};
    const captureState = typeof options.captureState === 'function'
      ? options.captureState
      : () => {};
    const scheduleCapture = typeof options.scheduleCapture === 'function'
      ? options.scheduleCapture
      : scheduleStudioHistoryCapture;
    const scheduleOptions = options.scheduleOptions && typeof options.scheduleOptions === 'object'
      ? options.scheduleOptions
      : {};

    return function saveHistoryState(debounce = false, transaction = null, canonicalDeck = null) {
      const hasCanonicalDeck = arguments.length > 2;
      let nextCanonicalDeck = hasCanonicalDeck && canonicalDeck && typeof canonicalDeck === 'object'
        ? canonicalDeck
        : null;
      if (nextCanonicalDeck && isCanonicalDeck) {
        try {
          if (!isCanonicalDeck(nextCanonicalDeck)) {
            nextCanonicalDeck = null;
          }
        } catch (err) {
          nextCanonicalDeck = null;
        }
      }
      setLiveCanonicalDeck(nextCanonicalDeck);
      setPendingCanonicalDeck(nextCanonicalDeck);
      const normalizedTransaction = transactionApi
        && typeof transactionApi.normalizeStudioEditorTransaction === 'function'
        ? transactionApi.normalizeStudioEditorTransaction(transaction)
        : transaction;
      if (normalizedTransaction) {
        const pendingTransaction = getPendingTransaction();
        const mergedTransaction = transactionApi
          && typeof transactionApi.mergeStudioEditorTransactions === 'function'
          ? transactionApi.mergeStudioEditorTransactions(pendingTransaction, normalizedTransaction)
          : transactionApi
            && typeof transactionApi.mergeStudioStyleTransactions === 'function'
              ? transactionApi.mergeStudioStyleTransactions(pendingTransaction, normalizedTransaction)
              : normalizedTransaction;
        setPendingTransaction(mergedTransaction);
      } else {
        setPendingTransaction(null);
      }

      const nextCaptureState = scheduleCapture(
        getTimer(),
        debounce,
        captureState,
        scheduleOptions
      );
      setTimer(nextCaptureState.nextTimer);
      return nextCaptureState;
    };
  }

  function restoreStudioHistoryTransaction(historyEntry, historyStep, options = {}) {
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const transaction = historyStep && historyStep.transaction;
    if (!transactionApi
      || !historyStep
      || !transaction
      || typeof transactionApi.applyStudioEditorTransaction !== 'function') {
      return null;
    }

    const getElementById = typeof options.getElementById === 'function'
      ? options.getElementById
      : () => null;
    const applyVisibilityState = typeof options.applyVisibilityState === 'function'
      ? options.applyVisibilityState
      : null;
    const applyMarkupState = typeof options.applyMarkupState === 'function'
      ? options.applyMarkupState
      : () => false;
    let transactionResult;
    try {
      transactionResult = transactionApi.applyStudioEditorTransaction(
        transaction,
        historyStep.direction,
        {
          getElementById,
          applyVisibilityState,
          applyMarkupState
        }
      );
    } catch (err) {
      return null;
    }
    if (!transactionResult || !transactionResult.didApply) return null;

    const onApplied = typeof options.onApplied === 'function'
      ? options.onApplied
      : null;
    return onApplied
      ? onApplied(transactionResult, historyEntry)
      : {
          didRestoreTransaction: true,
          transactionResult
        };
  }

  function restoreStudioHistoryActiveSlide(historyEntry, options = {}) {
    const restoreActiveSlideById = typeof options.restoreActiveSlideById === 'function'
      ? options.restoreActiveSlideById
      : () => false;
    const getSlideCount = typeof options.getSlideCount === 'function'
      ? options.getSlideCount
      : () => 0;
    const setActiveSlideByIndex = typeof options.setActiveSlideByIndex === 'function'
      ? options.setActiveSlideByIndex
      : () => {};
    const fallbackIndex = Number.isInteger(options.fallbackIndex) ? options.fallbackIndex : 0;

    if (historyEntry && historyEntry.activeSlideId && restoreActiveSlideById(historyEntry.activeSlideId)) {
      return {
        restoredById: true,
        restoredIndex: null
      };
    }

    const slideCount = getSlideCount();
    const nextIndex = slideCount === 0 ? 0 : Math.min(fallbackIndex, slideCount - 1);
    setActiveSlideByIndex(nextIndex);

    return {
      restoredById: false,
      restoredIndex: nextIndex
    };
  }

  function restoreStudioHistorySelectionState(historyEntry, options = {}) {
    const restoreCommittedSelectionState = typeof options.restoreCommittedSelectionState === 'function'
      ? options.restoreCommittedSelectionState
      : null;
    const restoreSelectionByIds = typeof options.restoreSelectionByIds === 'function'
      ? options.restoreSelectionByIds
      : () => {};
    const syncSelectionOverlay = typeof options.syncSelectionOverlay === 'function'
      ? options.syncSelectionOverlay
      : () => {};
    const syncInspectorForSelection = typeof options.syncInspectorForSelection === 'function'
      ? options.syncInspectorForSelection
      : () => {};
    const updateLayersList = typeof options.updateLayersList === 'function'
      ? options.updateLayersList
      : () => {};
    const observeDeckActiveSlideState = typeof options.observeDeckActiveSlideState === 'function'
      ? options.observeDeckActiveSlideState
      : () => {};
    const doc = options.doc || null;
    const selectedElementIds = historyEntry && Array.isArray(historyEntry.selectedElementIds)
      ? historyEntry.selectedElementIds.filter(Boolean)
      : [];

    if (restoreCommittedSelectionState) {
      restoreCommittedSelectionState(selectedElementIds, doc);
    } else {
      restoreSelectionByIds(selectedElementIds, doc);
      syncSelectionOverlay();
      syncInspectorForSelection();
      updateLayersList();
    }
    observeDeckActiveSlideState(doc);

    return {
      restoredSelectionIds: selectedElementIds,
      restoredSelectionCount: selectedElementIds.length
    };
  }

  function restoreStudioHistoryFrameSetup(historyEntry, options = {}) {
    const replaceFrameHtml = typeof options.replaceFrameHtml === 'function'
      ? options.replaceFrameHtml
      : (doc, html) => {
          if (doc && doc.documentElement) {
            doc.documentElement.innerHTML = html;
          }
        };
    const syncIframeTheme = typeof options.syncIframeTheme === 'function'
      ? options.syncIframeTheme
      : () => {};
    const makeElementsHoverable = typeof options.makeElementsHoverable === 'function'
      ? options.makeElementsHoverable
      : () => {};
    const setupIframeDragging = typeof options.setupIframeDragging === 'function'
      ? options.setupIframeDragging
      : () => {};
    const bindDeckNavigationSync = typeof options.bindDeckNavigationSync === 'function'
      ? options.bindDeckNavigationSync
      : () => {};
    const generateThumbnails = typeof options.generateThumbnails === 'function'
      ? options.generateThumbnails
      : () => {};
    const doc = options.doc || null;
    const html = resolveStudioHistoryFrameHtml(historyEntry, options);

    if (!html
      && historyEntry
      && historyEntry.canonicalDeck
      && typeof historyEntry.canonicalDeck === 'object') {
      return {
        didRestoreDoc: false,
        restoredHtmlLength: 0
      };
    }

    replaceFrameHtml(doc, html);
    syncIframeTheme(doc);
    makeElementsHoverable(doc);
    setupIframeDragging(doc);
    bindDeckNavigationSync(doc);
    generateThumbnails(doc);

    return {
      didRestoreDoc: !!doc,
      restoredHtmlLength: html.length
    };
  }

  function restoreStudioHistoryEntry(historyEntry, options = {}) {
    const restoreFrameSetup = typeof options.restoreFrameSetup === 'function'
      ? options.restoreFrameSetup
      : () => null;
    const restoreActiveSlide = typeof options.restoreActiveSlide === 'function'
      ? options.restoreActiveSlide
      : () => null;
    const restoreSelectionState = typeof options.restoreSelectionState === 'function'
      ? options.restoreSelectionState
      : () => null;

    return {
      frameSetup: restoreFrameSetup(historyEntry),
      activeSlide: restoreActiveSlide(historyEntry),
      selectionState: restoreSelectionState(historyEntry)
    };
  }

  return {
    normalizeStudioHistoryFrameHtml,
    buildStudioHistoryFrameHtml,
    buildStudioHistoryCaptureHtml,
    buildStudioHistoryEntry,
    createStudioHistoryEntry,
    normalizeStudioHistoryTransaction,
    normalizeStudioHistoryEntry,
    areStudioHistoryEntriesEqual,
    captureStudioHistoryState,
    createStudioHistoryStateCapturer,
    createStudioHistoryStepRunner,
    stepStudioHistoryUndo,
    stepStudioHistoryRedo,
    getStudioHistoryButtonState,
    createStudioHistoryButtonUpdater,
    syncStudioHistoryButtons,
    scheduleStudioHistoryCapture,
    createStudioHistorySaveHandler,
    restoreStudioHistoryTransaction,
    restoreStudioHistoryActiveSlide,
    restoreStudioHistorySelectionState,
    restoreStudioHistoryFrameSetup,
    restoreStudioHistoryEntry
  };
});

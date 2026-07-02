(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioHistory = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeStudioHistoryFrameHtml(html = '') {
    const nextHtml = typeof html === 'string' ? html : '';
    if (!nextHtml) {
      return '';
    }

    const withoutDocType = nextHtml.replace(/^\s*<!doctype[^>]*>\s*/i, '');
    const htmlMatch = withoutDocType.match(/^\s*<html(?:\s[^>]*)?>([\s\S]*)<\/html>\s*$/i);
    return htmlMatch ? htmlMatch[1] : withoutDocType;
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
      ? getSelectedElementIds(doc)
      : (Array.isArray(options.selectedElementIds) ? options.selectedElementIds.filter(Boolean) : []);
    const canonicalDeck = options.canonicalDeck && typeof options.canonicalDeck === 'object'
      ? options.canonicalDeck
      : null;
    const html = normalizeStudioHistoryFrameHtml(buildHistoryHtml(doc, options));

    if (!doc && !html && !canonicalDeck) {
      return null;
    }

    return {
      html,
      activeSlideId,
      selectedElementIds,
      canonicalDeck
    };
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

    return {
      html: normalizeStudioHistoryFrameHtml(entry.html || ''),
      activeSlideId: entry.activeSlideId || '',
      selectedElementIds: Array.isArray(entry.selectedElementIds) ? entry.selectedElementIds.filter(Boolean) : [],
      canonicalDeck: entry.canonicalDeck && typeof entry.canonicalDeck === 'object'
        ? entry.canonicalDeck
        : null
    };
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
      && areCanonicalDecksEqual(normalizedA.canonicalDeck, normalizedB.canonicalDeck);
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

    return {
      undoStack: nextUndoStack,
      redoStack: nextRedoStack,
      restoreEntry: nextUndoStack[nextUndoStack.length - 1] || null,
      didUndo: true
    };
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

    return {
      undoStack: nextUndoStack,
      redoStack: nextRedoStack,
      restoreEntry,
      didRedo: true
    };
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

    if (!debounce) {
      captureFn();
      return {
        nextTimer: currentTimer,
        didCapture: true
      };
    }

    if (currentTimer) {
      clearScheduledCapture(currentTimer);
    }

    return {
      nextTimer: scheduleCapture(() => {
        captureFn();
      }, debounceMs),
      didCapture: false
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
    createStudioHistoryEntry,
    normalizeStudioHistoryEntry,
    areStudioHistoryEntriesEqual,
    captureStudioHistoryState,
    stepStudioHistoryUndo,
    stepStudioHistoryRedo,
    getStudioHistoryButtonState,
    scheduleStudioHistoryCapture,
    restoreStudioHistoryActiveSlide,
    restoreStudioHistorySelectionState,
    restoreStudioHistoryFrameSetup,
    restoreStudioHistoryEntry
  };
});

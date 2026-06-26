(function (root, factory) {
  const liveSelection = typeof module === 'object' && module.exports
    ? require('./studio-editor-live-selection')
    : root && root.SlideNextStudioEditorLiveSelection;
  const nudge = typeof module === 'object' && module.exports
    ? require('./studio-editor-nudge')
    : root && root.SlideNextStudioEditorNudge;
  const api = factory(liveSelection, nudge);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorEvents = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (liveSelection, nudge) {
  function getFrameShortcutSelection(elements = []) {
    if (liveSelection && typeof liveSelection.getStudioLiveSelection === 'function') {
      return liveSelection.getStudioLiveSelection(elements);
    }
    return Array.isArray(elements)
      ? elements.filter((element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected))
      : [];
  }

  function createStudioFrameClickHandler(options = {}) {
    const isDraggingElement = typeof options.isDraggingElement === 'function'
      ? options.isDraggingElement
      : () => false;
    const shouldIgnoreTarget = typeof options.shouldIgnoreTarget === 'function'
      ? options.shouldIgnoreTarget
      : () => false;
    const resolveEditableTarget = typeof options.resolveEditableTarget === 'function'
      ? options.resolveEditableTarget
      : () => null;
    const selectElement = typeof options.selectElement === 'function'
      ? options.selectElement
      : () => {};
    const deselectElement = typeof options.deselectElement === 'function'
      ? options.deselectElement
      : () => {};

    return function studioFrameClickHandler(event) {
      if (isDraggingElement()) return;
      if (shouldIgnoreTarget(event && event.target ? event.target : null)) {
        return;
      }

      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }

      const target = resolveEditableTarget(event && event.target ? event.target : null);
      if (target) {
        const shouldToggle = !!(event && event.shiftKey);
        selectElement(target, {
          additive: shouldToggle,
          toggle: shouldToggle
        });
      } else {
        deselectElement();
      }
    };
  }

  function createStudioFrameKeydownHandler(options = {}) {
    const getActiveElement = typeof options.getActiveElement === 'function'
      ? options.getActiveElement
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const editorUndo = typeof options.editorUndo === 'function'
      ? options.editorUndo
      : () => {};
    const editorRedo = typeof options.editorRedo === 'function'
      ? options.editorRedo
      : () => {};
    const selectAllElementsOnActiveSlide = typeof options.selectAllElementsOnActiveSlide === 'function'
      ? options.selectAllElementsOnActiveSlide
      : () => {};
    const arrangeElementLayer = typeof options.arrangeElementLayer === 'function'
      ? options.arrangeElementLayer
      : () => {};
    const deselectElement = typeof options.deselectElement === 'function'
      ? options.deselectElement
      : () => {};
    const removeSelectedElement = typeof options.removeSelectedElement === 'function'
      ? options.removeSelectedElement
      : () => {};
    const copySelectedElements = typeof options.copySelectedElements === 'function'
      ? options.copySelectedElements
      : () => {};
    const pasteClipboardElements = typeof options.pasteClipboardElements === 'function'
      ? options.pasteClipboardElements
      : () => {};
    const duplicateSelectedElements = typeof options.duplicateSelectedElements === 'function'
      ? options.duplicateSelectedElements
      : () => {};
    const nudgeSelectedElements = typeof options.nudgeSelectedElements === 'function'
      ? options.nudgeSelectedElements
      : () => {};
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => true;
    const buildNudgeDeltaFromKey = nudge && typeof nudge.buildStudioNudgeDeltaFromKey === 'function'
      ? nudge.buildStudioNudgeDeltaFromKey
      : () => null;
    const isTypingContext = typeof options.isTypingContext === 'function'
      ? options.isTypingContext
      : (activeEl) => !!(activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable));

    return function studioFrameKeydownHandler(event) {
      const activeEl = getActiveElement();
      const typingContext = isTypingContext(activeEl);
      const loweredKey = typeof event.key === 'string' ? event.key.toLowerCase() : '';
      const isBracketShortcut = event.code === 'BracketLeft' || event.code === 'BracketRight';
      const deckShortcutReady = canMutateDeck();

      if (!typingContext && deckShortcutReady && (event.ctrlKey || event.metaKey) && loweredKey === 'z' && !event.shiftKey) {
        event.preventDefault();
        editorUndo();
        return;
      }
      if (!typingContext && deckShortcutReady && (event.ctrlKey || event.metaKey) && (loweredKey === 'y' || (loweredKey === 'z' && event.shiftKey))) {
        event.preventDefault();
        editorRedo();
        return;
      }

      if (typingContext) {
        return;
      }

      const selectedElements = getFrameShortcutSelection(getSelectedElements());
      const hasSelection = selectedElements.length > 0;

      if (deckShortcutReady && (event.ctrlKey || event.metaKey) && loweredKey === 'a') {
        event.preventDefault();
        event.stopPropagation();
        selectAllElementsOnActiveSlide();
        return;
      }
      if (deckShortcutReady && hasSelection && (event.ctrlKey || event.metaKey) && event.shiftKey && isBracketShortcut) {
        event.preventDefault();
        event.stopPropagation();
        arrangeElementLayer(event.code === 'BracketRight' ? 'front' : 'back');
        return;
      }
      if (deckShortcutReady && hasSelection && (event.ctrlKey || event.metaKey) && isBracketShortcut) {
        event.preventDefault();
        event.stopPropagation();
        arrangeElementLayer(event.code === 'BracketRight' ? 'forward' : 'backward');
        return;
      }
      if (hasSelection && event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        deselectElement();
        return;
      }
      if (deckShortcutReady && hasSelection && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault();
        event.stopPropagation();
        removeSelectedElement();
        return;
      }
      if (deckShortcutReady && (event.ctrlKey || event.metaKey) && loweredKey === 'c' && hasSelection) {
        event.preventDefault();
        event.stopPropagation();
        copySelectedElements();
        return;
      }
      if (deckShortcutReady && (event.ctrlKey || event.metaKey) && loweredKey === 'v') {
        event.preventDefault();
        event.stopPropagation();
        pasteClipboardElements();
        return;
      }
      if (deckShortcutReady && (event.ctrlKey || event.metaKey) && loweredKey === 'd' && hasSelection) {
        event.preventDefault();
        event.stopPropagation();
        duplicateSelectedElements();
        return;
      }
      const nudgeDelta = deckShortcutReady && hasSelection
        ? buildNudgeDeltaFromKey(event.key, { shiftKey: !!event.shiftKey })
        : null;
      if (nudgeDelta) {
        event.preventDefault();
        event.stopPropagation();
        nudgeSelectedElements(nudgeDelta.dx, nudgeDelta.dy);
        return;
      }

      if (deckShortcutReady && (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'ArrowLeft' || event.key === 'PageDown' || event.key === 'PageUp')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
  }

  function createStudioGlobalKeydownHandler(options = {}) {
    const isEditorActive = typeof options.isEditorActive === 'function'
      ? options.isEditorActive
      : () => false;
    const getActiveElement = typeof options.getActiveElement === 'function'
      ? options.getActiveElement
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const editorUndo = typeof options.editorUndo === 'function'
      ? options.editorUndo
      : () => {};
    const editorRedo = typeof options.editorRedo === 'function'
      ? options.editorRedo
      : () => {};
    const selectAllElementsOnActiveSlide = typeof options.selectAllElementsOnActiveSlide === 'function'
      ? options.selectAllElementsOnActiveSlide
      : () => {};
    const arrangeElementLayer = typeof options.arrangeElementLayer === 'function'
      ? options.arrangeElementLayer
      : () => {};
    const deselectElement = typeof options.deselectElement === 'function'
      ? options.deselectElement
      : () => {};
    const removeSelectedElement = typeof options.removeSelectedElement === 'function'
      ? options.removeSelectedElement
      : () => {};
    const copySelectedElements = typeof options.copySelectedElements === 'function'
      ? options.copySelectedElements
      : () => {};
    const pasteClipboardElements = typeof options.pasteClipboardElements === 'function'
      ? options.pasteClipboardElements
      : () => {};
    const duplicateSelectedElements = typeof options.duplicateSelectedElements === 'function'
      ? options.duplicateSelectedElements
      : () => {};
    const nudgeSelectedElements = typeof options.nudgeSelectedElements === 'function'
      ? options.nudgeSelectedElements
      : () => {};
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => true;
    const buildNudgeDeltaFromKey = nudge && typeof nudge.buildStudioNudgeDeltaFromKey === 'function'
      ? nudge.buildStudioNudgeDeltaFromKey
      : () => null;
    const isTypingContext = typeof options.isTypingContext === 'function'
      ? options.isTypingContext
      : (activeEl) => !!(activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable));

    return function studioGlobalKeydownHandler(event) {
      if (!isEditorActive()) {
        return;
      }

      const activeEl = getActiveElement();
      const typingContext = isTypingContext(activeEl);
      const loweredKey = typeof event.key === 'string' ? event.key.toLowerCase() : '';
      const isBracketShortcut = event.code === 'BracketLeft' || event.code === 'BracketRight';
      const selectedElements = getFrameShortcutSelection(getSelectedElements());
      const hasSelection = selectedElements.length > 0;
      const deckShortcutReady = canMutateDeck();

      if (!typingContext && deckShortcutReady && (event.ctrlKey || event.metaKey) && loweredKey === 'z' && !event.shiftKey) {
        event.preventDefault();
        editorUndo();
        return;
      }
      if (!typingContext && deckShortcutReady && (event.ctrlKey || event.metaKey) && (loweredKey === 'y' || (loweredKey === 'z' && event.shiftKey))) {
        event.preventDefault();
        editorRedo();
        return;
      }
      if (!typingContext && deckShortcutReady && (event.ctrlKey || event.metaKey) && loweredKey === 'a') {
        event.preventDefault();
        selectAllElementsOnActiveSlide();
        return;
      }
      if (!typingContext && deckShortcutReady && hasSelection && (event.ctrlKey || event.metaKey) && event.shiftKey && isBracketShortcut) {
        event.preventDefault();
        arrangeElementLayer(event.code === 'BracketRight' ? 'front' : 'back');
        return;
      }
      if (!typingContext && deckShortcutReady && hasSelection && (event.ctrlKey || event.metaKey) && isBracketShortcut) {
        event.preventDefault();
        arrangeElementLayer(event.code === 'BracketRight' ? 'forward' : 'backward');
        return;
      }
      if (!typingContext && hasSelection && event.key === 'Escape') {
        event.preventDefault();
        deselectElement();
        return;
      }
      if (!typingContext && deckShortcutReady && hasSelection && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault();
        removeSelectedElement();
        return;
      }
      if (!typingContext && deckShortcutReady && (event.ctrlKey || event.metaKey) && loweredKey === 'c' && hasSelection) {
        event.preventDefault();
        copySelectedElements();
        return;
      }
      if (!typingContext && deckShortcutReady && (event.ctrlKey || event.metaKey) && loweredKey === 'v') {
        event.preventDefault();
        pasteClipboardElements();
        return;
      }
      if (!typingContext && deckShortcutReady && (event.ctrlKey || event.metaKey) && loweredKey === 'd' && hasSelection) {
        event.preventDefault();
        duplicateSelectedElements();
        return;
      }
      const nudgeDelta = !typingContext && deckShortcutReady && hasSelection
        ? buildNudgeDeltaFromKey(event.key, { shiftKey: !!event.shiftKey })
        : null;
      if (nudgeDelta) {
        event.preventDefault();
        nudgeSelectedElements(nudgeDelta.dx, nudgeDelta.dy);
        return;
      }
    };
  }

  return {
    createStudioFrameClickHandler,
    createStudioFrameKeydownHandler,
    createStudioGlobalKeydownHandler
  };
});

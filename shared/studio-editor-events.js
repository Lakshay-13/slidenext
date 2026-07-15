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
    const consumeClickSuppression = typeof options.consumeClickSuppression === 'function'
      ? options.consumeClickSuppression
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
      if (consumeClickSuppression()) return;
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

  function createStudioMarqueePointerHandlers(options = {}) {
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const resolveEditableTarget = typeof options.resolveEditableTarget === 'function'
      ? options.resolveEditableTarget
      : () => null;
    const shouldIgnoreTarget = typeof options.shouldIgnoreTarget === 'function'
      ? options.shouldIgnoreTarget
      : () => false;
    const getSlideMetrics = typeof options.getSlideMetrics === 'function'
      ? options.getSlideMetrics
      : () => null;
    const getPointerOnSlide = typeof options.getPointerOnSlide === 'function'
      ? options.getPointerOnSlide
      : () => ({ x: 0, y: 0 });
    const getMarqueeElements = typeof options.getMarqueeElements === 'function'
      ? options.getMarqueeElements
      : () => [];
    const getMarqueeSelection = typeof options.getMarqueeSelection === 'function'
      ? options.getMarqueeSelection
      : () => [];
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const captureTarget = options.captureTarget || null;
    const dragStartThresholdPx = Number.isFinite(options.dragStartThresholdPx)
      ? options.dragStartThresholdPx
      : 3;
    let session = null;

    function isPrimaryPointer(event = {}) {
      return event.isPrimary !== false && (typeof event.button !== 'number' || event.button === 0);
    }

    function isSessionPointer(event = {}) {
      return !!session
        && (typeof event.pointerId !== 'number' || event.pointerId === session.pointerId);
    }

    function buildMarqueeRect(startPointer, pointer) {
      return {
        left: startPointer.x,
        top: startPointer.y,
        right: pointer.x,
        bottom: pointer.y
      };
    }

    function updateSession(event = {}) {
      if (!isSessionPointer(event)) {
        return false;
      }

      const pointer = getPointerOnSlide(event, session.slideMetrics);
      const clientX = Number.isFinite(event.clientX) ? event.clientX : session.startClientX;
      const clientY = Number.isFinite(event.clientY) ? event.clientY : session.startClientY;
      const moveDistanceScreen = Math.hypot(
        clientX - session.startClientX,
        clientY - session.startClientY
      );
      const rect = buildMarqueeRect(session.startPointer, pointer);
      if (!session.active && moveDistanceScreen < dragStartThresholdPx) {
        return false;
      }

      if (!session.active) {
        session.active = true;
        if (typeof options.onSessionStart === 'function') {
          options.onSessionStart(session);
        }
      }

      session.currentRect = rect;
      session.selection = getMarqueeSelection(
        getMarqueeElements(session.slide),
        rect,
        session
      );
      if (typeof options.onSessionFrame === 'function') {
        options.onSessionFrame(rect, session.selection, session);
      }
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      return true;
    }

    function releasePointerCapture(nextSession) {
      if (!captureTarget || typeof captureTarget.releasePointerCapture !== 'function') {
        return;
      }
      if (typeof captureTarget.hasPointerCapture === 'function'
        && !captureTarget.hasPointerCapture(nextSession.pointerId)) {
        return;
      }
      captureTarget.releasePointerCapture(nextSession.pointerId);
    }

    function finalizeSession(cancelled = false) {
      if (!session) {
        return false;
      }

      const finalizedSession = session;
      releasePointerCapture(finalizedSession);
      session = null;
      if (typeof options.onSessionFinalize === 'function') {
        options.onSessionFinalize({
          cancelled,
          didSelect: finalizedSession.active && !cancelled,
          rect: finalizedSession.currentRect,
          selection: finalizedSession.selection,
          additive: finalizedSession.additive
        }, finalizedSession);
      }
      return true;
    }

    function handlePointerDown(event = {}) {
      const slide = getActiveSlide();
      const target = event.target || null;
      if (session || !slide || !isPrimaryPointer(event)) {
        return false;
      }
      if (shouldIgnoreTarget(target) || resolveEditableTarget(target)) {
        return false;
      }
      if (target && typeof slide.contains === 'function' && !slide.contains(target)) {
        return false;
      }

      const slideMetrics = getSlideMetrics(slide);
      const startPointer = getPointerOnSlide(event, slideMetrics);
      session = {
        pointerId: event.pointerId,
        slide,
        slideMetrics,
        startPointer,
        startClientX: Number.isFinite(event.clientX) ? event.clientX : 0,
        startClientY: Number.isFinite(event.clientY) ? event.clientY : 0,
        additive: !!event.shiftKey,
        previousSelection: getSelectedElements(),
        active: false,
        currentRect: null,
        selection: []
      };

      if (captureTarget && typeof captureTarget.setPointerCapture === 'function'
        && typeof event.pointerId === 'number') {
        captureTarget.setPointerCapture(event.pointerId);
      }
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      return true;
    }

    function handlePointerMove(event = {}) {
      return updateSession(event);
    }

    function handlePointerUp(event = {}) {
      if (!isSessionPointer(event)) {
        return false;
      }
      updateSession(event);
      finalizeSession(false);
      return true;
    }

    function handlePointerCancel(event = {}) {
      if (!isSessionPointer(event)) {
        return false;
      }
      finalizeSession(true);
      return true;
    }

    function handleWindowBlur() {
      return finalizeSession(true);
    }

    return {
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      handlePointerCancel,
      handleWindowBlur,
      finalizeSession,
      getSession: () => session
    };
  }

  function createStudioMarqueeSelectionHandlers(options = {}) {
    const commitSelectionState = typeof options.commitSelectionState === 'function'
      ? options.commitSelectionState
      : () => {};
    const syncSelectionOverlay = typeof options.syncSelectionOverlay === 'function'
      ? options.syncSelectionOverlay
      : () => {};
    const setSuppressNextFrameClick = typeof options.setSuppressNextFrameClick === 'function'
      ? options.setSuppressNextFrameClick
      : () => {};

    return createStudioMarqueePointerHandlers({
      ...options,
      onSessionFinalize: (result, session) => {
        if (typeof options.onSelectionSessionFinalize === 'function') {
          options.onSelectionSessionFinalize(result, session);
        }
        if (result.cancelled || !result.didSelect) {
          syncSelectionOverlay();
          return;
        }

        const previousSelection = result.additive ? session.previousSelection : [];
        const nextSelection = Array.from(new Set([
          ...previousSelection,
          ...(result.selection || [])
        ]));
        commitSelectionState({
          selectedElements: nextSelection
        });
        setSuppressNextFrameClick(true);
      }
    });
  }

  function attachStudioPointerHandlers(doc, handlers, options = {}) {
    const body = doc && doc.body;
    if (!body || typeof body.addEventListener !== 'function' || !handlers) return false;

    if (options.preventNativeDrag && typeof doc.addEventListener === 'function') {
      doc.addEventListener('dragstart', (event) => {
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
      }, true);
    }

    [
      ['pointerdown', handlers.handlePointerDown],
      ['pointermove', handlers.handlePointerMove],
      ['pointerup', handlers.handlePointerUp],
      ['pointercancel', handlers.handlePointerCancel]
    ].forEach(([eventName, handler]) => {
      if (typeof handler === 'function') body.addEventListener(eventName, handler, true);
    });

    const frameWindow = doc.defaultView;
    if (frameWindow
      && typeof frameWindow.addEventListener === 'function'
      && typeof handlers.handleWindowBlur === 'function') {
      frameWindow.addEventListener('blur', handlers.handleWindowBlur, true);
    }
    return true;
  }

  function attachStudioMarqueePointerHandlers(doc, handlers) {
    return attachStudioPointerHandlers(doc, handlers);
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
    createStudioMarqueePointerHandlers,
    createStudioMarqueeSelectionHandlers,
    attachStudioPointerHandlers,
    attachStudioMarqueePointerHandlers,
    createStudioFrameKeydownHandler,
    createStudioGlobalKeydownHandler
  };
});

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorInlineEdit = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const EDITING_ATTRIBUTE = 'data-editor-inline-editing';

  function resolveStudioInlineTextEditTarget(node, slide, options = {}) {
    if (node && typeof node.closest === 'function' && node.closest('.editor-resize-handle')) {
      return null;
    }

    const selectedElements = Array.isArray(options.selectedElements)
      ? options.selectedElements
      : [];
    const selectionOverlaySelector = options.selectionOverlaySelector || '#editorSelectionOverlay';
    const selected = node && typeof node.closest === 'function'
      && node.closest(selectionOverlaySelector)
      ? selectedElements[0]
      : null;
    const textTagNames = options.textTagNames instanceof Set
      ? options.textTagNames
      : new Set(['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'pre', 'code', 'blockquote']);

    let current = selected || (node && node.nodeType === 1
      ? node
      : node && node.parentElement
        ? node.parentElement
        : null);
    while (current && current !== slide) {
      const tagName = typeof current.tagName === 'string'
        ? current.tagName.toLowerCase()
        : '';
      if (textTagNames.has(tagName)
        && (!slide || typeof slide.contains !== 'function' || slide.contains(current))) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  function createStudioInlineTextEditController(options = {}) {
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const resolveTextElement = typeof options.resolveTextElement === 'function'
      ? options.resolveTextElement
      : () => null;
    const resolveAdjacentTextElement = typeof options.resolveAdjacentTextElement === 'function'
      ? options.resolveAdjacentTextElement
      : null;
    const schedule = typeof options.schedule === 'function'
      ? options.schedule
      : (callback) => setTimeout(callback, 0);
    const canEdit = typeof options.canEdit === 'function'
      ? options.canEdit
      : () => true;
    const onStart = typeof options.onStart === 'function' ? options.onStart : () => {};
    const onCommit = typeof options.onCommit === 'function' ? options.onCommit : () => {};
    const onEnd = typeof options.onEnd === 'function' ? options.onEnd : () => {};
    let session = null;

    function setEditingState(element, enabled, editingSession = session) {
      if (!element) return;
      if (enabled) {
        if (typeof element.setAttribute === 'function') {
          element.setAttribute(EDITING_ATTRIBUTE, 'true');
          element.setAttribute('contenteditable', 'true');
        }
        element.contentEditable = 'true';
        element.spellcheck = false;
      } else {
        if (typeof element.removeAttribute === 'function') {
          element.removeAttribute(EDITING_ATTRIBUTE);
          if (editingSession && editingSession.previousContentEditableAttribute !== null) {
            element.setAttribute('contenteditable', editingSession.previousContentEditableAttribute);
          } else {
            element.removeAttribute('contenteditable');
          }
        }
        element.contentEditable = editingSession && editingSession.previousContentEditable
          ? editingSession.previousContentEditable
          : 'inherit';
        if (editingSession && typeof editingSession.previousSpellcheck === 'boolean') {
          element.spellcheck = editingSession.previousSpellcheck;
        }
      }
    }

    function removeSessionListeners(currentSession) {
      const element = currentSession && currentSession.element;
      if (!element || typeof element.removeEventListener !== 'function') return;
      element.removeEventListener('blur', currentSession.handleBlur);
      element.removeEventListener('keydown', currentSession.handleKeydown);
    }

    function endEditing(commit = true) {
      if (!session) return false;
      const currentSession = session;
      session = null;
      removeSessionListeners(currentSession);

      const element = currentSession.element;
      const nextText = typeof element.textContent === 'string' ? element.textContent : '';
      const didChange = nextText !== currentSession.previousText;
      if (commit && didChange) {
        // Restore the baseline before the callback so the existing mutation layer
        // can capture a reversible transaction from the original text.
        element.textContent = currentSession.previousText;
        onCommit({
          element,
          previousText: currentSession.previousText,
          text: nextText
        });
      } else if (!commit) {
        element.textContent = currentSession.previousText;
      }

      setEditingState(element, false, currentSession);
      onEnd({
        element,
        committed: commit && didChange,
        changed: didChange
      });
      return true;
    }

    function startEditing(element, event = null) {
      if (session || !element || !canEdit(element)) return false;
      const previousContentEditable = typeof element.contentEditable === 'string'
        ? element.contentEditable
        : '';
      const previousSpellcheck = typeof element.spellcheck === 'boolean'
        ? element.spellcheck
        : true;
      const currentSession = {
        element,
        previousText: typeof element.textContent === 'string' ? element.textContent : '',
        previousContentEditable,
        previousContentEditableAttribute: typeof element.getAttribute === 'function'
          ? element.getAttribute('contenteditable')
          : null,
        previousSpellcheck,
        handleBlur: () => endEditing(true),
        handleKeydown: (keyboardEvent) => {
          if (!keyboardEvent) return;
          if (keyboardEvent.key === 'Tab' && resolveAdjacentTextElement) {
            const adjacentElement = resolveAdjacentTextElement(currentSession.element, {
              direction: keyboardEvent.shiftKey ? -1 : 1,
              slide: getActiveSlide()
            });
            if (adjacentElement && adjacentElement !== currentSession.element && canEdit(adjacentElement)) {
              if (typeof keyboardEvent.preventDefault === 'function') keyboardEvent.preventDefault();
              endEditing(true);
              schedule(() => {
                startEditing(adjacentElement);
              });
              return;
            }
          }
          if (keyboardEvent.key === 'Escape') {
            if (typeof keyboardEvent.preventDefault === 'function') keyboardEvent.preventDefault();
            endEditing(false);
          } else if (keyboardEvent.key === 'Enter' && (keyboardEvent.metaKey || keyboardEvent.ctrlKey)) {
            if (typeof keyboardEvent.preventDefault === 'function') keyboardEvent.preventDefault();
            endEditing(true);
          }
        }
      };
      session = currentSession;
      setEditingState(element, true);
      if (typeof element.addEventListener === 'function') {
        element.addEventListener('blur', currentSession.handleBlur);
        element.addEventListener('keydown', currentSession.handleKeydown);
      }
      if (typeof element.focus === 'function') element.focus();
      if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
      }
      onStart({ element });
      return true;
    }

    function handleDoubleClick(event = {}) {
      const slide = getActiveSlide();
      if (!slide) return false;
      const element = resolveTextElement(event.target || null, slide);
      return startEditing(element, event);
    }

    return {
      startEditing,
      endEditing,
      handleDoubleClick,
      getSession: () => session
    };
  }

  function attachStudioInlineTextEditHandlers(doc, options = {}) {
    if (!doc || typeof doc.addEventListener !== 'function') return null;
    const controller = createStudioInlineTextEditController(options);
    doc.addEventListener('dblclick', controller.handleDoubleClick, true);
    return controller;
  }

  return {
    resolveStudioInlineTextEditTarget,
    createStudioInlineTextEditController,
    attachStudioInlineTextEditHandlers
  };
});

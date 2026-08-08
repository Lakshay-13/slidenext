const test = require('node:test');
const assert = require('node:assert/strict');

const inlineEdit = require('../shared/studio-editor-inline-edit.js');

test('resolveStudioInlineTextEditTarget climbs to an editable text node on the active slide', () => {
  const textElement = { tagName: 'P', parentElement: null };
  const child = { nodeType: 1, tagName: 'SPAN', parentElement: textElement };
  const slide = {
    contains(element) {
      return element === child || element === textElement;
    }
  };

  assert.equal(
    inlineEdit.resolveStudioInlineTextEditTarget(child, slide, { textTagNames: new Set(['p']) }),
    textElement
  );
});

test('resolveStudioInlineTextEditTarget uses the selected text node for overlay targets', () => {
  const selectedTextElement = { tagName: 'H2', parentElement: null };
  const overlay = {
    closest(selector) {
      return selector === '#editorSelectionOverlay' ? overlay : null;
    },
    nodeType: 1
  };
  const slide = {
    contains(element) {
      return element === selectedTextElement;
    }
  };

  assert.equal(
    inlineEdit.resolveStudioInlineTextEditTarget(overlay, slide, {
      selectedElements: [selectedTextElement],
      textTagNames: new Set(['h2'])
    }),
    selectedTextElement
  );
});

test('resolveStudioInlineTextEditTarget ignores resize handles and non-text nodes', () => {
  const resizeHandle = {
    closest(selector) {
      return selector === '.editor-resize-handle' ? resizeHandle : null;
    },
    nodeType: 1
  };
  const shape = { nodeType: 1, tagName: 'DIV', parentElement: null };
  const slide = { contains: () => true };

  assert.equal(inlineEdit.resolveStudioInlineTextEditTarget(resizeHandle, slide), null);
  assert.equal(inlineEdit.resolveStudioInlineTextEditTarget(shape, slide), null);
});

function createElement(text = 'Before') {
  const attributes = {};
  const listeners = {};
  return {
    textContent: text,
    contentEditable: 'inherit',
    spellcheck: true,
    focused: false,
    setAttribute(name, value) {
      attributes[name] = `${value}`;
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null;
    },
    removeAttribute(name) {
      delete attributes[name];
    },
    addEventListener(name, handler) {
      listeners[name] = handler;
    },
    removeEventListener(name, handler) {
      if (listeners[name] === handler) delete listeners[name];
    },
    focus() {
      this.focused = true;
    },
    dispatch(name, event = {}) {
      if (typeof listeners[name] === 'function') listeners[name](event);
    },
    attributes,
    listeners
  };
}

test('inline text editing commits through a reversible baseline and restores editing state', () => {
  const element = createElement();
  const slide = { id: 'slide-1' };
  const calls = [];
  const controller = inlineEdit.createStudioInlineTextEditController({
    getActiveSlide: () => slide,
    resolveTextElement: () => element,
    onStart: ({ element: startedElement }) => calls.push(['start', startedElement]),
    onCommit: (change) => {
      calls.push(['commit', change]);
      change.element.textContent = change.text;
    },
    onEnd: (result) => calls.push(['end', result])
  });

  const doubleClick = {
    target: element,
    preventDefault() {},
    stopPropagation() {}
  };
  assert.equal(controller.handleDoubleClick(doubleClick), true);
  assert.equal(element.contentEditable, 'true');
  assert.equal(element.getAttribute('data-editor-inline-editing'), 'true');
  assert.equal(element.getAttribute('contenteditable'), 'true');
  assert.equal(element.focused, true);
  assert.equal(calls[0][0], 'start');

  element.textContent = 'After';
  element.dispatch('blur');

  assert.equal(element.textContent, 'After');
  assert.equal(element.contentEditable, 'inherit');
  assert.equal(element.getAttribute('data-editor-inline-editing'), null);
  assert.equal(element.getAttribute('contenteditable'), null);
  assert.deepEqual(calls[1][1], {
    element,
    previousText: 'Before',
    text: 'After'
  });
  assert.deepEqual(calls[2][1], {
    element,
    committed: true,
    changed: true
  });
});

test('inline text editing cancels with Escape and refuses locked elements', () => {
  const element = createElement();
  let commitCalls = 0;
  const controller = inlineEdit.createStudioInlineTextEditController({
    getActiveSlide: () => ({ id: 'slide-1' }),
    resolveTextElement: () => element,
    canEdit: () => true,
    onCommit: () => {
      commitCalls += 1;
    }
  });

  assert.equal(controller.startEditing(element), true);
  element.textContent = 'Changed';
  let prevented = false;
  element.dispatch('keydown', {
    key: 'Escape',
    preventDefault() {
      prevented = true;
    }
  });
  assert.equal(prevented, true);
  assert.equal(element.textContent, 'Before');
  assert.equal(commitCalls, 0);

  const lockedController = inlineEdit.createStudioInlineTextEditController({
    canEdit: () => false
  });
  assert.equal(lockedController.startEditing(element), false);
});

test('attachStudioInlineTextEditHandlers installs a capture-phase double-click handler', () => {
  let registration = null;
  const doc = {
    addEventListener(name, handler, capture) {
      registration = [name, handler, capture];
    }
  };
  const controller = inlineEdit.attachStudioInlineTextEditHandlers(doc, {});

  assert.equal(typeof controller.handleDoubleClick, 'function');
  assert.deepEqual(registration.slice(0, 2), ['dblclick', controller.handleDoubleClick]);
  assert.equal(registration[2], true);
});

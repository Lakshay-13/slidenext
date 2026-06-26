const test = require('node:test');
const assert = require('node:assert/strict');

const studioElementState = require('../shared/studio-element-state.js');

function createStyle(initialDisplay = '') {
  return {
    display: initialDisplay,
    removePropertyCalls: [],
    removeProperty(name) {
      this.removePropertyCalls.push(name);
      if (name === 'display') {
        this.display = '';
      }
    }
  };
}

function createElement(options = {}) {
  const attributes = { ...(options.attributes || {}) };
  return {
    dataset: { ...(options.dataset || {}) },
    hidden: !!options.hidden,
    style: options.style || createStyle(options.display || ''),
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null;
    },
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    removeAttribute(name) {
      delete attributes[name];
    }
  };
}

test('isStudioElementLocked reads the existing editor lock dataset contract', () => {
  assert.equal(studioElementState.isStudioElementLocked(createElement({
    dataset: { editorLocked: 'true' }
  })), true);
  assert.equal(studioElementState.isStudioElementLocked(createElement()), false);
});

test('setStudioElementLockedState writes and clears the existing editor lock dataset contract', () => {
  const el = createElement();

  studioElementState.setStudioElementLockedState(el, true);
  assert.equal(el.dataset.editorLocked, 'true');
  assert.equal(studioElementState.isStudioElementLocked(el), true);

  studioElementState.setStudioElementLockedState(el, false);
  assert.equal(Object.prototype.hasOwnProperty.call(el.dataset, 'editorLocked'), false);
  assert.equal(studioElementState.isStudioElementLocked(el), false);
});

test('isStudioElementHidden treats either dataset or hidden attribute state as hidden', () => {
  assert.equal(studioElementState.isStudioElementHidden(createElement({
    dataset: { editorHidden: 'true' }
  })), true);
  assert.equal(studioElementState.isStudioElementHidden(createElement({
    hidden: true
  })), true);
  assert.equal(studioElementState.isStudioElementHidden(createElement()), false);
});

test('setStudioElementHiddenState hides an element using both editor dataset and hidden attribute state', () => {
  const el = createElement({
    display: 'flex'
  });

  studioElementState.setStudioElementHiddenState(el, true);

  assert.equal(el.dataset.editorPrevDisplay, 'flex');
  assert.equal(el.dataset.editorPrevAriaHidden, '');
  assert.equal(el.dataset.editorHidden, 'true');
  assert.equal(el.hidden, true);
  assert.equal(el.getAttribute('aria-hidden'), 'true');
  assert.equal(el.style.display, 'none');
});

test('setStudioElementHiddenState restores a hidden element and clears persisted editor visibility state', () => {
  const el = createElement({
    hidden: true,
    style: createStyle('none'),
    dataset: {
      editorHidden: 'true',
      editorPrevDisplay: 'grid',
      editorPrevAriaHidden: ''
    }
  });

  studioElementState.setStudioElementHiddenState(el, false);

  assert.equal(el.hidden, false);
  assert.equal(el.getAttribute('aria-hidden'), null);
  assert.equal(Object.prototype.hasOwnProperty.call(el.dataset, 'editorHidden'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(el.dataset, 'editorPrevDisplay'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(el.dataset, 'editorPrevAriaHidden'), false);
  assert.equal(el.style.display, 'grid');
});

test('setStudioElementHiddenState clears a hidden attribute loaded from disk even without editorPrevDisplay state', () => {
  const style = createStyle('none');
  const el = createElement({
    hidden: true,
    style,
    attributes: {
      'aria-hidden': 'true'
    }
  });

  studioElementState.setStudioElementHiddenState(el, false);

  assert.equal(el.hidden, false);
  assert.equal(el.getAttribute('aria-hidden'), null);
  assert.equal(style.display, '');
  assert.deepEqual(style.removePropertyCalls, ['display']);
});

test('setStudioElementHiddenState restores a pre-existing aria-hidden value after unhide', () => {
  const el = createElement({
    attributes: {
      'aria-hidden': 'false'
    }
  });

  studioElementState.setStudioElementHiddenState(el, true);
  studioElementState.setStudioElementHiddenState(el, false);

  assert.equal(el.getAttribute('aria-hidden'), 'false');
});

function createClassList(initialValues = []) {
  const values = new Set(initialValues);
  return {
    contains(value) {
      return values.has(value);
    },
    remove(...entries) {
      entries.forEach((entry) => values.delete(entry));
    }
  };
}

function createSanitizableElement(options = {}) {
  const element = createElement({
    hidden: options.hidden,
    dataset: options.dataset,
    style: options.style,
    attributes: options.attributes
  });

  element.nodeType = 1;
  element.classList = createClassList(options.classNames || []);
  element.removeAttributeCalls = [];
  const baseRemoveAttribute = element.removeAttribute.bind(element);
  element.removeAttribute = function removeAttribute(name) {
    this.removeAttributeCalls.push(name);
    baseRemoveAttribute(name);
  };
  element.querySelectorAll = () => options.descendants || [];

  return element;
}

test('sanitizeStudioDuplicatedSubtree removes editor ids and clears managed hidden and locked state', () => {
  const child = createSanitizableElement({
    hidden: true,
    dataset: {
      editorHidden: 'true',
      editorPrevDisplay: 'grid',
      editorPrevAriaHidden: '',
      editorLocked: 'true'
    },
    style: createStyle('none'),
    attributes: {
      'aria-hidden': 'true'
    },
    classNames: ['editor-dragging']
  });
  const root = createSanitizableElement({
    attributes: {
      id: 'hero-card',
      'data-editor-id': 'node-1'
    },
    classNames: ['editor-selected'],
    descendants: [child]
  });

  studioElementState.sanitizeStudioDuplicatedSubtree(root, {
    editorElementIdAttr: 'data-editor-id',
    transientClassNames: ['editor-selected', 'editor-dragging']
  });

  assert.deepEqual(root.removeAttributeCalls, ['id', 'data-editor-id']);
  assert.equal(root.classList.contains('editor-selected'), false);
  assert.equal(child.classList.contains('editor-dragging'), false);
  assert.equal(child.hidden, false);
  assert.equal(child.getAttribute('aria-hidden'), null);
  assert.equal(child.style.display, 'grid');
  assert.equal(Object.prototype.hasOwnProperty.call(child.dataset, 'editorHidden'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(child.dataset, 'editorPrevDisplay'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(child.dataset, 'editorPrevAriaHidden'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(child.dataset, 'editorLocked'), false);
});

test('sanitizeStudioDuplicatedSubtree clears hidden state for older hidden nodes that only carry DOM hidden state', () => {
  const child = createSanitizableElement({
    hidden: true,
    style: createStyle('none'),
    attributes: {
      'aria-hidden': 'true'
    }
  });
  const root = createSanitizableElement({
    descendants: [child]
  });

  studioElementState.sanitizeStudioDuplicatedSubtree(root);

  assert.equal(child.hidden, false);
  assert.equal(child.getAttribute('aria-hidden'), null);
  assert.equal(child.style.display, '');
});

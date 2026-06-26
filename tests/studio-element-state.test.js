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
  return {
    dataset: { ...(options.dataset || {}) },
    hidden: !!options.hidden,
    style: options.style || createStyle(options.display || '')
  };
}

test('isStudioElementLocked reads the existing editor lock dataset contract', () => {
  assert.equal(studioElementState.isStudioElementLocked(createElement({
    dataset: { editorLocked: 'true' }
  })), true);
  assert.equal(studioElementState.isStudioElementLocked(createElement()), false);
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
  assert.equal(el.dataset.editorHidden, 'true');
  assert.equal(el.hidden, true);
  assert.equal(el.style.display, 'none');
});

test('setStudioElementHiddenState restores a hidden element and clears persisted editor visibility state', () => {
  const el = createElement({
    hidden: true,
    style: createStyle('none'),
    dataset: {
      editorHidden: 'true',
      editorPrevDisplay: 'grid'
    }
  });

  studioElementState.setStudioElementHiddenState(el, false);

  assert.equal(el.hidden, false);
  assert.equal(Object.prototype.hasOwnProperty.call(el.dataset, 'editorHidden'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(el.dataset, 'editorPrevDisplay'), false);
  assert.equal(el.style.display, 'grid');
});

test('setStudioElementHiddenState clears a hidden attribute loaded from disk even without editorPrevDisplay state', () => {
  const style = createStyle('none');
  const el = createElement({
    hidden: true,
    style
  });

  studioElementState.setStudioElementHiddenState(el, false);

  assert.equal(el.hidden, false);
  assert.equal(style.display, '');
  assert.deepEqual(style.removePropertyCalls, ['display']);
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
  const attributes = { ...(options.attributes || {}) };
  const element = createElement({
    hidden: options.hidden,
    dataset: options.dataset,
    style: options.style
  });

  element.nodeType = 1;
  element.classList = createClassList(options.classNames || []);
  element.removeAttributeCalls = [];
  element.removeAttribute = function removeAttribute(name) {
    this.removeAttributeCalls.push(name);
    delete attributes[name];
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
      editorLocked: 'true'
    },
    style: createStyle('none'),
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
  assert.equal(child.style.display, 'grid');
  assert.equal(Object.prototype.hasOwnProperty.call(child.dataset, 'editorHidden'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(child.dataset, 'editorPrevDisplay'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(child.dataset, 'editorLocked'), false);
});

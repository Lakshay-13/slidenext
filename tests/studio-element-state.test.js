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

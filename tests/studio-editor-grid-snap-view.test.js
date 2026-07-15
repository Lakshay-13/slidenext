const test = require('node:test');
const assert = require('node:assert/strict');

const gridSnapView = require('../shared/studio-editor-grid-snap-view.js');

test('renderStudioGridSnapState updates text and pressed state', () => {
  const button = {
    textContent: '',
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
  const documentRef = {
    getElementById(id) {
      return id === 'toggleGridSnapBtn' ? button : null;
    }
  };

  assert.equal(gridSnapView.renderStudioGridSnapState({ documentRef, isEnabled: false }), true);
  assert.equal(button.textContent, 'Grid Snap: Off');
  assert.equal(button.attributes['aria-pressed'], 'false');

  assert.equal(gridSnapView.renderStudioGridSnapState({ documentRef, isEnabled: true }), true);
  assert.equal(button.textContent, 'Grid Snap: On');
  assert.equal(button.attributes['aria-pressed'], 'true');
});

test('renderStudioGridSnapState safely skips missing toolbar chrome', () => {
  assert.equal(gridSnapView.renderStudioGridSnapState(), false);
});

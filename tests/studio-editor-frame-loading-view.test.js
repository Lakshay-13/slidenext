const test = require('node:test');
const assert = require('node:assert/strict');

const frameLoadingView = require('../shared/studio-editor-frame-loading-view.js');

function createClassList() {
  const values = new Set(['hidden']);
  return {
    add(value) {
      values.add(value);
    },
    remove(value) {
      values.delete(value);
    },
    contains(value) {
      return values.has(value);
    }
  };
}

test('frame loading view exposes loading, error, and ready states', () => {
  const attributes = {};
  const loadingEl = {
    classList: createClassList(),
    setAttribute(name, value) {
      attributes[name] = value;
    }
  };
  const iconEl = { classList: createClassList() };
  const textEl = { textContent: '' };
  const documentRef = {
    getElementById(id) {
      return id === 'studioFrameLoading'
        ? loadingEl
        : id === 'studioFrameLoadingText'
          ? textEl
          : id === 'studioFrameLoadingIcon'
            ? iconEl
            : null;
    }
  };

  assert.equal(frameLoadingView.setStudioEditorFrameLoadingState({ documentRef, state: 'loading' }), true);
  assert.equal(loadingEl.classList.contains('hidden'), false);
  assert.equal(iconEl.classList.contains('animate-spin'), true);
  assert.equal(textEl.textContent, 'Loading presentation...');
  assert.deepEqual(attributes, { 'aria-busy': 'true', 'aria-hidden': 'false' });

  frameLoadingView.setStudioEditorFrameLoadingState({ documentRef, state: 'error' });
  assert.equal(textEl.textContent, 'Unable to initialize this presentation.');
  assert.equal(iconEl.classList.contains('animate-spin'), false);
  assert.deepEqual(attributes, { 'aria-busy': 'false', 'aria-hidden': 'false' });

  frameLoadingView.setStudioEditorFrameLoadingState({ documentRef, state: 'ready' });
  assert.equal(loadingEl.classList.contains('hidden'), true);
  assert.equal(textEl.textContent, 'Presentation ready');
  assert.deepEqual(attributes, { 'aria-busy': 'false', 'aria-hidden': 'true' });
});

test('frame loading view fails closed when the overlay is unavailable', () => {
  assert.equal(frameLoadingView.setStudioEditorFrameLoadingState({
    documentRef: { getElementById() { return null; } },
    state: 'loading'
  }), false);
});

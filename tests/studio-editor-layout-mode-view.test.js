const test = require('node:test');
const assert = require('node:assert/strict');
const layoutModeView = require('../shared/studio-editor-layout-mode-view.js');

function createDocument() {
  const label = {
    textContent: '',
    title: '',
    dataset: {}
  };
  return {
    label,
    documentRef: {
      getElementById(id) {
        assert.equal(id, 'canvasLayoutModeLabel');
        return label;
      }
    }
  };
}

test('syncStudioEditorLayoutModeLabel renders structured and freeform states', () => {
  const { documentRef, label } = createDocument();

  assert.equal(layoutModeView.syncStudioEditorLayoutModeLabel({
    documentRef,
    mode: 'flow'
  }), true);
  assert.equal(label.textContent, 'Structured layout');
  assert.equal(label.dataset.layoutMode, 'flow');
  assert.match(label.title, /normal document flow/);

  assert.equal(layoutModeView.syncStudioEditorLayoutModeLabel({
    documentRef,
    mode: 'freeform'
  }), true);
  assert.equal(label.textContent, 'Freeform canvas');
  assert.equal(label.dataset.layoutMode, 'absolute');
  assert.match(label.title, /explicit slide coordinates/);

  assert.equal(layoutModeView.syncStudioEditorLayoutModeLabel({
    documentRef,
    mode: 'mixed'
  }), true);
  assert.equal(label.textContent, 'Mixed layout');
  assert.equal(label.dataset.layoutMode, 'mixed');
  assert.match(label.title, /document flow.*explicit slide coordinates/);
});

test('syncStudioEditorLayoutModeLabel reports unavailable mode without mutating deck state', () => {
  const { documentRef, label } = createDocument();

  assert.equal(layoutModeView.syncStudioEditorLayoutModeLabel({ documentRef, mode: '' }), true);
  assert.equal(label.textContent, 'Layout unavailable');
  assert.equal(label.dataset.layoutMode, 'unknown');
});

test('syncStudioEditorLayoutModeLabel fails closed when the control is missing', () => {
  assert.equal(layoutModeView.syncStudioEditorLayoutModeLabel({
    documentRef: { getElementById: () => null },
    mode: 'flow'
  }), false);
});

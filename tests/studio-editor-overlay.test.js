const test = require('node:test');
const assert = require('node:assert/strict');

const overlayView = require('../shared/studio-editor-overlay.js');

function createOverlay() {
  const classes = new Set();
  const hiddenHandle = { style: {} };
  return {
    style: {},
    classList: {
      add(value) {
        classes.add(value);
      },
      remove(value) {
        classes.delete(value);
      },
      contains(value) {
        return classes.has(value);
      }
    },
    querySelectorAll(selector) {
      assert.equal(selector, '.editor-resize-handle');
      return [hiddenHandle];
    },
    hiddenHandle
  };
}

test('renderStudioMarqueeSelection positions the shared selection overlay and hides resize handles', () => {
  const overlay = createOverlay();
  const slide = {
    querySelector(selector) {
      assert.equal(selector, '#editorSelectionOverlay');
      return overlay;
    }
  };

  const result = overlayView.renderStudioMarqueeSelection({}, slide, {
    left: 80,
    top: 60,
    right: 20,
    bottom: 10
  });

  assert.equal(result, overlay);
  assert.equal(overlay.classList.contains('drag-preview'), true);
  assert.deepEqual(overlay.style, {
    display: 'block',
    pointerEvents: 'none',
    left: '20px',
    top: '10px',
    width: '60px',
    height: '50px'
  });
  assert.equal(overlay.hiddenHandle.style.display, 'none');
});

test('clearStudioMarqueeSelection hides the existing selection overlay', () => {
  const overlay = createOverlay();
  overlay.classList.add('drag-preview');
  overlay.style.display = 'block';
  const slide = {
    querySelector(selector) {
      assert.equal(selector, '#editorSelectionOverlay');
      return overlay;
    }
  };

  assert.equal(overlayView.clearStudioMarqueeSelection(slide), true);
  assert.equal(overlay.classList.contains('drag-preview'), false);
  assert.equal(overlay.style.display, 'none');
});

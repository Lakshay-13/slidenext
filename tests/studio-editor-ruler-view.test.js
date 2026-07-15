const test = require('node:test');
const assert = require('node:assert/strict');

const rulerView = require('../shared/studio-editor-ruler-view.js');

test('syncStudioCanvasRulers forwards the canvas document and zoom factor', () => {
  const horizontal = {
    ownerDocument: {
      createElement() {
        return { style: {}, className: '', textContent: '' };
      }
    },
    replaceChildren() {},
    appendChild() {}
  };
  const vertical = {
    ownerDocument: horizontal.ownerDocument,
    replaceChildren() {},
    appendChild() {}
  };
  const documentRef = {
    getElementById(id) {
      return {
        canvasStage: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
        canvasWrapper: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
        canvasRulerHorizontal: horizontal,
        canvasRulerVertical: vertical
      }[id] || null;
    }
  };

  assert.equal(rulerView.syncStudioCanvasRulers({ documentRef, zoomFactor: 0.5 }), true);
});

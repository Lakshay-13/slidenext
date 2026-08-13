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

test('syncStudioCanvasRulers renders custom canvas bounds', () => {
  const rendered = { horizontal: [], vertical: [] };
  function createContainer(axis) {
    return {
      ownerDocument: {
        createElement() {
          return { style: {}, className: '', textContent: '' };
        }
      },
      replaceChildren() {
        rendered[axis].length = 0;
      },
      appendChild(node) {
        rendered[axis].push(node);
      }
    };
  }
  const horizontal = createContainer('horizontal');
  const vertical = createContainer('vertical');
  const documentRef = {
    getElementById(id) {
      return {
        canvasStage: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
        canvasWrapper: {
          clientWidth: 1280,
          clientHeight: 720,
          getBoundingClientRect: () => ({ left: 0, top: 0 })
        },
        canvasRulerHorizontal: horizontal,
        canvasRulerVertical: vertical
      }[id] || null;
    }
  };

  assert.equal(rulerView.syncStudioCanvasRulers({ documentRef, zoomFactor: 1 }), true);
  assert.equal(rendered.horizontal.at(-1).style.left, '1280px');
  assert.equal(rendered.vertical.at(-1).style.top, '720px');
});

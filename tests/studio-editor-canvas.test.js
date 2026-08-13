const test = require('node:test');
const assert = require('node:assert/strict');

const canvas = require('../shared/studio-editor-canvas.js');

test('resolveStudioCanvasDimensions prefers canonical pixel layout size', () => {
  const wrapper = {
    clientWidth: 1920,
    clientHeight: 1080,
    style: {}
  };

  assert.deepEqual(
    canvas.resolveStudioCanvasDimensions({
      wrapper,
      canonicalDeck: {
        layout: {
          size: { width: 1280, height: 720, unit: 'px' }
        }
      }
    }),
    { width: 1280, height: 720 }
  );
});

test('resolveStudioCanvasDimensions ignores unsupported canonical units', () => {
  assert.deepEqual(
    canvas.resolveStudioCanvasDimensions({
      wrapper: {
        clientWidth: 1440,
        clientHeight: 900,
        style: {}
      },
      canonicalDeck: {
        layout: {
          size: { width: 10, height: 5, unit: 'in' }
        }
      }
    }),
    { width: 1440, height: 900 }
  );
});

test('applyStudioCanvasDimensions updates logical canvas and zoomed scroll bounds', () => {
  const nodes = {
    canvasWrapper: { style: {} },
    studioFrame: { style: {} },
    canvasScrollContainer: { style: {} }
  };
  const result = canvas.applyStudioCanvasDimensions({
    documentRef: { getElementById: id => nodes[id] || null },
    canonicalDeck: {
      layout: {
        size: { width: 1280, height: 720, unit: 'px' }
      }
    },
    zoomFactor: 0.75
  });

  assert.deepEqual(result, {
    didApply: true,
    dimensions: { width: 1280, height: 720 },
    zoomFactor: 0.75
  });
  assert.equal(nodes.canvasWrapper.style.width, '1280px');
  assert.equal(nodes.canvasWrapper.style.height, '720px');
  assert.equal(nodes.studioFrame.style.width, '1280px');
  assert.equal(nodes.studioFrame.style.height, '720px');
  assert.equal(nodes.canvasScrollContainer.style.width, '960px');
  assert.equal(nodes.canvasScrollContainer.style.height, '540px');
});

test('index applies canonical canvas dimensions after frame initialization', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.match(indexHtml, /function syncStudioEditorCanvasDimensions\(\)/);
  assert.match(indexHtml, /syncStudioEditorCanvasDimensions\(\);/);
  assert.match(indexHtml, /setStudioFrameLoadingState\('ready'\)/);
});

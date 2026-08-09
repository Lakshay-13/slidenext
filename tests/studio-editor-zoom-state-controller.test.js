const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zoomController = require('../shared/studio-editor-zoom-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('zoom controller owns zoom state when no external state callbacks are supplied', () => {
  const controller = zoomController.createStudioEditorZoomController({
    initialZoomFactor: 0.5,
    zoomApi: {
      applyStudioZoom(options) {
        assert.equal(options.zoomFactor, 0.5);
        return { didApply: true, zoomFactor: 0.75 };
      }
    }
  });

  assert.equal(controller.getZoomFactor(), 0.5);
  assert.deepEqual(controller.apply('75%'), { didApply: true, zoomFactor: 0.75 });
  assert.equal(controller.getZoomFactor(), 0.75);
});

test('editor wiring leaves zoom state ownership to the shared controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /initialZoomFactor: 1\.0/
  );
  assert.doesNotMatch(fileContent, /let zoomFactor = 1\.0/);
  assert.doesNotMatch(fileContent, /getZoomFactor: \(\) => zoomFactor/);
  assert.doesNotMatch(fileContent, /zoomFactor = nextZoomFactor/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const accessorsApi = require('../shared/studio-editor-zoom-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const ACCESSORS_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-zoom-accessors.js');

test('zoom accessors delegate the complete zoom command surface', () => {
  const calls = [];
  const controller = {
    syncRulers: () => {
      calls.push(['syncRulers']);
      return true;
    },
    apply: (value) => {
      calls.push(['apply', value]);
      return { didApply: true };
    },
    zoomIn: (applyZoom) => {
      calls.push(['zoomIn']);
      applyZoom('1.05');
      return true;
    },
    zoomOut: (applyZoom) => {
      calls.push(['zoomOut']);
      applyZoom('0.95');
      return true;
    },
    zoomSelectChange: (value, applyZoom) => {
      calls.push(['zoomSelectChange', value]);
      applyZoom(value);
      return true;
    }
  };
  const accessors = accessorsApi.createStudioEditorZoomAccessors({
    zoomController: controller
  });

  assert.equal(accessors.syncCanvasRulers(), true);
  assert.deepEqual(accessors.applyZoom('fit'), { didApply: true });
  assert.equal(accessors.zoomIn(), true);
  assert.equal(accessors.zoomOut(), true);
  assert.equal(accessors.zoomSelectChange('1.2'), true);
  assert.deepEqual(calls, [
    ['syncRulers'],
    ['apply', 'fit'],
    ['zoomIn'],
    ['apply', '1.05'],
    ['zoomOut'],
    ['apply', '0.95'],
    ['zoomSelectChange', '1.2'],
    ['apply', '1.2']
  ]);
});

test('zoom accessors preserve safe no-controller fallbacks', () => {
  const accessors = accessorsApi.createStudioEditorZoomAccessors();

  assert.equal(accessors.syncCanvasRulers(), false);
  assert.equal(accessors.applyZoom('1.0'), undefined);
  assert.equal(accessors.zoomIn(), false);
  assert.equal(accessors.zoomOut(), false);
  assert.equal(accessors.zoomSelectChange('1.0'), false);
});

test('zoom accessors publish the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(ACCESSORS_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorZoomAccessors, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorZoomAccessors
      .createStudioEditorZoomAccessors,
    'function'
  );
});

test('editor loads zoom accessors after the zoom runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-zoom-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /createStudioEditorZoomAccessors\(/);
  assert.match(fileContent, /studioEditorZoomAccessors/);
});

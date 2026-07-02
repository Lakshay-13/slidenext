const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('applyZoom tolerates a missing zoom select while fitting the canvas', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyZoomSource = extractFunctionSource(
    fileContent,
    'function applyZoom(scaleVal) {',
    '\n\n    function zoomIn() {'
  );

  const stage = {
    clientWidth: 1400,
    clientHeight: 900
  };
  const scroller = {
    style: {}
  };
  const wrapper = {
    style: {}
  };
  const calls = [];
  const context = {
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        switch (id) {
          case 'canvasStage':
            return stage;
          case 'canvasScrollContainer':
            return scroller;
          case 'canvasWrapper':
            return wrapper;
          case 'zoomSelect':
            return null;
          default:
            return null;
        }
      }
    },
    localStorage: {
      setItem(key, value) {
        calls.push(['localStorage.setItem', key, value]);
      }
    },
    zoomFactor: 1
  };

  vm.createContext(context);
  vm.runInContext(applyZoomSource, context);

  assert.doesNotThrow(() => context.applyZoom('fit'));
  assert.ok(Number.isFinite(context.zoomFactor));
  assert.ok(context.zoomFactor >= 0.15 && context.zoomFactor <= 1.5);
  assert.equal(typeof scroller.style.width, 'string');
  assert.equal(typeof scroller.style.height, 'string');
  assert.match(wrapper.style.transform, /scale\(/);
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'zoomSelect'));
  assert.ok(calls.some(([name, key, value]) => name === 'localStorage.setItem' && key === 'presentationZoom' && value === 'fit'));
});

function createZoomControls() {
  return {
    zoomOutBtn: { disabled: true },
    zoomSelect: { disabled: true, value: '1.0' },
    zoomInBtn: { disabled: true }
  };
}

test('updateZoomActionState enables zoom controls only when the iframe has a live active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateZoomActionStateSource = extractFunctionSource(
    fileContent,
    'function updateZoomActionState(doc = getIframeDoc()) {',
    '\n\n    function updateWallpaperActionState(doc = getIframeDoc()) {'
  );

  const controls = createZoomControls();
  const inactiveDoc = { activeSlide: null };
  const activeDoc = { activeSlide: { id: 'slide-1' } };
  let currentDoc = inactiveDoc;
  const context = {
    document: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    getIframeDoc() {
      return currentDoc;
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateZoomActionStateSource, context);

  context.updateZoomActionState();
  assert.deepEqual(
    [controls.zoomOutBtn.disabled, controls.zoomSelect.disabled, controls.zoomInBtn.disabled],
    [true, true, true]
  );

  currentDoc = activeDoc;
  context.updateZoomActionState();
  assert.deepEqual(
    [controls.zoomOutBtn.disabled, controls.zoomSelect.disabled, controls.zoomInBtn.disabled],
    [false, false, false]
  );
});

test('zoom helpers no-op safely when the zoom control is unavailable or disabled', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const zoomInSource = extractFunctionSource(
    fileContent,
    'function zoomIn() {',
    '\n\n    function zoomOut() {'
  );
  const zoomOutSource = extractFunctionSource(
    fileContent,
    'function zoomOut() {',
    '\n\n    function zoomSelectChange(val) {'
  );
  const zoomSelectChangeSource = extractFunctionSource(
    fileContent,
    'function zoomSelectChange(val) {',
    '\n\n    // 5. Undo/Redo Engine'
  );

  let zoomSelect = null;
  let applyZoomCalls = 0;
  const context = {
    document: {
      getElementById(id) {
        assert.equal(id, 'zoomSelect');
        return zoomSelect;
      }
    },
    applyZoom() {
      applyZoomCalls += 1;
    },
    zoomFactor: 1
  };

  vm.createContext(context);
  vm.runInContext(zoomInSource, context);
  vm.runInContext(zoomOutSource, context);
  vm.runInContext(zoomSelectChangeSource, context);

  assert.equal(context.zoomIn(), false);
  assert.equal(context.zoomOut(), false);
  assert.equal(context.zoomSelectChange('1.2'), true);

  zoomSelect = { disabled: true, value: '1.0' };
  assert.equal(context.zoomIn(), false);
  assert.equal(context.zoomOut(), false);
  assert.equal(context.zoomSelectChange('1.2'), false);
  assert.equal(applyZoomCalls, 1);
});

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

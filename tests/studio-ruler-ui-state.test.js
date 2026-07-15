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

function createRulerContainer(ownerDocument) {
  return {
    ownerDocument,
    children: [],
    replaceChildren() {
      this.children = [];
    },
    appendChild(child) {
      this.children.push(child);
    }
  };
}

test('syncCanvasRulers renders zoomed ticks against the visible canvas wrapper offset', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function syncCanvasRulers() {',
    '\n\n    // 4. Zoom Engine'
  );
  const ownerDocument = {
    createElement() {
      return {
        className: '',
        textContent: '',
        style: {}
      };
    }
  };
  const horizontal = createRulerContainer(ownerDocument);
  const vertical = createRulerContainer(ownerDocument);
  const stage = {
    getBoundingClientRect() {
      return { left: 100, top: 200 };
    }
  };
  const wrapper = {
    getBoundingClientRect() {
      return { left: 80, top: 180 };
    }
  };
  const nodes = new Map([
    ['canvasStage', stage],
    ['canvasWrapper', wrapper],
    ['canvasRulerHorizontal', horizontal],
    ['canvasRulerVertical', vertical]
  ]);
  const context = {
    document: {
      getElementById(id) {
        return nodes.get(id) || null;
      }
    },
    zoomFactor: 0.5,
    SlideNextStudioEditorRulerView: require('../shared/studio-editor-ruler-view.js')
  };
  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.syncCanvasRulers(), true);
  assert.equal(horizontal.children[0].style.left, '-20px');
  assert.equal(horizontal.children[1].textContent, '0');
  assert.equal(horizontal.children[2].style.left, '-10px');
  assert.equal(vertical.children[0].style.top, '-20px');
  assert.equal(vertical.children[1].textContent, '0');
  assert.equal(vertical.children[2].style.top, '-10px');
});

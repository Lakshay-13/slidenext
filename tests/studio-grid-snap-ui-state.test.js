const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const gridSnapView = require('../shared/studio-editor-grid-snap-view.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('toggleGridSnap updates the button state and toggles the editor grid preference', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateGridSnapActionState() {',
    '\n\n    // Theme Toggle Functionality'
  );
  const button = {
    textContent: '',
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
  const context = {
    document: {
      getElementById(id) {
        assert.equal(id, 'toggleGridSnapBtn');
        return button;
      }
    },
    isGridSnapEnabled: false
  };
  vm.createContext(context);
  context.SlideNextStudioEditorGridSnapView = gridSnapView;
  vm.runInContext(source, context);

  context.updateGridSnapActionState();
  assert.equal(button.textContent, 'Grid Snap: Off');
  assert.equal(button.attributes['aria-pressed'], 'false');

  assert.equal(context.toggleGridSnap(), true);
  assert.equal(button.textContent, 'Grid Snap: On');
  assert.equal(button.attributes['aria-pressed'], 'true');
});

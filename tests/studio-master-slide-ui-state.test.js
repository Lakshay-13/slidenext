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

test('renderSavedMasterSlides renders options, base-node counts, and the empty state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function renderSavedMasterSlides(masterSlides = [], activeMasterSlideId = \'\') {',
    '\n\n    function updateTemplateActionState'
  );
  const select = {
    children: [],
    set textContent(value) {
      this.children = [];
      this.value = value;
    },
    appendChild(child) {
      this.children.push(child);
    }
  };
  const list = {
    children: [],
    set textContent(value) {
      this.children = [];
      this.value = value;
    },
    appendChild(child) {
      this.children.push(child);
    }
  };
  const context = {
    document: {
      getElementById(id) {
        return id === 'masterSlideSelect' ? select : list;
      },
      createElement() {
        return {
          textContent: '',
          value: '',
          children: [],
          addEventListener() {},
          appendChild(child) {
            this.children.push(child);
          },
          setAttribute() {}
        };
      }
    },
    getActiveSlide: () => ({})
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.renderSavedMasterSlides([
    { id: 'brand', name: '<Brand>', slide: { nodes: [{ id: 'footer' }] } }
  ], 'brand'), true);
  assert.equal(select.children[1].value, 'brand');
  assert.equal(select.children[1].textContent, '<Brand>');
  assert.equal(list.children[0].children[0].textContent, '<Brand> - 1 base element');
  assert.equal(context.renderSavedMasterSlides([], ''), true);
  assert.equal(list.children[0].textContent, 'No master layouts saved');
});

test('master layout actions delegate save, apply, and removal to the controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function saveActiveSlideAsMaster() {',
    '\n\n    function nudgeSelectedElements'
  );
  const input = { value: '  Brand Base  ' };
  const select = { value: 'brand' };
  const calls = [];
  const context = {
    document: {
      getElementById(id) {
        if (id === 'masterSlideNameInput') return input;
        if (id === 'masterSlideSelect') return select;
        return null;
      }
    },
    studioEditorMasterSlideController: {
      saveActiveSlide(payload) {
        calls.push(['save', payload.name]);
        return { masterSlides: [] };
      },
      assignMasterSlide(id) {
        calls.push(['apply', id]);
        return true;
      },
      removeMasterSlide(id) {
        calls.push(['remove', id]);
        return true;
      }
    },
    updateMasterSlideActionState() {
      calls.push(['refresh']);
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.saveActiveSlideAsMaster(), true);
  assert.equal(context.applySelectedMasterSlide(), true);
  assert.equal(context.removeSavedMasterSlide('old-brand'), true);
  assert.deepEqual(calls, [
    ['save', 'Brand Base'],
    ['refresh'],
    ['apply', 'brand'],
    ['refresh'],
    ['remove', 'old-brand'],
    ['refresh']
  ]);
  assert.equal(input.value, '');
});

test('updateMasterSlideActionState reflects the active slide reference', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateMasterSlideActionState(doc = getIframeDoc()) {',
    '\n\n    function updateBlockActionState'
  );
  const elements = {
    saveActiveSlideMasterBtn: { disabled: false },
    masterSlideNameInput: { disabled: false },
    masterSlideSelect: { disabled: false },
    applyMasterSlideBtn: { disabled: false }
  };
  let rendered = null;
  const context = {
    document: {
      getElementById(id) {
        return elements[id] || null;
      }
    },
    getActiveSlide: () => ({}),
    getActiveSlideId: () => 'slide-1',
    buildEditorCanonicalDeck: () => ({
      slides: [{ id: 'slide-1', masterSlideId: 'brand' }],
      masterSlides: [{ id: 'brand', name: 'Brand' }]
    }),
    renderSavedMasterSlides(masterSlides, activeMasterSlideId) {
      rendered = { masterSlides, activeMasterSlideId };
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.updateMasterSlideActionState({}), true);
  assert.equal(elements.masterSlideSelect.disabled, false);
  assert.deepEqual(rendered, {
    masterSlides: [{ id: 'brand', name: 'Brand' }],
    activeMasterSlideId: 'brand'
  });
});

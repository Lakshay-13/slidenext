const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const masterSlideView = require('../shared/studio-editor-master-slide-view.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('shared master-slide view wires apply and remove actions to injected callbacks', () => {
  const select = {
    children: [],
    textContent: '',
    appendChild(child) {
      this.children.push(child);
    }
  };
  const list = {
    children: [],
    textContent: '',
    appendChild(child) {
      this.children.push(child);
    }
  };
  const events = [];
  const documentRef = {
    getElementById(id) {
      return id === 'masterSlideSelect' ? select : list;
    },
    createElement() {
      return {
        children: [],
        addEventListener(type, handler) {
          events.push({ type, handler });
        },
        appendChild(child) {
          this.children.push(child);
        },
        setAttribute() {}
      };
    }
  };
  const calls = [];

  assert.equal(masterSlideView.renderStudioMasterSlideLibrary({
    documentRef,
    masterSlides: [{ id: 'brand', name: 'Brand', slide: { nodes: [{ id: 'footer' }] } }],
    activeMasterSlideId: 'brand',
    canApply: true,
    applyMasterSlide(masterId) {
      calls.push(['apply', masterId]);
    },
    removeMasterSlide(masterId) {
      calls.push(['remove', masterId]);
    }
  }), true);

  events.find((event) => event.type === 'click').handler();
  events.reverse().find((event) => event.type === 'click').handler();
  assert.deepEqual(calls, [['apply', 'brand'], ['remove', 'brand']]);
});

test('shared master-slide state sync updates controls before rendering the library', () => {
  const select = {
    disabled: false,
    children: [],
    textContent: '',
    value: '',
    appendChild(child) {
      this.children.push(child);
    }
  };
  const controls = {
    saveActiveSlideMasterBtn: { disabled: false },
    masterSlideNameInput: { disabled: false },
    masterSlideSelect: select,
    applyMasterSlideBtn: { disabled: false }
  };
  const list = {
    children: [],
    textContent: '',
    appendChild(child) {
      this.children.push(child);
    }
  };
  const documentRef = {
    getElementById(id) {
      return controls[id] || (id === 'savedMasterSlidesList' ? list : null);
    },
    createElement() {
      return {
        textContent: '',
        children: [],
        appendChild(child) {
          this.children.push(child);
        },
        addEventListener() {},
        setAttribute() {}
      };
    }
  };

  assert.equal(masterSlideView.syncStudioMasterSlideState({
    documentRef,
    masterSlides: [],
    canUseMasterActions: false
  }), true);
  assert.equal(controls.saveActiveSlideMasterBtn.disabled, true);
  assert.equal(controls.masterSlideNameInput.disabled, true);
  assert.equal(controls.masterSlideSelect.disabled, true);
  assert.equal(controls.applyMasterSlideBtn.disabled, true);
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
    SlideNextStudioEditorMasterSlideView: {
      syncStudioMasterSlideState(options) {
        rendered = {
          masterSlides: options.masterSlides,
          activeMasterSlideId: options.activeMasterSlideId
        };
      }
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

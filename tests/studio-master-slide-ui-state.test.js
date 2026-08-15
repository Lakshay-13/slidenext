const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const masterSlideView = require('../shared/studio-editor-master-slide-view.js');
const masterSlideState = require('../shared/studio-editor-master-slide-state.js');
const canonicalSlide = require('../shared/studio-editor-canonical-slide.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function runSourceWithCanonicalUi(source, context) {
  context.SlideNextStudioEditorMasterSlideState = masterSlideState;
  context.SlideNextStudioEditorCanonicalSlide ??= canonicalSlide;
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolverSource = extractFunctionSource(
    fileContent,
    'function resolveEditorUiCanonicalDeck(doc = getIframeDoc()) {',
    '\n\n    function buildEditorMutationCanonicalDeck'
  );
  const canonicalUiSource = fs.readFileSync(
    path.join(__dirname, '..', 'shared', 'studio-editor-canonical-ui.js'),
    'utf8'
  );
  vm.runInContext(`${canonicalUiSource}\n${resolverSource}\n${source}`, context);
}

test('master-slide runtime wiring prefers the live canonical deck resolver', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const runtimeStart = fileContent.indexOf('const studioEditorMasterSlideRuntime =');
  const runtimeEnd = fileContent.indexOf('const studioEditorMasterSlideController =', runtimeStart);
  assert.notEqual(runtimeStart, -1);
  assert.notEqual(runtimeEnd, -1);

  const runtimeSource = fileContent.slice(runtimeStart, runtimeEnd);
  const callbackStart = runtimeSource.indexOf('getCanonicalDeck:');
  const callbackEnd = runtimeSource.indexOf('\n          getCanonicalDeckBaseline', callbackStart);
  assert.notEqual(callbackStart, -1);
  assert.notEqual(callbackEnd, -1);

  const callbackExpression = runtimeSource
    .slice(callbackStart + 'getCanonicalDeck:'.length, callbackEnd)
    .trim()
    .replace(/,$/, '');
  const sourceDoc = { id: 'master-runtime-doc' };
  const liveCanonicalDeck = { masterSlides: [{ id: 'live-master' }] };
  let receivedDoc = null;
  const getCanonicalDeck = vm.runInNewContext(`(${callbackExpression})`, {
    getIframeDoc() {
      return sourceDoc;
    },
    resolveEditorUiCanonicalDeck(doc) {
      receivedDoc = doc;
      return liveCanonicalDeck;
    },
    buildEditorCanonicalDeck() {
      throw new Error('DOM rebuild should not run when live master-slide runtime state is available');
    }
  });

  assert.equal(getCanonicalDeck(), liveCanonicalDeck);
  assert.equal(receivedDoc, sourceDoc);
});

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
  assert.equal(
    list.children[0].textContent,
    'No master layouts saved. Save the active slide as a master layout.'
  );
});

test('createStudioMasterSlideStateSync resolves master state through callbacks', () => {
  const doc = { id: 'iframe-doc' };
  const select = {
    children: [],
    textContent: '',
    value: '',
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
  const calls = [];
  const syncState = masterSlideView.createStudioMasterSlideStateSync({
    getDocument() {
      calls.push('document');
      return doc;
    },
    getActionState(currentDoc) {
      calls.push(['action-state', currentDoc]);
      return { masterSlides: [], canUseMasterActions: false };
    },
    getDocumentRef() {
      calls.push('document-ref');
      return {
        getElementById(id) {
          if (id === 'masterSlideSelect') return select;
          if (id === 'savedMasterSlidesList') return list;
          return { disabled: false };
        },
        createElement() {
          return {
            textContent: '',
            appendChild(child) {
              this.children ||= [];
              this.children.push(child);
            },
            addEventListener() {},
            setAttribute() {}
          };
        }
      };
    }
  });

  assert.equal(syncState(), true);
  assert.deepEqual(calls, [
    'document',
    ['action-state', doc],
    'document-ref'
  ]);
  assert.equal(select.value, '');
});

test('createStudioMasterSlideStateSync fails closed when master state resolution throws', () => {
  const syncState = masterSlideView.createStudioMasterSlideStateSync({
    getActionState() {
      throw new Error('master state unavailable');
    }
  });

  assert.equal(syncState(), false);
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
  runSourceWithCanonicalUi(source, context);

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
  runSourceWithCanonicalUi(source, context);

  assert.equal(context.updateMasterSlideActionState({}), true);
  assert.equal(elements.masterSlideSelect.disabled, false);
  assert.deepEqual(rendered, {
    masterSlides: [{ id: 'brand', name: 'Brand' }],
    activeMasterSlideId: 'brand'
  });
});

test('updateMasterSlideActionState caches the shared master state synchronizer when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateMasterSlideActionState(doc = getIframeDoc()) {',
    '\n\n    function updateBlockActionState'
  );
  const doc = { id: 'active-doc', activeSlide: {} };
  const calls = [];
  const context = {
    SlideNextStudioEditorMasterSlideView: {
      syncStudioMasterSlideState() {
        throw new Error('direct master sync should not run');
      },
      createStudioMasterSlideStateSync(options) {
        calls.push(['factory', options]);
        return (currentDoc) => {
          calls.push(['sync', currentDoc]);
          return options.getActionState(currentDoc).canUseMasterActions;
        };
      }
    },
    document: {},
    getIframeDoc() {
      return doc;
    },
    getActiveSlide(currentDoc) {
      return currentDoc.activeSlide;
    },
    getActiveSlideId() {
      return 'slide-1';
    },
    buildEditorCanonicalDeck() {
      return {
        slides: [{ id: 'slide-1', masterSlideId: 'brand' }],
        masterSlides: [{ id: 'brand' }]
      };
    },
    applySavedMasterSlide() {},
    removeSavedMasterSlide() {}
  };

  vm.createContext(context);
  runSourceWithCanonicalUi(source, context);

  assert.equal(context.updateMasterSlideActionState(doc), true);
  assert.equal(context.updateMasterSlideActionState(doc), true);
  assert.equal(calls.filter(([name]) => name === 'factory').length, 1);
  assert.deepEqual(calls.filter(([name]) => name === 'sync').map(([, currentDoc]) => currentDoc), [doc, doc]);
});

test('master-slide state prefers the live canonical deck before rebuilding from the frame', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateMasterSlideActionState(doc = getIframeDoc()) {',
    '\n\n    function updateBlockActionState'
  );
  const doc = { id: 'live-doc', activeSlide: {} };
  const liveCanonicalDeck = {
    slides: [{ id: 'slide-1', masterSlideId: 'live-master' }],
    masterSlides: [{ id: 'live-master' }]
  };
  let receivedOptions = null;
  let buildCalls = 0;
  const context = {
    SlideNextStudioEditorMasterSlideView: {
      syncStudioMasterSlideState(options) {
        receivedOptions = options;
        return true;
      }
    },
    getIframeDoc() {
      return doc;
    },
    getActiveSlide(currentDoc) {
      return currentDoc.activeSlide;
    },
    getActiveSlideId() {
      return 'slide-1';
    },
    getStudioEditorSessionToken() {
      return 31;
    },
    resolveEditorLiveCanonicalDeck(sourceDoc, sessionToken) {
      assert.equal(sourceDoc, doc);
      assert.equal(sessionToken, 31);
      return liveCanonicalDeck;
    },
    buildEditorCanonicalDeck() {
      buildCalls += 1;
      throw new Error('DOM rebuild should not run when the live deck is available');
    },
    applySavedMasterSlide() {},
    removeSavedMasterSlide() {},
    document: {}
  };

  vm.createContext(context);
  runSourceWithCanonicalUi(source, context);

  assert.equal(context.updateMasterSlideActionState(doc), true);
  assert.equal(receivedOptions.masterSlides, liveCanonicalDeck.masterSlides);
  assert.equal(receivedOptions.activeMasterSlideId, 'live-master');
  assert.equal(buildCalls, 0);
});

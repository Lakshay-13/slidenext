const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const templateView = require('../shared/studio-editor-template-view.js');
const templateState = require('../shared/studio-editor-template-state.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function runSourceWithCanonicalUi(source, context) {
  context.SlideNextStudioEditorTemplateState = templateState;
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

test('template runtime wiring prefers the live canonical deck resolver', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const runtimeStart = fileContent.indexOf('const studioEditorTemplateRuntimeAccessorsApi =');
  const runtimeEnd = fileContent.indexOf('const studioEditorTemplateController =', runtimeStart);
  assert.notEqual(runtimeStart, -1);
  assert.notEqual(runtimeEnd, -1);

  const runtimeSource = fileContent.slice(runtimeStart, runtimeEnd);
  const callbackStart = runtimeSource.indexOf('getCanonicalDeck:');
  const callbackEnd = runtimeSource.indexOf('\n            getCanonicalDeckBaseline', callbackStart);
  assert.notEqual(callbackStart, -1);
  assert.notEqual(callbackEnd, -1);

  const callbackExpression = runtimeSource
    .slice(callbackStart + 'getCanonicalDeck:'.length, callbackEnd)
    .trim()
    .replace(/,$/, '');
  const sourceDoc = { id: 'template-runtime-doc' };
  const liveCanonicalDeck = { templates: [{ id: 'live-template' }] };
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
      throw new Error('DOM rebuild should not run when live template runtime state is available');
    }
  });

  assert.equal(getCanonicalDeck(), liveCanonicalDeck);
  assert.equal(receivedDoc, sourceDoc);
});

test('saveActiveSlideAsTemplate delegates the name and refreshes template state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function saveActiveSlideAsTemplate() {',
    '\n\n    function nudgeSelectedElements'
  );
  const input = { value: '  Quarterly Hero  ' };
  let delegatedName = '';
  let refreshCalls = 0;
  const context = {
    SlideNextStudioEditorTemplateView: templateView,
    document: {
      getElementById(id) {
        return id === 'templateNameInput' ? input : null;
      }
    },
    studioEditorTemplateController: {
      saveActiveSlide(payload) {
        delegatedName = payload.name;
        return { templates: [{ id: 'quarterly' }] };
      }
    },
    updateTemplateActionState() {
      refreshCalls += 1;
    }
  };

  vm.createContext(context);
  runSourceWithCanonicalUi(source, context);

  assert.equal(context.saveActiveSlideAsTemplate(), true);
  assert.equal(delegatedName, 'Quarterly Hero');
  assert.equal(input.value, '');
  assert.equal(refreshCalls, 1);
});

test('shared template view wires insert and remove actions to injected callbacks', () => {
  const list = {
    children: [],
    textContent: '',
    appendChild(child) {
      this.children.push(child);
    }
  };
  const events = [];
  const documentRef = {
    getElementById() {
      return list;
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

  assert.equal(templateView.renderStudioTemplateLibrary({
    documentRef,
    templates: [{ id: 'hero', name: 'Hero', slide: { nodes: [{ id: 'title' }] } }],
    canInsert: true,
    insertTemplate(templateId) {
      calls.push(['insert', templateId]);
    },
    removeTemplate(templateId) {
      calls.push(['remove', templateId]);
    }
  }), true);

  events.find((event) => event.type === 'click').handler();
  events.reverse().find((event) => event.type === 'click').handler();
  assert.deepEqual(calls, [['insert', 'hero'], ['remove', 'hero']]);
});

test('shared template view binds the save template control', () => {
  const button = {
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    }
  };
  const calls = [];

  assert.deepEqual(
    templateView.bindStudioEditorTemplateControls({
      documentRef: {
        getElementById(id) {
          return id === 'saveActiveSlideTemplateBtn' ? button : null;
        }
      },
      saveActiveSlideAsTemplate() {
        calls.push('save-template');
      }
    }),
    { saveActiveSlideTemplateBtn: true }
  );
  button.listeners.click();
  assert.deepEqual(calls, ['save-template']);
});

test('index keeps the template save control free of inline handlers', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.doesNotMatch(fileContent, /id="saveActiveSlideTemplateBtn"[^>]*onclick=/);
});

test('shared template state sync updates template controls before rendering the library', () => {
  const controls = {
    saveActiveSlideTemplateBtn: { disabled: false },
    templateNameInput: { disabled: false }
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
      return controls[id] || (id === 'savedTemplatesList' ? list : null);
    },
    createElement() {
      return { textContent: '' };
    }
  };

  assert.equal(templateView.syncStudioTemplateState({
    documentRef,
    templates: [],
    canUseTemplateActions: false
  }), true);
  assert.equal(controls.saveActiveSlideTemplateBtn.disabled, true);
  assert.equal(controls.templateNameInput.disabled, true);
  assert.equal(
    list.children[0].textContent,
    'No slide templates saved. Save the active slide as a template.'
  );
});

test('createStudioTemplateStateSync resolves template state through callbacks', () => {
  const doc = { id: 'iframe-doc' };
  const list = {
    children: [],
    textContent: '',
    appendChild(child) {
      this.children.push(child);
    }
  };
  const calls = [];
  const syncState = templateView.createStudioTemplateStateSync({
    getDocument() {
      calls.push('document');
      return doc;
    },
    getActionState(currentDoc) {
      calls.push(['action-state', currentDoc]);
      return { templates: [], canUseTemplateActions: false };
    },
    getDocumentRef() {
      calls.push('document-ref');
      return {
        getElementById(id) {
          return id === 'savedTemplatesList' ? list : null;
        },
        createElement() {
          return { textContent: '' };
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
  assert.equal(list.children[0].textContent, 'No slide templates saved. Save the active slide as a template.');
});

test('createStudioTemplateStateSync fails closed when template state resolution throws', () => {
  const syncState = templateView.createStudioTemplateStateSync({
    getActionState() {
      throw new Error('template state unavailable');
    }
  });

  assert.equal(syncState(), false);
});

test('insertSavedTemplate delegates to the template controller and refreshes editor state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function insertSavedTemplate(templateId) {',
    '\n\n    function nudgeSelectedElements'
  );
  let delegatedId = '';
  let templateRefreshes = 0;
  let blockRefreshes = 0;
  const context = {
    studioEditorTemplateController: {
      insertTemplate(templateId) {
        delegatedId = templateId;
        return true;
      }
    },
    updateTemplateActionState() {
      templateRefreshes += 1;
    },
    updateBlockActionState() {
      blockRefreshes += 1;
    }
  };

  vm.createContext(context);
  runSourceWithCanonicalUi(source, context);

  assert.equal(context.insertSavedTemplate('hero-template'), true);
  assert.equal(delegatedId, 'hero-template');
  assert.equal(templateRefreshes, 1);
  assert.equal(blockRefreshes, 1);
});

test('removeSavedTemplate delegates removal and refreshes template state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function removeSavedTemplate(templateId) {',
    '\n\n    function nudgeSelectedElements'
  );
  let delegatedId = '';
  let refreshCalls = 0;
  const context = {
    studioEditorTemplateController: {
      removeTemplate(templateId) {
        delegatedId = templateId;
        return { templates: [] };
      }
    },
    updateTemplateActionState() {
      refreshCalls += 1;
    }
  };

  vm.createContext(context);
  runSourceWithCanonicalUi(source, context);

  assert.equal(context.removeSavedTemplate('hero-template'), true);
  assert.equal(delegatedId, 'hero-template');
  assert.equal(refreshCalls, 1);
});

test('updateTemplateActionState caches the shared template state synchronizer when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateTemplateActionState(doc = getIframeDoc()) {',
    '\n\n    function updateMasterSlideActionState'
  );
  const doc = { id: 'active-doc', activeSlide: {} };
  const calls = [];
  const context = {
    SlideNextStudioEditorTemplateView: {
      syncStudioTemplateState() {
        throw new Error('direct template sync should not run');
      },
      createStudioTemplateStateSync(options) {
        calls.push(['factory', options]);
        return (currentDoc) => {
          calls.push(['sync', currentDoc]);
          return options.getActionState(currentDoc).canUseTemplateActions;
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
    buildEditorCanonicalDeck() {
      return { templates: [{ id: 'hero' }] };
    },
    insertSavedTemplate() {},
    removeSavedTemplate() {}
  };

  vm.createContext(context);
  runSourceWithCanonicalUi(source, context);

  assert.equal(context.updateTemplateActionState(doc), true);
  assert.equal(context.updateTemplateActionState(doc), true);
  assert.equal(calls.filter(([name]) => name === 'factory').length, 1);
  assert.deepEqual(calls.filter(([name]) => name === 'sync').map(([, currentDoc]) => currentDoc), [doc, doc]);
});

test('template state prefers the live canonical deck before rebuilding from the frame', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateTemplateActionState(doc = getIframeDoc()) {',
    '\n\n    function updateMasterSlideActionState'
  );
  const doc = { id: 'live-doc', activeSlide: {} };
  const liveCanonicalDeck = { templates: [{ id: 'live-template' }] };
  let receivedOptions = null;
  let buildCalls = 0;
  const context = {
    SlideNextStudioEditorTemplateView: {
      syncStudioTemplateState(options) {
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
    getStudioEditorSessionToken() {
      return 23;
    },
    resolveEditorLiveCanonicalDeck(sourceDoc, sessionToken) {
      assert.equal(sourceDoc, doc);
      assert.equal(sessionToken, 23);
      return liveCanonicalDeck;
    },
    buildEditorCanonicalDeck() {
      buildCalls += 1;
      throw new Error('DOM rebuild should not run when the live deck is available');
    },
    insertSavedTemplate() {},
    removeSavedTemplate() {},
    document: {}
  };

  vm.createContext(context);
  runSourceWithCanonicalUi(source, context);

  assert.equal(context.updateTemplateActionState(doc), true);
  assert.equal(receivedOptions.templates, liveCanonicalDeck.templates);
  assert.equal(buildCalls, 0);
});

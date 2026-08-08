const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const layerOrder = require('../shared/studio-editor-layer-order.js');
const layerController = require('../shared/studio-editor-layer-controller.js');
const layerView = require('../shared/studio-editor-layer-view.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadBuildLayerOrderSelectionActionState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function buildLayerOrderSelectionActionState(elements = selectedElements, options = {}) {',
    '\n\n    function updateLayerOrderActionState(doc = getIframeDoc()) {'
  );
  vm.runInContext(helperSource, context);
}

function createListContainer() {
  let html = '';
  return {
    children: [],
    get innerHTML() {
      return html;
    },
    set innerHTML(value) {
      html = value;
      this.children = [];
    }
  };
}

function getLayerButtonAttributes(html, displayName) {
  const escapedDisplayName = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `${escapedDisplayName}[\\s\\S]*?changeLayerZIndexByRef\\(event, 'forward'\\)"([^>]*)title="Bring Forward"[\\s\\S]*?changeLayerZIndexByRef\\(event, 'backward'\\)"([^>]*)title="Send Backward"`,
    'm'
  );
  const match = html.match(pattern);
  assert.ok(match, `Missing layer row for ${displayName}`);
  return {
    forwardAttrs: match[1],
    backwardAttrs: match[2]
  };
}

function getLayerVisibilityButtonAttrs(html, displayName) {
  const escapedDisplayName = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `${escapedDisplayName}[\\s\\S]*?toggleLayerVisibilityByRef\\(event\\)"([^>]*)title="(?:Show|Hide) Element"`,
    'm'
  );
  const match = html.match(pattern);
  assert.ok(match, `Missing visibility button for ${displayName}`);
  return match[1];
}

function hasDisabledAttribute(attrs) {
  return /\sdisabled(?=\s|=|$)/.test(attrs);
}

test('resolveLayerRowElement delegates stable row lookup to the shared controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function resolveLayerRowElement(row) {',
    '\n\n    function selectLayerElementByRef'
  );
  const row = { dataset: { editorElementId: 'node-1' } };
  const target = { id: 'node-1' };
  const calls = [];
  const context = {
    SlideNextStudioEditorLayerController: {
      resolveStudioLayerRowElement(options) {
        calls.push(options);
        return target;
      }
    },
    getElementByEditorId() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.resolveLayerRowElement(row), target);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].row, row);
  assert.equal(typeof calls[0].getElementByEditorId, 'function');
});

test('updateLayersList delegates layer synchronization to the shared layer controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateLayersListSource = extractFunctionSource(
    fileContent,
    'function updateLayersList() {',
    '\n\n    function resolveLayerRowElement(row) {'
  );
  const iframeDoc = { id: 'doc' };
  const activeSlide = { id: 'slide-1' };
  const listContainer = createListContainer();
  let delegatedOptions = null;
  const context = {
    SlideNextStudioEditorLayerController: {
      syncStudioLayerList(options) {
        delegatedOptions = options;
        return true;
      }
    },
    buildEditorDeckSnapshot() {
      return {
        activeSlideId: 'slide-1',
        slides: [{ id: 'slide-1', elements: [{ id: 'element-1' }] }]
      };
    },
    document: {
      getElementById(id) {
        return id === 'slideLayersList' ? listContainer : null;
      }
    },
    getActiveSlide(doc) {
      return doc === iframeDoc ? activeSlide : null;
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getNormalizedSlideLayerOrder() {
      return [];
    },
    getElementByEditorId() {
      return null;
    },
    buildLayerOrderSelectionActionState() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(updateLayersListSource, context);

  context.updateLayersList();

  assert.equal(delegatedOptions.documentRef, context.document);
  assert.equal(delegatedOptions.iframeDoc, iframeDoc);
  assert.equal(typeof delegatedOptions.getActiveSlide, 'function');
  assert.equal(typeof delegatedOptions.buildEditorDeckSnapshot, 'function');
  assert.equal(typeof delegatedOptions.getElementByEditorId, 'function');
});

test('updateLayersList disables row layer controls when a layer cannot move in that direction', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateLayersListSource = extractFunctionSource(
    fileContent,
    'function updateLayersList() {',
    '\n\n    function resolveLayerRowElement(row) {'
  );

  const backElement = { id: 'back', isConnected: true, locked: false };
  const middleElement = { id: 'middle', isConnected: true, locked: false };
  const lockedFrontElement = { id: 'locked-front', isConnected: true, locked: true };
  const activeSlide = { id: 'slide-1' };
  const iframeDoc = { id: 'doc' };
  const listContainer = createListContainer();
  let getIframeDocCalls = 0;

  const elementsById = {
    back: backElement,
    middle: middleElement,
    'locked-front': lockedFrontElement
  };

  const context = {
    SlideNextStudioEditorLayerController: layerController,
    SlideNextStudioEditorLayerOrder: layerOrder,
    SlideNextStudioEditorLayerView: layerView,
    buildEditorDeckSnapshot() {
      return {
        activeSlideId: 'slide-1',
        slides: [
          {
            id: 'slide-1',
            elements: [
              { id: 'back', displayName: 'Back Layer', typeIcon: 'text_fields', isSelected: false, isLocked: false, isHidden: false, zIndex: 0 },
              { id: 'middle', displayName: 'Middle Layer', typeIcon: 'text_fields', isSelected: false, isLocked: false, isHidden: false, zIndex: 1 },
              { id: 'locked-front', displayName: 'Locked Front Layer', typeIcon: 'text_fields', isSelected: false, isLocked: true, isHidden: false, zIndex: 2 }
            ]
          }
        ]
      };
    },
    document: {
      getElementById(id) {
        if (id === 'slideLayersList') return listContainer;
        return null;
      }
    },
    getActiveSlide(doc) {
      return doc === iframeDoc ? activeSlide : null;
    },
    getIframeDoc() {
      getIframeDocCalls += 1;
      return iframeDoc;
    },
    getNormalizedSlideLayerOrder(slide) {
      return slide === activeSlide ? [backElement, middleElement, lockedFrontElement] : [];
    },
    getElementByEditorId(id) {
      return elementsById[id] || null;
    },
    isElementLocked(element) {
      return !!element.locked;
    }
  };

  vm.createContext(context);
  loadBuildLayerOrderSelectionActionState(fileContent, context);
  vm.runInContext(updateLayersListSource, context);

  context.updateLayersList();

  const backLayerButtons = getLayerButtonAttributes(listContainer.innerHTML, 'Back Layer');
  assert.equal(hasDisabledAttribute(backLayerButtons.forwardAttrs), false);
  assert.equal(hasDisabledAttribute(backLayerButtons.backwardAttrs), true);

  const middleLayerButtons = getLayerButtonAttributes(listContainer.innerHTML, 'Middle Layer');
  assert.equal(hasDisabledAttribute(middleLayerButtons.forwardAttrs), false);
  assert.equal(hasDisabledAttribute(middleLayerButtons.backwardAttrs), false);
  assert.equal(hasDisabledAttribute(getLayerVisibilityButtonAttrs(listContainer.innerHTML, 'Middle Layer')), false);

  const lockedFrontLayerButtons = getLayerButtonAttributes(listContainer.innerHTML, 'Locked Front Layer');
  assert.equal(hasDisabledAttribute(lockedFrontLayerButtons.forwardAttrs), true);
  assert.equal(hasDisabledAttribute(lockedFrontLayerButtons.backwardAttrs), true);
  assert.equal(hasDisabledAttribute(getLayerVisibilityButtonAttrs(listContainer.innerHTML, 'Locked Front Layer')), true);
  assert.equal(getIframeDocCalls, 1);
});

test('updateLayersList renders canonical layer snapshots when the editor frame is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateLayersListSource = extractFunctionSource(
    fileContent,
    'function updateLayersList() {',
    '\n\n    function resolveLayerRowElement(row) {'
  );

  const listContainer = createListContainer();
  let getIframeDocCalls = 0;
  let getNormalizedSlideLayerOrderCalls = 0;

  const context = {
    SlideNextStudioEditorLayerController: layerController,
    SlideNextStudioEditorLayerOrder: layerOrder,
    SlideNextStudioEditorLayerView: layerView,
    buildEditorDeckSnapshot() {
      return {
        activeSlideId: 'slide-1',
        slides: [
          {
            id: 'slide-1',
            elements: [
              {
                id: 'node-1',
                displayName: 'Heading: "Welcome"',
                typeIcon: 'title',
                isSelected: false,
                isLocked: false,
                isHidden: false,
                zIndex: '4'
              }
            ]
          }
        ]
      };
    },
    document: {
      getElementById(id) {
        if (id === 'slideLayersList') return listContainer;
        return null;
      }
    },
    getActiveSlide() {
      return null;
    },
    getElementByEditorId() {
      return null;
    },
    getIframeDoc() {
      getIframeDocCalls += 1;
      return null;
    },
    getNormalizedSlideLayerOrder() {
      getNormalizedSlideLayerOrderCalls += 1;
      return [];
    },
    isElementLocked() {
      return false;
    }
  };

  vm.createContext(context);
  loadBuildLayerOrderSelectionActionState(fileContent, context);
  vm.runInContext(updateLayersListSource, context);

  context.updateLayersList();

  assert.match(listContainer.innerHTML, /Heading: &quot;Welcome&quot;|Heading: "Welcome"/);
  assert.match(listContainer.innerHTML, /selectLayerElementByRef\(event\)" disabled/);
  const layerButtons = getLayerButtonAttributes(listContainer.innerHTML, 'Heading: "Welcome"');
  assert.equal(hasDisabledAttribute(layerButtons.forwardAttrs), true);
  assert.equal(hasDisabledAttribute(layerButtons.backwardAttrs), true);
  assert.equal(getIframeDocCalls, 1);
  assert.equal(getNormalizedSlideLayerOrderCalls, 0);
});

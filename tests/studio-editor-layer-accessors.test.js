const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const layerAccessors = require('../shared/studio-editor-layer-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('layer accessors preserve the global layer handler contract', () => {
  const calls = [];
  const accessors = layerAccessors.createStudioEditorLayerAccessors({
    controller: {
      resolveStudioLayerRowElement(options) {
        calls.push(['resolve', options]);
        return 'element';
      },
      selectStudioLayerElementByRef(options) {
        calls.push(['select', options]);
        return true;
      },
      toggleStudioLayerVisibilityByRef(options) {
        calls.push(['toggle', options]);
        return true;
      },
      changeStudioLayerZIndexByRef(options) {
        calls.push(['change', options]);
        return true;
      }
    },
    getIframeDoc() {
      return { id: 'iframe-document' };
    },
    getSelectedElements(doc) {
      calls.push(['selected', doc]);
      return ['selected-element'];
    },
    resolveLayerRowElement() {
      return 'element';
    },
    updateLayersList() {
      calls.push(['refresh']);
    }
  });

  assert.equal(accessors.selectLayerElementByRef({}), true);
  assert.equal(accessors.toggleLayerVisibilityByRef({}), true);
  assert.equal(accessors.changeLayerZIndexByRef({}, 'forward'), true);
  assert.deepEqual(calls.map(([name]) => name), ['select', 'toggle', 'selected', 'change']);
  assert.equal(calls[2][1].id, 'iframe-document');
  assert.deepEqual(calls[3][1].selectedElements, ['selected-element']);
});

test('layer global API forwards arguments to configured accessors', () => {
  const calls = [];
  const globalApi = layerAccessors.createStudioEditorLayerGlobalApi({
    accessors: {
      updateLayersList(value) {
        calls.push(['update', value]);
        return 'updated';
      },
      resolveLayerRowElement(row) {
        calls.push(['resolve', row]);
        return 'resolved';
      },
      selectLayerElementByRef(event) {
        calls.push(['select', event]);
        return 'selected';
      },
      toggleLayerVisibilityByRef(event) {
        calls.push(['toggle', event]);
        return 'toggled';
      },
      changeLayerZIndexByRef(event, action) {
        calls.push(['change', event, action]);
        return 'changed';
      }
    }
  });

  assert.equal(globalApi.updateLayersList('doc'), 'updated');
  assert.equal(globalApi.resolveLayerRowElement('row'), 'resolved');
  assert.equal(globalApi.selectLayerElementByRef('event'), 'selected');
  assert.equal(globalApi.toggleLayerVisibilityByRef('event'), 'toggled');
  assert.equal(globalApi.changeLayerZIndexByRef('event', 'backward'), 'changed');
  assert.deepEqual(calls, [
    ['update', 'doc'],
    ['resolve', 'row'],
    ['select', 'event'],
    ['toggle', 'event'],
    ['change', 'event', 'backward']
  ]);
});

test('index loads and installs the layer accessor module before editor orchestration', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const scriptIndex = fileContent.indexOf(
    '<script src="/shared/studio-editor-layer-accessors.js"></script>'
  );
  const installIndex = fileContent.indexOf(
    'Object.assign(globalThis, studioEditorLayerGlobalApi);'
  );
  assert.ok(scriptIndex >= 0);
  assert.ok(installIndex > scriptIndex);
  assert.match(fileContent, /createStudioEditorLayerAccessors\(/);
  assert.match(fileContent, /createStudioEditorLayerGlobalApi\(/);
  const accessorBlock = fileContent.slice(
    fileContent.indexOf('const studioEditorLayerAccessors ='),
    fileContent.indexOf('const studioEditorLayerGlobalApi')
  );
  assert.match(
    accessorBlock,
    /rollbackLayerOrderMutation: \(\.\.\.args\) => rollbackEditorLayerOrderMutation\(\.\.\.args\)/
  );
});

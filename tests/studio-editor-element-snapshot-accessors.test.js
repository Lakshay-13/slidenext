const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const accessorsApi = require('../shared/studio-editor-element-snapshot-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('element snapshot accessors prefer the shared controller', () => {
  const calls = [];
  const controller = {
    build(element) {
      calls.push(['build', element]);
      return 'controller-build';
    },
    buildLayer(elements) {
      calls.push(['buildLayer', elements]);
      return 'controller-layer';
    },
    getDisplayMetadata(element) {
      calls.push(['metadata', element]);
      return 'controller-metadata';
    }
  };
  const accessors = accessorsApi.createStudioEditorElementSnapshotAccessors({
    controller,
    snapshotApi: {
      buildStudioElementSnapshot() {
        throw new Error('fallback element builder should not run');
      },
      buildStudioLayerSnapshot() {
        throw new Error('fallback layer builder should not run');
      },
      resolveStudioLayerDisplayMetadata() {
        throw new Error('fallback metadata builder should not run');
      }
    }
  });
  const element = { id: 'element-1' };

  assert.equal(accessors.build(element), 'controller-build');
  assert.equal(accessors.buildLayer([element]), 'controller-layer');
  assert.equal(accessors.getDisplayMetadata(element), 'controller-metadata');
  assert.deepEqual(calls, [
    ['build', element],
    ['buildLayer', [element]],
    ['metadata', element]
  ]);
});

test('element snapshot accessors preserve fallback builders and metadata', () => {
  let createCalls = 0;
  let layerOptions = null;
  const snapshotApi = {
    createStudioEditorElementSnapshotBuilder(options) {
      createCalls += 1;
      return (element) => ({
        id: options.getElementId(element),
        selected: options.isSelectedElement(element)
      });
    },
    buildStudioLayerSnapshot(elements, options) {
      layerOptions = options;
      return elements.map(options.buildElementSnapshot);
    },
    resolveStudioLayerDisplayMetadata() {
      return { typeIcon: 'title', displayName: 'Heading' };
    }
  };
  const selectedElement = { id: 'selected' };
  const accessors = accessorsApi.createStudioEditorElementSnapshotAccessors({
    snapshotApi,
    getElementId: (element) => `editor-${element.id}`,
    isSelectedElement: (element) => element === selectedElement
  });

  assert.deepEqual(accessors.build({ id: 'first' }), {
    id: 'editor-first',
    selected: false
  });
  assert.deepEqual(accessors.build(selectedElement), {
    id: 'editor-selected',
    selected: true
  });
  assert.equal(createCalls, 1);
  assert.deepEqual(accessors.buildLayer([selectedElement]), [{
    id: 'editor-selected',
    selected: true
  }]);
  assert.equal(typeof layerOptions.buildElementSnapshot, 'function');
  assert.deepEqual(accessors.getDisplayMetadata(selectedElement), {
    typeIcon: 'title',
    displayName: 'Heading'
  });
});

test('editor routes element snapshot wrappers through shared accessors', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /SlideNextStudioEditorElementSnapshotAccessors/);
  assert.match(source, /accessors\.getDisplayMetadata\(el\)/);
  assert.match(source, /accessors\.build\(el\)/);
  assert.match(source, /accessors\.buildLayer\(/);
});

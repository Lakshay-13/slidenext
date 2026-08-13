const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerApi = require('../shared/studio-editor-element-snapshot-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('element snapshot controller caches the shared builder and preserves selection callbacks', () => {
  let createCalls = 0;
  const builderCalls = [];
  const snapshotApi = {
    createStudioEditorElementSnapshotBuilder(options) {
      createCalls += 1;
      return (element) => {
        builderCalls.push([
          element,
          options.getElementId(element),
          options.isElementLocked(element),
          options.isElementHidden(element),
          options.isSelectedElement(element)
        ]);
        return { id: element.id };
      };
    }
  };
  const selectedElement = { id: 'selected' };
  const controller = controllerApi.createStudioEditorElementSnapshotController({
    snapshotApi,
    getElementId: (element) => `editor-${element.id}`,
    isElementLocked: () => true,
    isElementHidden: () => false,
    isSelectedElement: (element) => element === selectedElement
  });

  assert.deepEqual(controller.build({ id: 'first' }), { id: 'first' });
  assert.deepEqual(controller.build(selectedElement), { id: 'selected' });
  assert.equal(createCalls, 1);
  assert.deepEqual(builderCalls, [
    [{ id: 'first' }, 'editor-first', true, false, false],
    [selectedElement, 'editor-selected', true, false, true]
  ]);
});

test('element snapshot controller delegates layer snapshots through its element builder', () => {
  const calls = [];
  const controller = controllerApi.createStudioEditorElementSnapshotController({
    snapshotApi: {
      createStudioEditorElementSnapshotBuilder(options) {
        return (element) => ({ id: options.getElementId(element) });
      },
      buildStudioLayerSnapshot(elements, options) {
        calls.push({ elements, options });
        return elements.map(options.buildElementSnapshot);
      }
    },
    getElementId: (element) => element.id
  });
  const elements = [{ id: 'one' }, { id: 'two' }];

  assert.deepEqual(controller.buildLayer(elements), [
    { id: 'one' },
    { id: 'two' }
  ]);
  assert.equal(calls.length, 1);
  assert.equal(typeof calls[0].options.buildElementSnapshot, 'function');
});

test('editor shell loads and routes element snapshots through the dedicated controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-element-snapshot-controller\.js/);
  assert.match(source, /studioEditorElementSnapshotController\.build\(el\)/);
  assert.match(source, /studioEditorElementSnapshotController\.buildLayer\(/);
});

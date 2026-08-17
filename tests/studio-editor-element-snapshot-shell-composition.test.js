const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-element-snapshot-shell-composition.js');

test('element snapshot shell composition wires runtime and accessor layers', () => {
  const controller = { build() {} };
  const accessors = { build() {} };
  const documentRef = { id: 'frame-document' };
  const candidate = { ownerDocument: documentRef };
  const selectedElements = [candidate];
  let runtimeOptions = null;
  let accessorOptions = null;

  const result = composition.createStudioEditorElementSnapshotShellComposition({
    runtimeApi: { name: 'shell-runtime' },
    runtimeAccessorsApi: {
      createStudioEditorElementSnapshotRuntimeAccessors(options) {
        assert.equal(options.runtimeApi.name, 'shell-runtime');
        runtimeOptions = options.runtimeOptions;
        return {
          runtime: {
            isAvailable: true,
            elementSnapshotController: controller
          }
        };
      }
    },
    accessorsApi: {
      createStudioEditorElementSnapshotAccessors(options) {
        accessorOptions = options;
        return accessors;
      }
    },
    snapshotApi: { name: 'snapshot-api' },
    getElementId: () => 'element-1',
    isElementLocked: () => false,
    isElementHidden: () => false,
    liveSelectionApi: {
      isStudioLiveSelectedElement(elements, element) {
        return elements === selectedElements && element === candidate;
      }
    },
    getSelectedElements(sourceDocument) {
      assert.equal(sourceDocument, documentRef);
      return selectedElements;
    }
  });

  assert.equal(result.controller, controller);
  assert.equal(result.accessors, accessors);
  assert.equal(runtimeOptions.snapshotApi.name, 'snapshot-api');
  assert.equal(runtimeOptions.isSelectedElement(candidate), true);
  assert.equal(accessorOptions.controller, controller);
  assert.equal(accessorOptions.isSelectedElement(candidate), true);
});

test('element snapshot shell composition fails closed without shared APIs', () => {
  assert.deepEqual(
    composition.createStudioEditorElementSnapshotShellComposition({
      runtimeAccessorsApi: null,
      accessorsApi: null
    }),
    {
      runtimeAccessors: null,
      shellRuntime: null,
      controller: null,
      accessors: null
    }
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');

const coordinatorApi = require('../shared/studio-editor-interaction-state-coordinator.js');

test('interaction state coordinator delegates motion, alignment, grouping, and layer state', () => {
  const doc = { id: 'iframe-doc' };
  const calls = [];
  const controller = (name) => ({
    buildActionState(value) {
      calls.push([`build:${name}`, value]);
      return { name, canGroup: name === 'group', canUngroup: name === 'ungroup' };
    },
    sync(value) {
      calls.push([`sync:${name}`, value]);
      return `${name}:${value.id}`;
    }
  });
  const coordinator = coordinatorApi.createStudioEditorInteractionStateCoordinator({
    motionStateController: controller('motion'),
    alignmentStateController: controller('alignment'),
    groupStateController: controller('group'),
    ungroupStateController: controller('ungroup'),
    layerOrderStateController: controller('layer'),
    getDocument: () => doc,
    getSelectedElements: () => [],
    getActiveSlide: () => ({ id: 'slide-1' }),
    getNormalizedSlideLayerOrder: () => [],
    getLockedState: () => () => false,
    groupApi: {
      createStudioGroupToolbarStateSync(options) {
        calls.push(['group-sync-create', options]);
        return (nextDoc) => `group-toolbar:${nextDoc.id}`;
      },
      syncStudioGroupToolbarState() {
        return 'group-toolbar-fallback';
      }
    },
    layerController: {
      syncStudioLayerOrderActionState(options) {
        calls.push(['layer-sync', options]);
        return 'layer-toolbar';
      }
    },
    layerOrderApi: {},
    styleApi: {}
  });

  assert.equal(coordinator.buildMotionActionState(doc).name, 'motion');
  assert.equal(coordinator.syncMotion(doc), 'motion:iframe-doc');
  assert.equal(coordinator.buildAlignmentActionState(doc).name, 'alignment');
  assert.equal(coordinator.syncAlignment(doc), 'alignment:iframe-doc');
  assert.equal(coordinator.buildGroupActionState(doc).name, 'group');
  assert.equal(coordinator.buildUngroupActionState(doc).name, 'ungroup');
  assert.equal(coordinator.syncGroup(doc), 'group-toolbar:iframe-doc');
  assert.equal(coordinator.buildLayerOrderActionState([]).name, 'layer');
  assert.equal(coordinator.syncLayerOrder(doc), 'layer-toolbar');
  assert.ok(calls.some(([name]) => name === 'group-sync-create'));
  assert.ok(calls.some(([name]) => name === 'layer-sync'));
});

test('interaction state coordinator fails closed without interaction controllers', () => {
  const coordinator = coordinatorApi.createStudioEditorInteractionStateCoordinator();

  assert.deepEqual(coordinator.buildMotionActionState(), { selection: [], canNudge: false });
  assert.equal(coordinator.syncMotion(), false);
  assert.equal(coordinator.syncAlignment(), false);
  assert.deepEqual(coordinator.buildGroupActionState(), { canGroup: false });
  assert.deepEqual(coordinator.buildUngroupActionState(), { canUngroup: false });
  assert.equal(coordinator.syncGroup(), false);
  assert.deepEqual(coordinator.buildLayerOrderActionState([]), { canReorder: false });
  assert.equal(coordinator.syncLayerOrder(), false);
});

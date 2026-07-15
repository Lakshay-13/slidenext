const test = require('node:test');
const assert = require('node:assert/strict');
const layerView = require('../shared/studio-editor-layer-view.js');

test('renderStudioLayersList renders empty active-slide states', () => {
  assert.match(
    layerView.renderStudioLayersList(),
    /No active slide/
  );
  assert.match(
    layerView.renderStudioLayersList({ activeSlideSnapshot: { id: 'slide-1' } }),
    /No elements found/
  );
});

test('renderStudioLayersList preserves layer labels and action availability', () => {
  const html = layerView.renderStudioLayersList({
    activeSlideSnapshot: { id: 'slide-1' },
    layers: [
      {
        id: 'element-1',
        typeIcon: 'title',
        displayName: 'Title',
        isSelected: true,
        isLocked: false,
        isHidden: false,
        zIndex: 2
      },
      {
        id: 'element-2',
        typeIcon: 'image',
        displayName: 'Hero image',
        isSelected: false,
        isLocked: true,
        isHidden: true,
        zIndex: 1
      }
    ],
    resolveLayerState(layer) {
      return layer.id === 'element-1'
        ? {
            canRunLayerActions: true,
            layerOrderActionState: {
              canBringForward: true,
              canSendBackward: false
            }
          }
        : {
            canRunLayerActions: false,
            layerOrderActionState: {
              canBringForward: false,
              canSendBackward: false
            }
          };
    }
  });

  assert.match(html, /Title/);
  assert.match(html, /Hero image/);
  assert.match(html, /title="Locked"/);
  assert.match(html, /title="Show Element"/);
  assert.match(html, /title="Bring Forward"/);
  assert.match(html, /onclick="changeLayerZIndexByRef\(event, 'backward'\)" disabled/);
  assert.equal((html.match(/onclick="selectLayerElementByRef\(event\)"/g) || []).length, 2);
});

test('renderStudioLayersListInDocument mounts rows and stores stable editor element ids', () => {
  const rows = [{ dataset: {} }, { dataset: {} }];
  const listContainer = {
    children: rows,
    innerHTML: ''
  };
  const result = layerView.renderStudioLayersListInDocument({
    documentRef: {
      getElementById(id) {
        return id === 'slideLayersList' ? listContainer : null;
      }
    },
    activeSlideSnapshot: { id: 'slide-1' },
    layers: [
      { id: 'element-1', typeIcon: 'title', displayName: 'Title' },
      { id: 'element-2', typeIcon: 'image', displayName: 'Image' }
    ]
  });

  assert.equal(result, true);
  assert.match(listContainer.innerHTML, /Title/);
  assert.equal(rows[0].dataset.editorElementId, 'element-1');
  assert.equal(rows[1].dataset.editorElementId, 'element-2');
});

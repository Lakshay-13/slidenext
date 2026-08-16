const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const snapshotUi = require('../shared/studio-editor-snapshot-ui.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('snapshot UI adapter resolves the active slide through the shared deck snapshot API', () => {
  const calls = [];
  const documentRef = { id: 'iframe-document' };
  const snapshot = { activeSlideIndex: 2 };
  const adapter = snapshotUi.createStudioEditorSnapshotUi({
    deckSnapshotApi: {
      resolveStudioActiveSlideIndex(value, fallback) {
        calls.push([value, fallback]);
        return value.activeSlideIndex;
      }
    },
    buildEditorDeckSnapshot(doc) {
      calls.push(['build', doc]);
      return snapshot;
    },
    getCurrentSlideIndex() {
      return 1;
    }
  });

  assert.equal(adapter.getActiveSlideIndex(documentRef), 2);
  assert.deepEqual(calls, [
    ['build', documentRef],
    [snapshot, 1]
  ]);
});

test('snapshot UI adapter delegates element and layer snapshot accessors', () => {
  const element = { id: 'element-1' };
  const elements = [element];
  const calls = [];
  const adapter = snapshotUi.createStudioEditorSnapshotUi({
    elementSnapshotAccessors: {
      getDisplayMetadata(value) {
        calls.push(['metadata', value]);
        return 'metadata';
      },
      build(value) {
        calls.push(['build', value]);
        return 'snapshot';
      },
      buildLayer(value) {
        calls.push(['layer', value]);
        return ['layer-snapshot'];
      }
    }
  });

  assert.equal(adapter.getLayerDisplayMetadata(element), 'metadata');
  assert.equal(adapter.buildElementSnapshot(element), 'snapshot');
  assert.deepEqual(adapter.buildLayerSnapshot(elements), ['layer-snapshot']);
  assert.deepEqual(calls, [
    ['metadata', element],
    ['build', element],
    ['layer', elements]
  ]);
});

test('snapshot UI adapter preserves safe fallbacks when shared APIs are unavailable', () => {
  const adapter = snapshotUi.createStudioEditorSnapshotUi({
    getCurrentSlideIndex: () => 4
  });

  assert.equal(adapter.getActiveSlideIndex({ id: 'document' }), 4);
  assert.equal(adapter.getLayerDisplayMetadata({}), null);
  assert.equal(adapter.buildElementSnapshot({}), null);
  assert.deepEqual(adapter.buildLayerSnapshot([]), []);
});

test('editor exposes the shared snapshot UI adapter to the inline compatibility wrappers', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /SlideNextStudioEditorSnapshotUi/);
  assert.match(source, /studioEditorSnapshotUi\.getActiveSlideIndex\(doc\)/);
  assert.match(source, /studioEditorSnapshotUi\.getLayerDisplayMetadata\(el\)/);
  assert.match(source, /studioEditorSnapshotUi\.buildElementSnapshot\(el\)/);
  assert.match(source, /studioEditorSnapshotUi\.buildLayerSnapshot\(/);
});

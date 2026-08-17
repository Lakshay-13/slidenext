const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const composition = require('../shared/studio-editor-deck-snapshot-shell-composition.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('deck snapshot shell composition wires accessors and snapshot UI', () => {
  const accessors = { build() {} };
  const snapshotUi = { getActiveSlideIndex() {} };
  const controller = { build() {} };
  const elementSnapshotAccessors = { build() {} };
  let accessorOptions = null;
  let snapshotUiOptions = null;

  const result = composition.createStudioEditorDeckSnapshotShellComposition({
    controller,
    accessorsApi: {
      createStudioEditorDeckSnapshotAccessors(options) {
        accessorOptions = options;
        return accessors;
      }
    },
    snapshotUiApi: {
      createStudioEditorSnapshotUi(options) {
        snapshotUiOptions = options;
        return snapshotUi;
      }
    },
    snapshotApi: { name: 'deck-snapshot' },
    getDocument: () => ({ id: 'document' }),
    getActiveSlideId: () => 'slide-1',
    elementSnapshotAccessors
  });

  assert.equal(result.deckSnapshotAccessors, accessors);
  assert.equal(result.snapshotUi, snapshotUi);
  assert.equal(accessorOptions.controller, controller);
  assert.equal(accessorOptions.snapshotApi.name, 'deck-snapshot');
  assert.equal(snapshotUiOptions.deckSnapshotAccessors, accessors);
  assert.equal(snapshotUiOptions.elementSnapshotAccessors, elementSnapshotAccessors);
});

test('deck snapshot shell composition fails closed without shared APIs', () => {
  assert.deepEqual(
    composition.createStudioEditorDeckSnapshotShellComposition({
      accessorsApi: null,
      snapshotUiApi: null
    }),
    {
      deckSnapshotAccessors: null,
      snapshotUi: null
    }
  );
});

test('index routes deck snapshot assembly through the shell composition', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-deck-snapshot-shell-composition\.js/);
  assert.match(source, /studioEditorDeckSnapshotShellCompositionApi/);
  assert.match(source, /createStudioEditorDeckSnapshotShellComposition/);
  assert.doesNotMatch(
    source,
    /SlideNextStudioEditorDeckSnapshotAccessors\.createStudioEditorDeckSnapshotAccessors\(/
  );
  assert.doesNotMatch(
    source,
    /SlideNextStudioEditorSnapshotUi\.createStudioEditorSnapshotUi\(/
  );
});

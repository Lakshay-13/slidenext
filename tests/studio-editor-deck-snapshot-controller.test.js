const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const snapshotController = require('../shared/studio-editor-deck-snapshot-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('deck snapshot controller wires canonical and DOM snapshot callbacks', () => {
  const documentRef = { id: 'editor-document' };
  const buildOptions = { includeLayers: true };
  const snapshot = { activeSlideId: 'slide-1', slides: [] };
  let builderOptions = null;
  const callbacks = {
    createDeckViewStateOptions: () => ({ buildCanonicalDeck: () => snapshot }),
    resolveCanonicalDeckViewState: () => ({ resolveCanonicalDeck: () => snapshot }),
    resolveFallbackActiveSlideId: () => 'slide-1',
    resolveLiveActiveSlide: () => ({ id: 'active-slide' }),
    buildDomSnapshot: () => ({ activeSlideId: 'dom-slide', slides: [] }),
    getActiveSlideId: () => 'slide-1',
    getSlideById: () => ({ id: 'slide-1' }),
    buildSlideLayerSnapshot: () => ({ id: 'layer-1' })
  };
  const controller = snapshotController.createStudioEditorDeckSnapshotController({
    snapshotApi: {
      createStudioDeckSnapshotBuilder(options) {
        builderOptions = options;
        return (currentDocument, currentOptions) => ({
          ...snapshot,
          currentDocument,
          currentOptions
        });
      }
    },
    getDocument: () => documentRef,
    ...callbacks
  });

  assert.deepEqual(controller.build(documentRef, buildOptions), {
    ...snapshot,
    currentDocument: documentRef,
    currentOptions: buildOptions
  });
  assert.equal(builderOptions.getDocument(), documentRef);
  Object.entries(callbacks).forEach(([name, callback]) => {
    assert.equal(builderOptions[name], callback);
  });
});

test('deck snapshot controller fails closed when the shared snapshot builder is unavailable', () => {
  const controller = snapshotController.createStudioEditorDeckSnapshotController({
    getDocument: () => ({ id: 'editor-document' })
  });

  assert.equal(controller.build(), null);
});

test('editor routes deck snapshot construction through the shared controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /SlideNextStudioEditorDeckSnapshotController/);
  assert.match(source, /studioEditorDeckSnapshotController\.build\(doc, options\)/);
});

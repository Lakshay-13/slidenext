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
  let domOptions = null;
  const callbacks = {
    buildCanonicalDeck: () => snapshot,
    getPendingCanonicalDeck: () => snapshot,
    isCanonicalDeck: () => true,
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
      },
      buildStudioDeckSnapshotFromDom(currentDocument, options) {
        domOptions = { currentDocument, options };
        return { activeSlideId: 'dom-slide', slides: [] };
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
  assert.equal(builderOptions.buildCanonicalDeck, callbacks.buildCanonicalDeck);
  assert.equal(builderOptions.getPendingCanonicalDeck, callbacks.getPendingCanonicalDeck);
  assert.equal(builderOptions.isCanonicalDeck, callbacks.isCanonicalDeck);
  Object.entries(callbacks).forEach(([name, callback]) => {
    assert.equal(builderOptions[name], callback);
  });
  assert.deepEqual(controller.buildFromDom(documentRef, buildOptions), {
    activeSlideId: 'dom-slide',
    slides: []
  });
  assert.equal(domOptions.currentDocument, documentRef);
  assert.equal(domOptions.options.includeLayers, true);
  assert.equal(domOptions.options.getSlides instanceof Function, true);
  assert.equal(domOptions.options.getActiveSlide instanceof Function, true);
  assert.equal(domOptions.options.getSlideId instanceof Function, true);
  assert.equal(domOptions.options.getSlideEditableElements instanceof Function, true);
  assert.equal(domOptions.options.getNormalizedSlideLayerOrder instanceof Function, true);
  assert.equal(domOptions.options.elementSnapshotOptions.buildElementSnapshot instanceof Function, true);
});

test('deck snapshot controller fails closed when the shared snapshot builder is unavailable', () => {
  const controller = snapshotController.createStudioEditorDeckSnapshotController({
    getDocument: () => ({ id: 'editor-document' })
  });

  assert.equal(controller.build(), null);
  assert.equal(controller.buildFromDom(), null);
});

test('editor routes deck snapshot construction through the shared controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /\/shared\/studio-editor-deck-snapshot-controller\.js/);
  assert.match(source, /SlideNextStudioEditorDeckSnapshotAccessors/);
  assert.match(source, /accessors\.build\(doc, options\)/);
  assert.match(source, /accessors\.buildFromDom\(doc, options\)/);
});

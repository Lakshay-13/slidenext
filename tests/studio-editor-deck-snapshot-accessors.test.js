const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const snapshotAccessors = require('../shared/studio-editor-deck-snapshot-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('deck snapshot accessors prefer the runtime controller', () => {
  const calls = [];
  const controller = {
    build(doc, options) {
      calls.push(['build', doc, options]);
      return 'controller-build';
    },
    buildFromDom(doc, options) {
      calls.push(['buildFromDom', doc, options]);
      return 'controller-dom';
    }
  };
  const accessors = snapshotAccessors.createStudioEditorDeckSnapshotAccessors({
    controller,
    snapshotApi: {
      createStudioDeckSnapshotBuilder() {
        throw new Error('legacy builder should not run');
      },
      buildStudioDeckSnapshotFromDom() {
        throw new Error('legacy DOM builder should not run');
      }
    }
  });

  assert.equal(accessors.build({ id: 'doc' }, { includeLayers: true }), 'controller-build');
  assert.equal(accessors.buildFromDom({ id: 'doc' }, { includeLayers: true }), 'controller-dom');
  assert.deepEqual(calls, [
    ['build', { id: 'doc' }, { includeLayers: true }],
    ['buildFromDom', { id: 'doc' }, { includeLayers: true }]
  ]);
});

test('deck snapshot accessors preserve the legacy snapshot builder fallback', () => {
  const documentRef = { id: 'editor-document' };
  const buildOptions = { includeLayers: true };
  let builderOptions = null;
  let domOptions = null;
  const callbacks = {
    buildCanonicalDeck: () => ({ slides: [] }),
    getPendingCanonicalDeck: () => ({ slides: [] }),
    isCanonicalDeck: () => true,
    createDeckViewStateOptions: () => ({ marker: 'view-state' }),
    resolveCanonicalDeckViewState: () => ({ marker: 'canonical-state' }),
    resolveFallbackActiveSlideId: () => 'slide-fallback',
    resolveLiveActiveSlide: () => ({ id: 'active-slide' }),
    getActiveSlideId: () => 'slide-live',
    getSlideById: () => ({ id: 'slide-live' }),
    buildSlideLayerSnapshot: () => ({ id: 'layer-1' }),
    getSlides: () => [],
    getActiveSlide: () => null,
    getSlideId: () => 'slide-live',
    getSlideEditableElements: () => [],
    getNormalizedSlideLayerOrder: () => [],
    buildElementSnapshot: () => ({})
  };
  const accessors = snapshotAccessors.createStudioEditorDeckSnapshotAccessors({
    snapshotApi: {
      createStudioDeckSnapshotBuilder(options) {
        builderOptions = options;
        return (doc, optionsForBuild) => ({ doc, optionsForBuild });
      },
      buildStudioDeckSnapshotFromDom(doc, options) {
        domOptions = { doc, options };
        return { doc, includeLayers: options.includeLayers };
      }
    },
    getDocument: () => documentRef,
    ...callbacks
  });

  assert.deepEqual(accessors.build(documentRef, buildOptions), {
    doc: documentRef,
    optionsForBuild: buildOptions
  });
  assert.equal(builderOptions.getDocument(), documentRef);
  [
    'buildCanonicalDeck',
    'getPendingCanonicalDeck',
    'isCanonicalDeck',
    'createDeckViewStateOptions',
    'resolveCanonicalDeckViewState',
    'resolveFallbackActiveSlideId',
    'resolveLiveActiveSlide',
    'getActiveSlideId',
    'getSlideById',
    'buildSlideLayerSnapshot'
  ].forEach((name) => {
    const callback = callbacks[name];
    assert.equal(builderOptions[name], callback);
  });

  assert.deepEqual(accessors.buildFromDom(documentRef, buildOptions), {
    doc: documentRef,
    includeLayers: true
  });
  assert.equal(domOptions.doc, documentRef);
  assert.equal(domOptions.options.getSlides, callbacks.getSlides);
  assert.equal(domOptions.options.getActiveSlide, callbacks.getActiveSlide);
  assert.equal(domOptions.options.getSlideId, callbacks.getSlideId);
  assert.equal(domOptions.options.getSlideEditableElements, callbacks.getSlideEditableElements);
  assert.equal(domOptions.options.getNormalizedSlideLayerOrder, callbacks.getNormalizedSlideLayerOrder);
  assert.equal(domOptions.options.elementSnapshotOptions.buildElementSnapshot, callbacks.buildElementSnapshot);
});

test('editor routes deck snapshot construction through the shared accessors', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-deck-snapshot-accessors\.js/);
  assert.match(source, /studioEditorDeckSnapshotShellComposition/);
  assert.doesNotMatch(
    source,
    /SlideNextStudioEditorDeckSnapshotAccessors\.createStudioEditorDeckSnapshotAccessors\(/
  );
  assert.match(source, /accessors\.build\(doc, options\)/);
  assert.match(source, /accessors\.buildFromDom\(doc, options\)/);
  assert.match(source, /buildCanonicalDeck: typeof resolveEditorUiCanonicalDeck === 'function'/);
  assert.match(source, /getPendingCanonicalDeck: getStudioPendingEditorCanonicalDeck/);
  assert.match(source, /isCanonicalDeck: typeof getEditorCanonicalDeckValidator === 'function'/);
});

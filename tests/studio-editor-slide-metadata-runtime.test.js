const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const slideMetadataRuntime = require('../shared/studio-editor-slide-metadata-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('slide metadata runtime composes metadata controller dependencies', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorSlideMetadataController(options) {
      calls.push(options);
      return { name: 'slide-metadata' };
    }
  };
  const options = {
    controllerApi,
    slideMetadataApi: {},
    metadataApi: {},
    metadataActions: {},
    canonicalMetadataApi: {},
    canonicalDeckApi: {},
    transactionApi: {},
    buildCanonicalDeckBaseline: () => ({}),
    getCanonicalDeckBaseline: () => ({}),
    resolveReadyState: () => ({}),
    getDocument: () => null,
    getActiveSlide: () => null,
    getElementId: () => '',
    finalizeMutation: () => {},
    syncChrome: () => {}
  };

  assert.deepEqual(
    slideMetadataRuntime.createStudioEditorSlideMetadataRuntime(options),
    { slideMetadataController: { name: 'slide-metadata' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].slideMetadataApi, options.slideMetadataApi);
  assert.equal(calls[0].metadataApi, options.metadataApi);
  assert.equal(calls[0].canonicalDeckApi, options.canonicalDeckApi);
  assert.equal(calls[0].buildCanonicalDeckBaseline, options.buildCanonicalDeckBaseline);
  assert.equal(calls[0].finalizeMutation, options.finalizeMutation);
});

test('index wires slide metadata through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-slide-metadata-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorSlideMetadataRuntime\.createStudioEditorSlideMetadataRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorSlideMetadataController\.createStudioEditorSlideMetadataController\(/
  );
});

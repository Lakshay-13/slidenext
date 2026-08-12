const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const masterSlideRuntime = require('../shared/studio-editor-master-slide-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('master-slide runtime composes controller dependencies without changing them', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorMasterSlideController(options) {
      calls.push(options);
      return { name: 'master-slide' };
    }
  };
  const options = {
    controllerApi,
    canonicalDeckApi: {},
    canonicalStateApi: {},
    renderApi: {},
    getCanonicalDeck: () => null,
    getCanonicalDeckBaseline: () => null,
    getDocument: () => null,
    getSlides: () => [],
    getActiveSlideId: () => '',
    prepareSlide: () => {},
    setActiveSlide: () => {},
    generateThumbnails: () => {},
    saveHistoryState: () => {},
    triggerAutoSave: () => {},
    triggerAutoVersion: () => {},
    finalizeMutation: () => {},
    onMasterSlidesChanged: () => {}
  };

  assert.deepEqual(
    masterSlideRuntime.createStudioEditorMasterSlideRuntime(options),
    { masterSlideController: { name: 'master-slide' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].canonicalDeckApi, options.canonicalDeckApi);
  assert.equal(calls[0].canonicalStateApi, options.canonicalStateApi);
  assert.equal(calls[0].getDocument, options.getDocument);
  assert.equal(calls[0].getSlides, options.getSlides);
  assert.equal(calls[0].setActiveSlide, options.setActiveSlide);
  assert.equal(calls[0].finalizeMutation, options.finalizeMutation);
  assert.equal(calls[0].onMasterSlidesChanged, options.onMasterSlidesChanged);
});

test('index wires master-slide persistence through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-master-slide-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorMasterSlideRuntime\.createStudioEditorMasterSlideRuntime\(/
  );
  assert.match(
    fileContent,
    /getActiveSlideId: \(doc\) => getActiveSlideId\(doc \|\| getIframeDoc\(\)\),/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorMasterSlideController\.createStudioEditorMasterSlideController\(/
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const payloadRuntime = require('../shared/studio-editor-clipboard-payload-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('clipboard payload runtime composes DOM and transform dependencies', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorClipboardPayloadController(options) {
      calls.push(options);
      return { name: 'clipboard-payload' };
    }
  };
  const options = {
    controllerApi,
    clipboardApi: {},
    domApi: {},
    transformApi: {},
    getIframeDoc: () => null,
    getActiveSlide: () => null,
    getSlideMetrics: () => null,
    getNormalizedSlideLayerOrder: () => [],
    sanitizeElement: () => {},
    getRectOnSlide: () => null,
    getClosestPositionedAncestor: () => null,
    buildPositionedLayoutItem: () => null
  };

  assert.deepEqual(
    payloadRuntime.createStudioEditorClipboardPayloadRuntime(options),
    { payloadController: { name: 'clipboard-payload' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].domApi, options.domApi);
  assert.equal(calls[0].transformApi, options.transformApi);
  assert.equal(calls[0].getNormalizedSlideLayerOrder, options.getNormalizedSlideLayerOrder);
  assert.equal(calls[0].buildPositionedLayoutItem, options.buildPositionedLayoutItem);
});

test('index wires clipboard payload construction through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-clipboard-payload-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorClipboardPayloadRuntime\.createStudioEditorClipboardPayloadRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorClipboardPayloadController\.createStudioEditorClipboardPayloadController\(/
  );
});

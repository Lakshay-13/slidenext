const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const payloadRuntime = require('../shared/studio-editor-clipboard-payload-runtime.js');
const payloadRuntimeAccessors = require('../shared/studio-editor-clipboard-payload-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('clipboard payload runtime accessors delegate to the shell runtime', () => {
  const runtime = { name: 'clipboard-payload-shell' };
  let receivedOptions = null;
  const shellRuntimeApi = {
    createStudioEditorClipboardPayloadShellRuntime(options) {
      receivedOptions = options;
      return runtime;
    }
  };
  const payloadRuntimeApi = { name: 'payload-runtime' };
  const callback = () => {};

  const result = payloadRuntimeAccessors.createStudioEditorClipboardPayloadRuntimeAccessors({
    runtimeApi: shellRuntimeApi,
    payloadRuntimeApi,
    runtimeOptions: {
      getIframeDoc: callback
    }
  });

  assert.deepEqual(result, { runtime });
  assert.equal(receivedOptions.payloadRuntimeApi, payloadRuntimeApi);
  assert.equal(receivedOptions.getIframeDoc, callback);
});

test('clipboard payload runtime accessors fail closed without a shell runtime', () => {
  assert.deepEqual(
    payloadRuntimeAccessors.createStudioEditorClipboardPayloadRuntimeAccessors({
      runtimeApi: null
    }),
    { runtime: null }
  );
});

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
    /<script src="\/shared\/studio-editor-clipboard-payload-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-clipboard-payload-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorClipboardPayloadRuntimeAccessorsApi\s*\.\s*createStudioEditorClipboardPayloadRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorClipboardPayloadShellRuntime\.createStudioEditorClipboardPayloadShellRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorClipboardPayloadController\.createStudioEditorClipboardPayloadController\(/
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const groupStateShellRuntime = require('../shared/studio-editor-group-state-shell-runtime.js');
const groupStateAccessors = require('../shared/studio-editor-group-state-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('group-state shell runtime forwards selection and layout callbacks', () => {
  let receivedOptions = null;
  const controller = { buildActionState() {} };
  const groupStateApi = {
    createStudioEditorGroupStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const options = {
    groupStateApi,
    groupApi: { name: 'group' },
    getDocument: () => null,
    getSelectedElements: () => [],
    getActiveSlide: () => null,
    getLiveSelectedElements: (selection) => selection,
    getSlideMetrics: () => null,
    buildPositionedLayoutItems: () => [],
    getClosestPositionedAncestor: () => null,
    getRectOnSlide: (rect) => rect,
    getLockedState: () => () => false,
    getFreeformPositioned: () => () => true,
    isFreeformPositioned: () => true
  };

  const runtime = groupStateShellRuntime
    .createStudioEditorGroupStateShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.groupStateController, controller);
  assert.equal(receivedOptions.groupApi, options.groupApi);
  assert.equal(receivedOptions.getDocument, options.getDocument);
  assert.equal(receivedOptions.getSelectedElements, options.getSelectedElements);
  assert.equal(receivedOptions.getActiveSlide, options.getActiveSlide);
  assert.equal(receivedOptions.getLiveSelectedElements, options.getLiveSelectedElements);
  assert.equal(receivedOptions.getSlideMetrics, options.getSlideMetrics);
  assert.equal(receivedOptions.buildPositionedLayoutItems, options.buildPositionedLayoutItems);
  assert.equal(receivedOptions.getClosestPositionedAncestor, options.getClosestPositionedAncestor);
  assert.equal(receivedOptions.getRectOnSlide, options.getRectOnSlide);
  assert.equal(receivedOptions.getLockedState, options.getLockedState);
  assert.equal(receivedOptions.getFreeformPositioned, options.getFreeformPositioned);
  assert.equal(receivedOptions.isFreeformPositioned, options.isFreeformPositioned);
});

test('group-state shell runtime fails closed when the shared state API is unavailable', () => {
  const runtime = groupStateShellRuntime
    .createStudioEditorGroupStateShellRuntime({ groupStateApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.groupStateController, null);
});

test('group-state accessors compose the shell runtime and preserve dependencies', () => {
  const runtime = { isAvailable: true, groupStateController: { name: 'group' } };
  const runtimeOptions = { getDocument: () => null };
  const calls = [];
  const runtimeApi = {
    createStudioEditorGroupStateShellRuntime(options) {
      calls.push(options);
      return runtime;
    }
  };
  const groupStateApi = { name: 'state' };
  const accessors = groupStateAccessors.createStudioEditorGroupStateAccessors({
    runtimeApi,
    groupStateApi,
    runtimeOptions
  });

  assert.equal(accessors.runtime, runtime);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].groupStateApi, groupStateApi);
  assert.equal(calls[0].getDocument, runtimeOptions.getDocument);
  assert.notEqual(calls[0], runtimeOptions);
});

test('group-state accessors fail closed when the shell runtime is unavailable', () => {
  const accessors = groupStateAccessors.createStudioEditorGroupStateAccessors({
    runtimeApi: null
  });

  assert.equal(accessors.runtime, null);
});

test('index routes group-state construction through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-group-state-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-group-state-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorGroupStateAccessorsApi\s*\.\s*createStudioEditorGroupStateAccessors\(/
  );
  assert.match(
    fileContent,
    /studioEditorGroupStateController = studioEditorGroupStateShellRuntime/
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const groupStateShellRuntime = require('../shared/studio-editor-group-state-shell-runtime.js');

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

test('index routes group-state construction through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-group-state-shell-runtime\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorGroupStateShellRuntimeApi/);
  assert.match(fileContent, /createStudioEditorGroupStateShellRuntime/);
  assert.match(
    fileContent,
    /studioEditorGroupStateController = studioEditorGroupStateShellRuntime/
  );
});

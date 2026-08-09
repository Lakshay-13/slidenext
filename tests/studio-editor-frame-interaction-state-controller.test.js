const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const frameInteractionState = require('../shared/studio-editor-frame-interaction-state-controller.js');

test('frame interaction state controller owns drag and click suppression state', () => {
  const controller = frameInteractionState.createStudioEditorFrameInteractionStateController({
    initialIsDraggingElement: true,
    initialSuppressNextFrameClick: true
  });

  assert.equal(controller.getIsDraggingElement(), true);
  assert.equal(controller.getSuppressNextFrameClick(), true);
  assert.equal(controller.consumeClickSuppression(), true);
  assert.equal(controller.consumeClickSuppression(), false);

  assert.equal(controller.setIsDraggingElement(false), false);
  assert.equal(controller.setSuppressNextFrameClick(true), true);
  controller.clear();
  assert.equal(controller.getIsDraggingElement(), false);
  assert.equal(controller.getSuppressNextFrameClick(), false);
});

test('editor delegates transient frame interaction state to the controller', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');

  assert.match(indexHtml, /studio-editor-frame-interaction-state-controller\.js/);
  assert.match(indexHtml, /studio-editor-frame-runtime\.js/);
  assert.match(indexHtml, /SlideNextStudioEditorFrameRuntime\.createStudioEditorFrameRuntime\(/);
  assert.match(indexHtml, /getIsDraggingElement\(\)/);
  assert.match(indexHtml, /setIsDraggingElement\(nextValue\)/);
  assert.doesNotMatch(indexHtml, /let isDraggingElement = false/);
  assert.doesNotMatch(indexHtml, /let suppressNextFrameClick = false/);
  assert.doesNotMatch(indexHtml, /createStudioEditorFrameInteractionStateController\(\{\}\)/);
});

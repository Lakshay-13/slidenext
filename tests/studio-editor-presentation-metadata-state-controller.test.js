const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerApi = require('../shared/studio-editor-presentation-metadata-state-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('presentation metadata controller owns the current metadata value', () => {
  const initialMetadata = { id: 'deck-1', title: 'Demo' };
  const controller = controllerApi.createStudioEditorPresentationMetadataStateController({
    presentationMetadata: initialMetadata
  });

  assert.equal(controller.getPresentationMetadata(), initialMetadata);
  const nextMetadata = { id: 'deck-2', title: 'Updated' };
  assert.equal(controller.setPresentationMetadata(nextMetadata), nextMetadata);
  assert.equal(controller.getPresentationMetadata(), nextMetadata);
  assert.equal(controller.reset(), null);
});

test('presentation metadata controller normalizes empty values to null', () => {
  const controller = controllerApi.createStudioEditorPresentationMetadataStateController({
    presentationMetadata: false
  });

  assert.equal(controller.getPresentationMetadata(), null);
  assert.equal(controllerApi.normalizePresentationMetadata(undefined), null);
  assert.equal(controllerApi.normalizePresentationMetadata({ id: 'deck-1' }).id, 'deck-1');
});

test('editor wires presentation metadata reads and writes through the controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-presentation-metadata-state-controller\.js/);
  assert.match(source, /studio-editor-presentation-metadata-store\.js/);
  assert.match(source, /studioEditorStateBridge/);
  assert.match(source, /getStudioCurrentPresentationMetadata\(\)/);
  assert.match(source, /setStudioCurrentPresentationMetadata\(/);
  assert.doesNotMatch(source, /const studioEditorPresentationMetadataStateController =/);
  assert.doesNotMatch(source, /\blet currentPresentationMetadata\b/);
});

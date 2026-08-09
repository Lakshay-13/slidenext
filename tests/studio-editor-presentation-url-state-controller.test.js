const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerApi = require('../shared/studio-editor-presentation-url-state-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('presentation URL controller owns the active deck URL', () => {
  const controller = controllerApi.createStudioEditorPresentationUrlStateController({
    presentationUrl: '/presentations/demo/index.html'
  });

  assert.equal(controller.getPresentationUrl(), '/presentations/demo/index.html');
  assert.equal(controller.setPresentationUrl('/presentations/next/index.html'), '/presentations/next/index.html');
  assert.equal(controller.getPresentationUrl(), '/presentations/next/index.html');
  assert.equal(controller.reset(), '');
});

test('presentation URL controller normalizes non-string values', () => {
  const controller = controllerApi.createStudioEditorPresentationUrlStateController({
    presentationUrl: 42
  });

  assert.equal(controller.getPresentationUrl(), '');
  assert.equal(controller.setPresentationUrl(null), '');
  assert.equal(controllerApi.normalizePresentationUrl('/presentations/demo/index.html'), '/presentations/demo/index.html');
  assert.equal(controllerApi.normalizePresentationUrl(false), '');
});

test('editor wires presentation URL reads and writes through the controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-presentation-url-state-controller\.js/);
  assert.match(source, /getStudioCurrentPresentationUrl\(\)/);
  assert.match(source, /setStudioCurrentPresentationUrl\(/);
  assert.doesNotMatch(source, /\blet currentPresentationUrl\b/);
});

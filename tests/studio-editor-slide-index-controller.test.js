const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const slideIndexController = require('../shared/studio-editor-slide-index-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('slide index controller owns the active slide index', () => {
  const controller = slideIndexController.createStudioEditorSlideIndexController({
    initialSlideIndex: 3
  });

  assert.equal(controller.getSlideIndex(), 3);
  assert.equal(controller.setSlideIndex(7), 7);
  assert.equal(controller.getSlideIndex(), 7);
});

test('slide index controller owns and normalizes the active slide ID', () => {
  const controller = slideIndexController.createStudioEditorSlideIndexController({
    initialSlideId: '  slide-1  '
  });

  assert.equal(controller.getSlideId(), 'slide-1');
  assert.equal(controller.setSlideId('  slide-2  '), 'slide-2');
  assert.equal(controller.setSlideId(null), '');
  assert.equal(controller.getSlideId(), '');
});

test('slide index controller rejects invalid navigation state without changing the current index', () => {
  const controller = slideIndexController.createStudioEditorSlideIndexController({
    initialSlideIndex: 2.5
  });

  assert.equal(controller.getSlideIndex(), 0);
  assert.equal(controller.setSlideIndex(4), 4);
  assert.equal(controller.setSlideIndex(-1), 4);
  assert.equal(controller.setSlideIndex(1.5), 4);
  assert.equal(controller.setSlideIndex('5'), 4);
  assert.equal(controller.setSlideIndex(Number.NaN), 4);
  assert.equal(controller.getSlideIndex(), 4);
});

test('editor wiring routes active slide index consumers through the shared controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-slide-index-controller\.js"><\/script>/
  );
  assert.match(fileContent, /studio-editor-slide-index-store\.js/);
  assert.match(fileContent, /studioEditorStateBridge/);
  assert.match(fileContent, /getCurrentSlideIndex: getStudioCurrentSlideIndex/);
  assert.match(fileContent, /setCurrentSlideId: setStudioCurrentSlideId/);
  assert.doesNotMatch(fileContent, /const studioEditorSlideIndexController =/);
  assert.doesNotMatch(fileContent, /let currentSlideIndex = 0/);
  assert.doesNotMatch(fileContent, /currentSlideIndex = sessionStateUpdate\.slideIndex/);
});

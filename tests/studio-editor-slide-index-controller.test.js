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

test('editor wiring routes active slide index consumers through the shared controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-slide-index-controller\.js"><\/script>/
  );
  assert.match(fileContent, /createStudioEditorSlideIndexController\(\{/);
  assert.match(fileContent, /getCurrentSlideIndex: getStudioCurrentSlideIndex/);
  assert.doesNotMatch(fileContent, /let currentSlideIndex = 0/);
  assert.doesNotMatch(fileContent, /currentSlideIndex = sessionStateUpdate\.slideIndex/);
});

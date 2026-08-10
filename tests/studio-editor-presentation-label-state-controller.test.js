const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const labelStateController = require('../shared/studio-editor-presentation-label-state-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('presentation label state controller owns title and category state', () => {
  const controller = labelStateController.createStudioEditorPresentationLabelStateController({
    initialTitle: 'Project Onboarding',
    initialCategory: 'General'
  });

  assert.deepEqual(controller.getState(), {
    title: 'Project Onboarding',
    category: 'General'
  });
  assert.equal(controller.setTitle('AI Tools'), 'AI Tools');
  assert.equal(controller.setCategory('Research'), 'Research');
  assert.deepEqual(controller.getState(), {
    title: 'AI Tools',
    category: 'Research'
  });
  assert.deepEqual(controller.reset(), {
    title: '',
    category: ''
  });
});

test('presentation label state controller normalizes non-string labels', () => {
  const controller = labelStateController.createStudioEditorPresentationLabelStateController({
    initialTitle: 42,
    initialCategory: null
  });

  assert.deepEqual(controller.getState(), { title: '', category: '' });
  assert.deepEqual(controller.setState({ title: 'Deck', category: 7 }), {
    title: 'Deck',
    category: ''
  });
});

test('editor routes presentation title and category through the shared composition adapter', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-presentation-label-store\.js/);
  assert.match(source, /studioEditorStateBridge/);
  assert.match(source, /getStudioPresentationTitle\(\)/);
  assert.match(source, /getStudioPresentationCategory\(\)/);
  assert.doesNotMatch(source, /const studioEditorPresentationLabelStateController =/);
  assert.doesNotMatch(source, /let currentTitle = ''/);
  assert.doesNotMatch(source, /let currentCategory = ''/);
});

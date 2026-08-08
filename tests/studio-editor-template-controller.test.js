const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const templateController = require('../shared/studio-editor-template-controller.js');

test('template controller saves the active slide and finalizes persistence hooks', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Hero', nodes: [{ id: 'title', text: 'Hello' }] }]
  });
  const calls = [];
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    },
    triggerAutoSave() {
      calls.push(['save']);
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    },
    onTemplatesChanged(templates, nextDeck) {
      calls.push(['templates', templates.map((template) => template.id), nextDeck]);
    }
  });

  const result = controller.saveActiveSlide({ id: 'hero-template', name: 'Hero Template' });

  assert.equal(result.templates[0].name, 'Hero Template');
  assert.equal(result.templates[0].slide.title, 'Hero');
  assert.equal(sourceDeck.templates, undefined);
  assert.equal(calls[0][0], 'history');
  assert.equal(calls[0][1], false);
  assert.equal(calls[0][2], null);
  assert.equal(calls[0][3], result);
  assert.deepEqual(calls.slice(1, 3), [['save'], ['version', 'Auto: Saved Template "Hero Template"']]);
  assert.deepEqual(calls[3][0], 'templates');
  assert.deepEqual(calls[3][1], ['hero-template']);
});

test('template mutations prefer a valid live canonical baseline', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Hero', nodes: [{ id: 'title', text: 'Hello' }] }]
  });
  let didBuildFromDocument = false;
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline: () => liveDeck,
    getCanonicalDeck: () => {
      didBuildFromDocument = true;
      return canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
    },
    getActiveSlideId: () => 'slide-1'
  });

  const result = controller.saveActiveSlide({ id: 'live-template', name: 'Live Template' });

  assert.equal(result.templates[0].id, 'live-template');
  assert.equal(didBuildFromDocument, false);
});

test('template controller fails closed when the active slide or dependencies are unavailable', () => {
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] }),
    getActiveSlideId: () => ''
  });

  assert.equal(controller.saveActiveSlide({ name: 'Empty' }), null);
  assert.equal(templateController.createStudioEditorTemplateController().saveActiveSlide(), null);
});

test('template controller inserts a rendered template after the active slide through a transaction', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    templates: [{
      id: 'hero-template',
      name: 'Hero Template',
      slide: { nodes: [{ id: 'title', tagName: 'h1', text: 'Hero' }] }
    }],
    slides: [{ id: 'slide-1', title: 'Current' }]
  });
  const currentSlide = { id: 'current-slide' };
  const container = {
    children: [],
    appendChild(element) {
      this.children.push(element);
    },
    insertBefore(element, beforeNode) {
      const index = this.children.indexOf(beforeNode);
      this.children.splice(index < 0 ? this.children.length : index, 0, element);
    }
  };
  const documentRef = {
    createElement(tagName) {
      if (tagName !== 'template') return null;
      const rootElement = { dataset: {}, children: [] };
      return {
        content: { firstElementChild: rootElement },
        set innerHTML(value) {
          this.markup = value;
        }
      };
    }
  };
  const calls = [];
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    renderApi: {
      renderCanonicalSlide(slide) {
        return `<section data-slide-id="${slide.id}"></section>`;
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getDocument: () => documentRef,
    getSlideContainer: () => container,
    getSlides: () => [currentSlide],
    prepareSlide(element) {
      element.prepared = true;
    },
    applyInsertion(target, element, options) {
      target.insertBefore(element, options.beforeNode || null);
      return { didApply: true, transaction: { kind: 'slide-insert' } };
    },
    generateThumbnails() {
      calls.push(['thumbnails']);
    },
    setActiveSlide(index) {
      calls.push(['active', index]);
    },
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    },
    finalizeMutation(...args) {
      calls.push(['finalize', ...args]);
    }
  });

  assert.equal(controller.insertTemplate('hero-template'), true);
  assert.equal(container.children.length, 1);
  assert.equal(container.children[0].prepared, true);
  assert.equal(calls[0][0], 'history');
  assert.deepEqual(calls.slice(1, 3), [['thumbnails'], ['active', 1]]);
  assert.equal(calls[3][0], 'finalize');
  assert.equal(calls[3][1], 'Auto: Inserted Template "Hero Template"');
  assert.equal(calls[3][2].kind, 'slide-insert');
  assert.equal(calls[3][3].slides.length, 2);
});

test('template controller removes a saved template and finalizes persistence hooks', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    templates: [
      { id: 'hero-template', name: 'Hero Template' },
      { id: 'stats-template', name: 'Stats Template' }
    ],
    slides: [{ id: 'slide-1' }]
  });
  const calls = [];
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    },
    triggerAutoSave() {
      calls.push(['save']);
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    },
    onTemplatesChanged(templates, nextDeck) {
      calls.push(['templates', templates.map((template) => template.id), nextDeck]);
    }
  });

  const result = controller.removeTemplate('hero-template');

  assert.deepEqual(sourceDeck.templates.map((template) => template.id), [
    'hero-template', 'stats-template'
  ]);
  assert.deepEqual(result.templates.map((template) => template.id), ['stats-template']);
  assert.equal(calls[0][0], 'history');
  assert.equal(calls[0][1], false);
  assert.equal(calls[0][2], null);
  assert.equal(calls[0][3], result);
  assert.deepEqual(calls.slice(1, 3), [['save'], ['version', 'Auto: Removed Template "Hero Template"']]);
  assert.deepEqual(calls[3][0], 'templates');
  assert.deepEqual(calls[3][1], ['stats-template']);
});

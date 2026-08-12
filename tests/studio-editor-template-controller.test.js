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

test('template controller delegates canonical deck resolution to shared state', () => {
  const deck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1', title: 'Shared' }] });
  let resolverOptions = null;
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: {
      createStudioEditorCanonicalDeckResolver(options) {
        resolverOptions = options;
        return () => deck;
      }
    },
    getCanonicalDeckBaseline() {
      throw new Error('shared resolver should own baseline resolution');
    },
    getCanonicalDeck() {
      throw new Error('shared resolver should own fallback resolution');
    },
    getActiveSlideId: () => 'slide-1'
  });

  const result = controller.saveActiveSlide({ id: 'shared-template', name: 'Shared Template' });

  assert.equal(result.templates[0].slide.title, 'Shared');
  assert.equal(typeof resolverOptions.getCanonicalDeck, 'function');
  assert.equal(typeof resolverOptions.getCanonicalDeckBaseline, 'function');
  assert.equal(resolverOptions.isCanonicalDeck, canonicalDeck.isCanonicalDeck);
});

test('template mutations fall back when the live canonical baseline is invalid', () => {
  const fallbackDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Fallback' }]
  });
  let didBuildFromDocument = false;
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    getCanonicalDeck: () => {
      didBuildFromDocument = true;
      return fallbackDeck;
    },
    getActiveSlideId: () => 'slide-1'
  });

  const result = controller.saveActiveSlide({ id: 'fallback-template', name: 'Fallback Template' });

  assert.equal(result.templates[0].id, 'fallback-template');
  assert.equal(result.templates[0].slide.title, 'Fallback');
  assert.equal(didBuildFromDocument, true);
});

test('template mutations require strict canonical baseline validation', () => {
  const fallbackDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Fallback' }]
  });
  let didUseFallback = false;
  const canonicalDeckApi = {
    ...canonicalDeck,
    isCanonicalDeck: (value) => (
      value
        && value.kind === 'slidenext.deck'
        && Array.isArray(value.slides)
        ? true
        : 1
    )
  };
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    getCanonicalDeck: () => {
      didUseFallback = true;
      return fallbackDeck;
    },
    getActiveSlideId: () => 'slide-1',
    saveHistoryState: () => {}
  });

  const result = controller.saveActiveSlide({ name: 'Strict Template' });

  assert.equal(result.templates[0].name, 'Strict Template');
  assert.equal(didUseFallback, true);
});

test('template mutations reject malformed fallback state without a canonical validator', () => {
  const canonicalDeckApi = {
    ...canonicalDeck,
    isCanonicalDeck: undefined
  };
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    getCanonicalDeck: () => ({ invalid: true }),
    getActiveSlideId: () => 'slide-1'
  });

  assert.equal(controller.saveActiveSlide({ id: 'invalid-template' }), null);
});

test('template controller fails closed when saving a template canonical mutation throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Hero', nodes: [{ id: 'title', text: 'Hello' }] }]
  });
  const calls = [];
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: {
      ...canonicalDeck,
      saveCanonicalTemplateFromSlideId() {
        throw new Error('canonical template save failed');
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    saveHistoryState() {
      calls.push('history');
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion() {
      calls.push('version');
    },
    onTemplatesChanged() {
      calls.push('templates');
    }
  });

  assert.equal(controller.saveActiveSlide({ id: 'broken-template' }), null);
  assert.deepEqual(calls, []);
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
  const lookupCalls = [];
  const canonicalDeckApi = {
    ...canonicalDeck,
    findCanonicalSlideIndexById(deck, slideId) {
      lookupCalls.push([deck, slideId]);
      return canonicalDeck.findCanonicalSlideIndexById(deck, slideId);
    }
  };
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi,
    renderApi: {
      renderCanonicalSlide(slide) {
        return `<section data-slide-id="${slide.id}"></section>`;
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId(currentDocument) {
      assert.equal(currentDocument, documentRef);
      return 'slide-1';
    },
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
  assert.equal(calls[0][1], false);
  assert.equal(calls[0][2], null);
  assert.equal(calls[0][3], sourceDeck);
  assert.deepEqual(calls.slice(1, 3), [['thumbnails'], ['active', 1]]);
  assert.equal(calls[3][0], 'finalize');
  assert.equal(calls[3][1], 'Auto: Inserted Template "Hero Template"');
  assert.equal(calls[3][2].kind, 'slide-insert');
  assert.equal(calls[3][3].slides.length, 2);
  assert.deepEqual(lookupCalls, [[sourceDeck, 'slide-1']]);
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

test('template controller fails closed when removing a template canonical mutation throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    templates: [{ id: 'hero-template', name: 'Hero Template' }],
    slides: [{ id: 'slide-1' }]
  });
  const calls = [];
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: {
      ...canonicalDeck,
      removeCanonicalTemplate() {
        throw new Error('canonical template removal failed');
      }
    },
    getCanonicalDeck: () => sourceDeck,
    saveHistoryState() {
      calls.push('history');
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion() {
      calls.push('version');
    },
    onTemplatesChanged() {
      calls.push('templates');
    }
  });

  assert.equal(controller.removeTemplate('hero-template'), null);
  assert.deepEqual(calls, []);
});

test('template controller fails closed when inserting a template canonical mutation throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    templates: [{ id: 'hero-template', name: 'Hero Template' }],
    slides: [{ id: 'slide-1' }]
  });
  let didApply = false;
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: {
      ...canonicalDeck,
      insertCanonicalTemplateSlide() {
        throw new Error('canonical template insertion failed');
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    applyInsertion() {
      didApply = true;
      return { didApply: true };
    }
  });

  assert.equal(controller.insertTemplate('hero-template'), false);
  assert.equal(didApply, false);
});

test('template controller fails closed when rendering an inserted template slide throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    templates: [{ id: 'hero-template', name: 'Hero Template' }],
    slides: [{ id: 'slide-1' }]
  });
  let didApply = false;
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    renderApi: {
      renderCanonicalSlide() {
        throw new Error('template slide rendering failed');
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getDocument: () => ({
      createElement() {
        return {};
      }
    }),
    getSlideContainer: () => ({}),
    getSlides: () => [],
    applyInsertion() {
      didApply = true;
      return { didApply: true };
    }
  });

  assert.equal(controller.insertTemplate('hero-template'), false);
  assert.equal(didApply, false);
});

test('template controller fails closed when preparing an inserted template slide throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    templates: [{ id: 'hero-template', name: 'Hero Template' }],
    slides: [{ id: 'slide-1' }]
  });
  let didApply = false;
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    renderApi: {
      renderCanonicalSlide() {
        return '<section></section>';
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getDocument: () => ({
      createElement() {
        return {
          content: { firstElementChild: {} },
          set innerHTML(value) {
            this.markup = value;
          }
        };
      }
    }),
    getSlideContainer: () => ({}),
    getSlides: () => [],
    prepareSlide() {
      throw new Error('template slide preparation failed');
    },
    applyInsertion() {
      didApply = true;
      return { didApply: true };
    }
  });

  assert.equal(controller.insertTemplate('hero-template'), false);
  assert.equal(didApply, false);
});

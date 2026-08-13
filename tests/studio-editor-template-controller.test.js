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

test('template mutations prefer valid pending canonical state over the live baseline', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Hero', nodes: [{ id: 'title', text: 'Hello' }] }]
  });
  const pendingDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Pending Hero', nodes: [{ id: 'title', text: 'Hello' }] }]
  });
  let didBuildFromDocument = false;
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    getPendingCanonicalDeck: () => pendingDeck,
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
  assert.equal(result.templates[0].slide.title, 'Pending Hero');
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
    getPendingCanonicalDeck() {
      return deck;
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
  assert.equal(typeof resolverOptions.getPendingCanonicalDeck, 'function');
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

test('template controller scopes the legacy baseline fallback to the current document', () => {
  const documentRef = { id: 'template-frame' };
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Scoped' }]
  });
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    getDocument: () => documentRef,
    getCanonicalDeckBaseline: (currentDocument) => {
      assert.equal(currentDocument, documentRef);
      return sourceDeck;
    },
    getCanonicalDeck: () => {
      throw new Error('legacy baseline should satisfy the mutation');
    },
    getActiveSlideId: () => 'slide-1'
  });

  const result = controller.saveActiveSlide({ id: 'scoped-template' });

  assert.equal(result.templates[0].id, 'scoped-template');
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

test('template controller reports rejected canonical save without publishing template state', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let templatesChanged = 0;
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    finalizeMutation: () => false,
    onTemplatesChanged: () => { templatesChanged += 1; }
  });

  assert.equal(controller.saveActiveSlide({ id: 'rejected-template' }), null);
  assert.equal(Object.prototype.hasOwnProperty.call(sourceDeck, 'templates'), false);
  assert.equal(templatesChanged, 0);
});

test('template controller does not publish a saved template when history capture fails', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'title', tagName: 'h1', text: 'Hero' }] }]
  });
  let templatesChanged = 0;
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    saveHistoryState: () => {
      throw new Error('history unavailable');
    },
    onTemplatesChanged: () => { templatesChanged += 1; }
  });

  assert.equal(controller.saveActiveSlide({ id: 'rejected-template' }), null);
  assert.equal(Object.prototype.hasOwnProperty.call(sourceDeck, 'templates'), false);
  assert.equal(templatesChanged, 0);
});

test('template controller rejects object-form history capture failures', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'title', tagName: 'h1', text: 'Hero' }] }]
  });
  let templatesChanged = 0;
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    saveHistoryState: () => ({ didCapture: false }),
    onTemplatesChanged: () => { templatesChanged += 1; }
  });

  assert.equal(controller.saveActiveSlide({ id: 'rejected-template' }), null);
  assert.equal(templatesChanged, 0);
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

test('template controller does not insert when the history baseline is rejected', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    templates: [{
      id: 'hero-template',
      slide: { nodes: [{ id: 'title', tagName: 'h1', text: 'Hero' }] }
    }],
    slides: [{ id: 'slide-1' }]
  });
  const container = { insertBefore() { throw new Error('insertion should not run'); } };
  let insertionCalls = 0;
  const documentRef = {
    createElement() {
      return {
        content: { firstElementChild: {} },
        set innerHTML(value) {
          this.markup = value;
        }
      };
    }
  };
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    renderApi: {
      renderCanonicalSlide() {
        return '<section></section>';
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getDocument: () => documentRef,
    getSlideContainer: () => container,
    getSlides: () => [],
    applyInsertion() {
      insertionCalls += 1;
      return { didApply: true };
    },
    saveHistoryState: () => false
  });

  assert.equal(controller.insertTemplate('hero-template'), false);
  assert.equal(insertionCalls, 0);
});

test('template controller rolls back an inserted slide when persistence rejects', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    templates: [{
      id: 'hero-template',
      name: 'Hero Template',
      slide: { nodes: [{ id: 'title', tagName: 'h1', text: 'Hero' }] }
    }],
    slides: [{ id: 'slide-1', title: 'Current' }, { id: 'slide-3', title: 'Next' }]
  });
  const currentSlide = { id: 'current-slide' };
  const nextSlide = { id: 'next-slide' };
  const insertedSlide = { id: 'inserted-slide' };
  const container = {
    children: [nextSlide],
    insertBefore(element, beforeNode) {
      const index = this.children.indexOf(beforeNode);
      this.children.splice(index < 0 ? this.children.length : index, 0, element);
    }
  };
  const documentRef = {
    createElement(tagName) {
      if (tagName !== 'template') return null;
      return {
        content: { firstElementChild: insertedSlide },
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
      renderCanonicalSlide() {
        return '<section></section>';
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getDocument: () => documentRef,
    getSlideContainer: () => container,
    getSlides: () => [currentSlide, nextSlide],
    applyInsertion(target, element, options) {
      target.insertBefore(element, options.beforeNode);
      return { didApply: true, transaction: { kind: 'slide-insert' } };
    },
    generateThumbnails: () => calls.push('thumbnails'),
    setActiveSlide: (index) => calls.push(['active', index]),
    saveHistoryState: () => {},
    finalizeMutation: () => false,
    rollbackMutation: (transaction, sourceDoc) => {
      assert.deepEqual(transaction, { kind: 'slide-insert' });
      assert.equal(sourceDoc, documentRef);
      container.children = [nextSlide];
      calls.push('rollback');
    }
  });

  assert.equal(controller.insertTemplate('hero-template'), false);
  assert.deepEqual(container.children, [nextSlide]);
  assert.deepEqual(calls, [
    'thumbnails',
    ['active', 1],
    'rollback',
    'thumbnails',
    ['active', 0]
  ]);
});

test('template controller rolls back an inserted slide when history capture fails', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    templates: [{
      id: 'hero-template',
      slide: { nodes: [{ id: 'title', tagName: 'h1', text: 'Hero' }] }
    }],
    slides: [{ id: 'slide-1' }, { id: 'slide-3' }]
  });
  const currentSlide = { id: 'current-slide' };
  const nextSlide = { id: 'next-slide' };
  const insertedSlide = { id: 'inserted-slide' };
  const container = {
    children: [nextSlide],
    insertBefore(element, beforeNode) {
      const index = this.children.indexOf(beforeNode);
      this.children.splice(index < 0 ? this.children.length : index, 0, element);
    }
  };
  const documentRef = {
    createElement() {
      return {
        content: { firstElementChild: insertedSlide },
        set innerHTML(value) {
          this.markup = value;
        }
      };
    }
  };
  const calls = [];
  let historyCalls = 0;
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    renderApi: { renderCanonicalSlide: () => '<section></section>' },
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getDocument: () => documentRef,
    getSlideContainer: () => container,
    getSlides: () => [currentSlide, nextSlide],
    applyInsertion(target, element, options) {
      target.insertBefore(element, options.beforeNode);
      return { didApply: true, transaction: { kind: 'slide-insert' } };
    },
    generateThumbnails: () => calls.push('thumbnails'),
    setActiveSlide: (index) => calls.push(['active', index]),
    saveHistoryState: () => {
      historyCalls += 1;
      if (historyCalls === 1) return true;
      throw new Error('history unavailable');
    },
    rollbackMutation: (transaction, sourceDocument) => {
      assert.deepEqual(transaction, { kind: 'slide-insert' });
      assert.equal(sourceDocument, documentRef);
      container.children = [nextSlide];
      calls.push('rollback');
    }
  });

  assert.equal(controller.insertTemplate('hero-template'), false);
  assert.deepEqual(container.children, [nextSlide]);
  assert.deepEqual(calls, [
    'thumbnails',
    ['active', 1],
    'rollback',
    'thumbnails',
    ['active', 0]
  ]);
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

test('template controller reports rejected canonical removal without publishing template state', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    templates: [{ id: 'hero-template', name: 'Hero Template' }],
    slides: [{ id: 'slide-1' }]
  });
  let templatesChanged = 0;
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    finalizeMutation: () => false,
    onTemplatesChanged: () => { templatesChanged += 1; }
  });

  assert.equal(controller.removeTemplate('hero-template'), null);
  assert.deepEqual(sourceDeck.templates.map((template) => template.id), ['hero-template']);
  assert.equal(templatesChanged, 0);
});

test('template controller contains thrown canonical finalization without publishing template state', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Hero' }]
  });
  const calls = [];
  const controller = templateController.createStudioEditorTemplateController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    finalizeMutation: () => {
      throw new Error('template finalization failed');
    },
    onTemplatesChanged: () => calls.push('templates')
  });

  assert.equal(controller.saveActiveSlide({ id: 'hero-template', name: 'Hero Template' }), null);
  assert.equal(sourceDeck.templates, undefined);
  assert.deepEqual(calls, []);
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

test('template controller rolls back inserted slide when canonical finalization throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    templates: [{ id: 'hero-template', name: 'Hero Template' }],
    slides: [{ id: 'slide-1' }]
  });
  const documentRef = {
    createElement() {
      return {
        content: { firstElementChild: {} },
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
      renderCanonicalSlide() {
        return '<section></section>';
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getDocument: () => documentRef,
    getSlideContainer: () => ({}),
    getSlides: () => [{}],
    applyInsertion(target, element, options) {
      calls.push(['apply', target, element, options]);
      return { didApply: true, transaction: { kind: 'slide-insert' } };
    },
    finalizeMutation: () => {
      throw new Error('template insertion finalization failed');
    },
    rollbackMutation(transaction, sourceDocument) {
      calls.push(['rollback', transaction, sourceDocument]);
    },
    setActiveSlide: (index) => calls.push(['active', index])
  });

  assert.equal(controller.insertTemplate('hero-template'), false);
  assert.equal(calls[0][0], 'apply');
  assert.deepEqual(calls.slice(1), [
    ['active', 1],
    ['rollback', { kind: 'slide-insert' }, documentRef],
    ['active', 0]
  ]);
});

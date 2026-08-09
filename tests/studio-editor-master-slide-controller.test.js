const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const masterSlideController = require('../shared/studio-editor-master-slide-controller.js');

test('saveActiveSlide persists a master layout through the canonical deck', () => {
  let deck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Opening', nodes: [{ id: 'title', text: 'Hello' }] }]
  });
  const versionLabels = [];
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    saveHistoryState: (_debounce, _transaction, nextDeck) => {
      deck = nextDeck;
    },
    triggerAutoVersion: (label) => versionLabels.push(label)
  });

  const nextDeck = controller.saveActiveSlide({
    id: 'opening-master',
    name: 'Opening Master'
  });

  assert.equal(nextDeck.masterSlides[0].id, 'opening-master');
  assert.equal(nextDeck.masterSlides[0].slide.nodes[0].text, 'Hello');
  assert.equal(deck.masterSlides[0].name, 'Opening Master');
  assert.deepEqual(versionLabels, ['Auto: Saved Master Layout "Opening Master"']);
});

test('master slide mutations prefer a valid live canonical baseline', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Opening', nodes: [{ id: 'title', text: 'Hello' }] }]
  });
  let didBuildFromDocument = false;
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline: () => liveDeck,
    getCanonicalDeck: () => {
      didBuildFromDocument = true;
      return canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
    },
    getActiveSlideId: () => 'slide-1'
  });

  const result = controller.saveActiveSlide({ id: 'live-master', name: 'Live Master' });

  assert.equal(result.masterSlides[0].id, 'live-master');
  assert.equal(didBuildFromDocument, false);
});

test('master slide mutations fall back when the live canonical baseline is invalid', () => {
  const fallbackDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Fallback' }]
  });
  let didUseFallback = false;
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    getCanonicalDeck: () => {
      didUseFallback = true;
      return fallbackDeck;
    },
    getActiveSlideId: () => 'slide-1'
  });

  const result = controller.saveActiveSlide({ id: 'fallback-master', name: 'Fallback Master' });

  assert.equal(result.masterSlides[0].id, 'fallback-master');
  assert.equal(didUseFallback, true);
});

test('master slide mutations require strict canonical baseline validation', () => {
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
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    getCanonicalDeck: () => {
      didUseFallback = true;
      return fallbackDeck;
    },
    getActiveSlideId: () => 'slide-1'
  });

  const result = controller.saveActiveSlide({ id: 'strict-master', name: 'Strict Master' });

  assert.equal(result.masterSlides[0].id, 'strict-master');
  assert.equal(didUseFallback, true);
});

test('master slide mutations reject malformed fallback state without a canonical validator', () => {
  const canonicalDeckApi = {
    ...canonicalDeck,
    isCanonicalDeck: undefined
  };
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    getCanonicalDeck: () => ({ invalid: true }),
    getActiveSlideId: () => 'slide-1'
  });

  assert.equal(controller.saveActiveSlide({ id: 'invalid-master' }), null);
});

test('master slide controller fails closed when saving a master canonical mutation throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Opening', nodes: [{ id: 'title', text: 'Hello' }] }]
  });
  const calls = [];
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: {
      ...canonicalDeck,
      saveCanonicalMasterSlideFromSlideId() {
        throw new Error('canonical master save failed');
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
    onMasterSlidesChanged() {
      calls.push('masters');
    }
  });

  assert.equal(controller.saveActiveSlide({ id: 'broken-master' }), null);
  assert.deepEqual(calls, []);
});

test('master slide controller fails closed when assigning a master canonical mutation throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    masterSlides: [{ id: 'master-1', name: 'Brand Base' }],
    slides: [{ id: 'slide-1' }]
  });
  let replaceCount = 0;
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: {
      ...canonicalDeck,
      updateCanonicalSlideMasterSlide() {
        throw new Error('canonical master assignment failed');
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getSlides: () => [{
      replaceWith() {
        replaceCount += 1;
      }
    }]
  });

  assert.equal(controller.assignMasterSlide('master-1'), false);
  assert.equal(replaceCount, 0);
});

test('master slide controller fails closed when removing a master canonical mutation throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    masterSlides: [{ id: 'master-1', name: 'Brand Base' }],
    slides: [{ id: 'slide-1', masterSlideId: 'master-1' }]
  });
  let replaceCount = 0;
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: {
      ...canonicalDeck,
      removeCanonicalMasterSlide() {
        throw new Error('canonical master removal failed');
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getSlides: () => [{
      replaceWith() {
        replaceCount += 1;
      }
    }]
  });

  assert.equal(controller.removeMasterSlide('master-1'), false);
  assert.equal(replaceCount, 0);
});

test('assignMasterSlide rerenders the active slide and commits the reference', () => {
  let deck = canonicalDeck.createCanonicalDeck({
    masterSlides: [{
      id: 'master-1',
      name: 'Brand Base',
      slide: { nodes: [{ id: 'footer', tagName: 'p', text: 'Footer' }] }
    }],
    slides: [{ id: 'slide-1', nodes: [{ id: 'body', tagName: 'p', text: 'Body' }] }]
  });
  let activeSlide = { replaceWith(nextSlide) { activeSlide = nextSlide; } };
  let renderedOptions = null;
  let activeIndex = -1;
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: canonicalDeck,
    renderApi: {
      renderCanonicalSlide(_slide, _index, options) {
        renderedOptions = options;
        return '<section><p>Rendered</p></section>';
      }
    },
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getDocument: () => ({
      createElement() {
        return {
          content: { firstElementChild: { rendered: true } },
          set innerHTML(value) {
            this.html = value;
          }
        };
      }
    }),
    getSlides: () => [activeSlide],
    setActiveSlide: (index) => { activeIndex = index; },
    saveHistoryState: (_debounce, _transaction, nextDeck) => {
      deck = nextDeck;
    }
  });

  assert.equal(controller.assignMasterSlide('master-1'), true);
  assert.equal(deck.slides[0].masterSlideId, 'master-1');
  assert.deepEqual(renderedOptions.masterSlides.map((master) => master.id), ['master-1']);
  assert.equal(renderedOptions.preferSlideSourceHtml, false);
  assert.equal(activeSlide.rendered, true);
  assert.equal(activeIndex, 0);
});

test('removeMasterSlide detaches the active slide and rerenders it without the removed layout', () => {
  let deck = canonicalDeck.createCanonicalDeck({
    masterSlides: [{ id: 'master-1', name: 'Brand Base', slide: { nodes: [{ id: 'footer' }] } }],
    slides: [{ id: 'slide-1', masterSlideId: 'master-1', nodes: [{ id: 'body' }] }]
  });
  let replacementCount = 0;
  const activeSlide = {
    replaceWith() {
      replacementCount += 1;
    }
  };
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: canonicalDeck,
    renderApi: {
      renderCanonicalSlide() {
        return '<section></section>';
      }
    },
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getDocument: () => ({
      createElement() {
        return {
          content: { firstElementChild: {} },
          set innerHTML(value) {
            this.html = value;
          }
        };
      }
    }),
    getSlides: () => [activeSlide],
    saveHistoryState: (_debounce, _transaction, nextDeck) => {
      deck = nextDeck;
    }
  });

  assert.equal(controller.removeMasterSlide('master-1'), true);
  assert.deepEqual(deck.masterSlides, []);
  assert.equal(Object.prototype.hasOwnProperty.call(deck.slides[0], 'masterSlideId'), false);
  assert.equal(replacementCount, 1);
});

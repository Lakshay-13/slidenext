const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const masterSlideController = require('../shared/studio-editor-master-slide-controller.js');

function createReplaceableSlide(initialSlide = {}) {
  const parent = {
    current: initialSlide,
    replaceChild(nextSlide, previousSlide) {
      if (previousSlide !== this.current) {
        throw new Error('unexpected slide replacement target');
      }
      this.current = nextSlide;
      nextSlide.parentNode = this;
      previousSlide.parentNode = null;
    }
  };
  initialSlide.parentNode = parent;
  initialSlide.replaceWith = function replaceWith(nextSlide) {
    parent.replaceChild(nextSlide, this);
  };
  return parent;
}

function createMasterSlideDocument(parent) {
  return {
    createElement() {
      const nextSlide = {
        replaceWith(previousSlide) {
          parent.replaceChild(previousSlide, this);
        }
      };
      return {
        content: { firstElementChild: nextSlide },
        set innerHTML(value) {
          this.html = value;
        }
      };
    }
  };
}

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

test('saveActiveSlide preserves a committed save when publication throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Opening', nodes: [{ id: 'title', text: 'Hello' }] }]
  });
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    saveHistoryState() {},
    onMasterSlidesChanged() {
      throw new Error('master listener failed');
    }
  });

  assert.doesNotThrow(() => {
    const result = controller.saveActiveSlide({ id: 'opening-master', name: 'Opening Master' });
    assert.equal(result.masterSlides[0].id, 'opening-master');
  });
});

test('saveActiveSlide preserves publication when legacy autosave throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Opening', nodes: [{ id: 'title', text: 'Hello' }] }]
  });
  const calls = [];
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    saveHistoryState() {},
    triggerAutoSave() {
      calls.push('save');
      throw new Error('autosave failed');
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    },
    onMasterSlidesChanged() {
      calls.push('masters');
    }
  });

  assert.doesNotThrow(() => {
    const result = controller.saveActiveSlide({ id: 'opening-master', name: 'Opening Master' });
    assert.equal(result.masterSlides[0].id, 'opening-master');
  });
  assert.deepEqual(calls, [
    'save',
    ['version', 'Auto: Saved Master Layout "Opening Master"'],
    'masters'
  ]);
});

test('master slide controller resolves the active slide id with the current document', () => {
  const documentRef = { id: 'iframe-document' };
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1' }]
  });
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    getDocument: () => documentRef,
    getActiveSlideId(currentDocument) {
      assert.equal(currentDocument, documentRef);
      return 'slide-1';
    }
  });

  const result = controller.saveActiveSlide({ id: 'document-bound-master' });

  assert.equal(result.masterSlides[0].id, 'document-bound-master');
});

test('master slide mutations prefer valid pending canonical state over the live baseline', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Opening', nodes: [{ id: 'title', text: 'Hello' }] }]
  });
  const pendingDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Pending Opening', nodes: [{ id: 'title', text: 'Hello' }] }]
  });
  let didBuildFromDocument = false;
  const controller = masterSlideController.createStudioEditorMasterSlideController({
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

  const result = controller.saveActiveSlide({ id: 'live-master', name: 'Live Master' });

  assert.equal(result.masterSlides[0].id, 'live-master');
  assert.equal(result.masterSlides[0].slide.title, 'Pending Opening');
  assert.equal(didBuildFromDocument, false);
});

test('master slide controller delegates canonical deck resolution to shared state', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Shared' }]
  });
  let resolverOptions = null;
  const controller = masterSlideController.createStudioEditorMasterSlideController({
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

  const result = controller.saveActiveSlide({ id: 'shared-master', name: 'Shared Master' });

  assert.equal(result.masterSlides[0].slide.title, 'Shared');
  assert.equal(typeof resolverOptions.getCanonicalDeck, 'function');
  assert.equal(typeof resolverOptions.getPendingCanonicalDeck, 'function');
  assert.equal(typeof resolverOptions.getCanonicalDeckBaseline, 'function');
  assert.equal(resolverOptions.isCanonicalDeck, canonicalDeck.isCanonicalDeck);
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

test('master slide controller scopes the legacy baseline fallback to the current document', () => {
  const documentRef = { id: 'master-frame' };
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Scoped' }]
  });
  const controller = masterSlideController.createStudioEditorMasterSlideController({
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

  const result = controller.saveActiveSlide({ id: 'scoped-master' });

  assert.equal(result.masterSlides[0].id, 'scoped-master');
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

test('master slide controller fails closed when rendering an assigned master slide throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    masterSlides: [{ id: 'master-1', name: 'Brand Base' }],
    slides: [{ id: 'slide-1' }]
  });
  let replaceCount = 0;
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: canonicalDeck,
    renderApi: {
      renderCanonicalSlide() {
        throw new Error('master slide rendering failed');
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getDocument: () => ({
      createElement() {
        return {};
      }
    }),
    getSlides: () => [{
      replaceWith() {
        replaceCount += 1;
      }
    }]
  });

  assert.equal(controller.assignMasterSlide('master-1'), false);
  assert.equal(replaceCount, 0);
});

test('master slide controller fails closed when preparing an assigned master slide throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    masterSlides: [{ id: 'master-1', name: 'Brand Base' }],
    slides: [{ id: 'slide-1' }]
  });
  let replaceCount = 0;
  const controller = masterSlideController.createStudioEditorMasterSlideController({
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
    getSlides: () => [{
      replaceWith() {
        replaceCount += 1;
      }
    }],
    prepareSlide() {
      throw new Error('master slide preparation failed');
    }
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
  const lookupCalls = [];
  const slideLookupCalls = [];
  const canonicalDeckApi = {
    ...canonicalDeck,
    findCanonicalMasterSlideById(deckLike, masterSlideId) {
      lookupCalls.push([deckLike, masterSlideId]);
      return canonicalDeck.findCanonicalMasterSlideById(deckLike, masterSlideId);
    },
    findCanonicalSlideIndexById(deckLike, slideId) {
      slideLookupCalls.push([deckLike, slideId]);
      return canonicalDeck.findCanonicalSlideIndexById(deckLike, slideId);
    }
  };
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi,
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
  assert.equal(lookupCalls.length, 1);
  assert.equal(lookupCalls[0][1], 'master-1');
  assert.equal(slideLookupCalls.length, 1);
  assert.equal(slideLookupCalls[0][1], 'slide-1');
});

test('assignMasterSlide preserves persistence when active-slide chrome throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    masterSlides: [{ id: 'master-1', name: 'Brand Base', slide: { nodes: [] } }],
    slides: [{ id: 'slide-1', nodes: [] }]
  });
  const activeSlide = {
    replaceWith() {}
  };
  const controller = masterSlideController.createStudioEditorMasterSlideController({
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
          content: { firstElementChild: { replaceWith() {} } },
          set innerHTML(value) {
            this.html = value;
          }
        };
      }
    }),
    getSlides: () => [activeSlide],
    setActiveSlide() {
      throw new Error('active-slide chrome unavailable');
    },
    saveHistoryState() {}
  });

  assert.doesNotThrow(() => assert.equal(controller.assignMasterSlide('master-1'), true));
});

test('assignMasterSlide restores the active slide when persistence rejects', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    masterSlides: [{ id: 'master-1', name: 'Brand Base', slide: { nodes: [{ id: 'footer' }] } }],
    slides: [{ id: 'slide-1', nodes: [{ id: 'body' }] }]
  });
  const originalSlide = {};
  const parent = createReplaceableSlide(originalSlide);
  let masterSlidesChanged = 0;
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: canonicalDeck,
    renderApi: { renderCanonicalSlide: () => '<section></section>' },
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getDocument: () => createMasterSlideDocument(parent),
    getSlides: () => [parent.current],
    finalizeMutation: () => false,
    onMasterSlidesChanged: () => { masterSlidesChanged += 1; }
  });

  assert.equal(controller.assignMasterSlide('master-1'), false);
  assert.equal(parent.current, originalSlide);
  assert.equal(Object.prototype.hasOwnProperty.call(deck.slides[0], 'masterSlideId'), false);
  assert.equal(masterSlidesChanged, 0);
});

test('assignMasterSlide restores the active slide when canonical finalization throws', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    masterSlides: [{ id: 'master-1', name: 'Brand Base', slide: { nodes: [{ id: 'footer' }] } }],
    slides: [{ id: 'slide-1', nodes: [{ id: 'body' }] }]
  });
  const originalSlide = {};
  const parent = createReplaceableSlide(originalSlide);
  let masterSlidesChanged = 0;
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: canonicalDeck,
    renderApi: { renderCanonicalSlide: () => '<section></section>' },
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getDocument: () => createMasterSlideDocument(parent),
    getSlides: () => [parent.current],
    finalizeMutation: () => {
      throw new Error('master finalization failed');
    },
    onMasterSlidesChanged: () => { masterSlidesChanged += 1; }
  });

  assert.equal(controller.assignMasterSlide('master-1'), false);
  assert.equal(parent.current, originalSlide);
  assert.equal(Object.prototype.hasOwnProperty.call(deck.slides[0], 'masterSlideId'), false);
  assert.equal(masterSlidesChanged, 0);
});

test('assignMasterSlide restores the active slide when history capture fails', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    masterSlides: [{ id: 'master-1', name: 'Brand Base', slide: { nodes: [{ id: 'footer' }] } }],
    slides: [{ id: 'slide-1', nodes: [{ id: 'body' }] }]
  });
  const originalSlide = {};
  const parent = createReplaceableSlide(originalSlide);
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: canonicalDeck,
    renderApi: { renderCanonicalSlide: () => '<section></section>' },
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getDocument: () => createMasterSlideDocument(parent),
    getSlides: () => [parent.current],
    saveHistoryState: () => ({ didCapture: false })
  });

  assert.equal(controller.assignMasterSlide('master-1'), false);
  assert.equal(parent.current, originalSlide);
});

test('assignMasterSlide restores the active slide when history capture throws', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    masterSlides: [{ id: 'master-1', name: 'Brand Base', slide: { nodes: [{ id: 'footer' }] } }],
    slides: [{ id: 'slide-1', nodes: [{ id: 'body' }] }]
  });
  const originalSlide = {};
  const parent = createReplaceableSlide(originalSlide);
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: canonicalDeck,
    renderApi: { renderCanonicalSlide: () => '<section></section>' },
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getDocument: () => createMasterSlideDocument(parent),
    getSlides: () => [parent.current],
    saveHistoryState: () => {
      throw new Error('history unavailable');
    }
  });

  assert.equal(controller.assignMasterSlide('master-1'), false);
  assert.equal(parent.current, originalSlide);
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
  const lookupCalls = [];
  const canonicalDeckApi = {
    ...canonicalDeck,
    findCanonicalMasterSlideById(deckLike, masterSlideId) {
      lookupCalls.push([deckLike, masterSlideId]);
      return canonicalDeck.findCanonicalMasterSlideById(deckLike, masterSlideId);
    }
  };
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi,
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
  assert.equal(lookupCalls.length, 1);
  assert.equal(lookupCalls[0][1], 'master-1');
});

test('removeMasterSlide restores the active slide when persistence rejects', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    masterSlides: [{ id: 'master-1', name: 'Brand Base', slide: { nodes: [{ id: 'footer' }] } }],
    slides: [{ id: 'slide-1', masterSlideId: 'master-1', nodes: [{ id: 'body' }] }]
  });
  const originalSlide = {};
  const parent = createReplaceableSlide(originalSlide);
  let masterSlidesChanged = 0;
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: canonicalDeck,
    renderApi: { renderCanonicalSlide: () => '<section></section>' },
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    getDocument: () => createMasterSlideDocument(parent),
    getSlides: () => [parent.current],
    finalizeMutation: () => false,
    onMasterSlidesChanged: () => { masterSlidesChanged += 1; }
  });

  assert.equal(controller.removeMasterSlide('master-1'), false);
  assert.equal(parent.current, originalSlide);
  assert.equal(deck.masterSlides.length, 1);
  assert.equal(deck.slides[0].masterSlideId, 'master-1');
  assert.equal(masterSlidesChanged, 0);
});

test('saveActiveSlide does not publish a rejected canonical mutation', () => {
  const deck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let masterSlidesChanged = 0;
  const controller = masterSlideController.createStudioEditorMasterSlideController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => deck,
    getActiveSlideId: () => 'slide-1',
    finalizeMutation: () => false,
    onMasterSlidesChanged: () => { masterSlidesChanged += 1; }
  });

  assert.equal(controller.saveActiveSlide({ id: 'rejected-master' }), null);
  assert.equal(Object.prototype.hasOwnProperty.call(deck, 'masterSlides'), false);
  assert.equal(masterSlidesChanged, 0);
});

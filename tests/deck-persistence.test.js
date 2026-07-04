const test = require('node:test');
const assert = require('node:assert/strict');

const deckPersistence = require('../shared/deck-persistence.js');

test('normalizePersistedDeckPlaybackState upgrades legacy activeSlideId values to activeSlideIds', () => {
  assert.deepEqual(
    deckPersistence.normalizePersistedDeckPlaybackState({
      activeSlideId: 'slide-2',
      slideCounterText: '2 / 5'
    }),
    {
      activeSlideIds: ['slide-2'],
      slideCounterText: '2 / 5'
    }
  );
});

test('resolvePersistedDeckActiveSlideId returns the first normalized active slide id and tolerates missing playback state', () => {
  assert.equal(
    deckPersistence.resolvePersistedDeckActiveSlideId({
      activeSlideIds: ['slide-2', 'slide-3'],
      slideCounterText: '2 / 5'
    }),
    'slide-2'
  );

  assert.equal(
    deckPersistence.resolvePersistedDeckActiveSlideId({
      activeSlideId: 'slide-legacy'
    }),
    'slide-legacy'
  );

  assert.equal(deckPersistence.resolvePersistedDeckActiveSlideId(null), '');
});

test('ensurePersistedDeckPlaybackStateActiveSlideId preserves existing active slide ids without resolving a fallback', () => {
  const playbackState = {
    activeSlideIds: ['slide-2'],
    slideCounterText: '2 / 5'
  };
  let fallbackCalls = 0;

  const result = deckPersistence.ensurePersistedDeckPlaybackStateActiveSlideId(playbackState, {
    resolveFallbackActiveSlideId() {
      fallbackCalls += 1;
      return 'slide-fallback';
    }
  });

  assert.equal(result, playbackState);
  assert.equal(fallbackCalls, 0);
});

test('ensurePersistedDeckPlaybackStateActiveSlideId injects a fallback active slide id when playback markers are missing', () => {
  assert.deepEqual(
    deckPersistence.ensurePersistedDeckPlaybackStateActiveSlideId({
      activeSlideIds: [],
      slideCounterText: '2 / 5'
    }, {
      fallbackActiveSlideId: 'slide-2'
    }),
    {
      activeSlideIds: ['slide-2'],
      slideCounterText: '2 / 5'
    }
  );

  assert.equal(
    deckPersistence.ensurePersistedDeckPlaybackStateActiveSlideId(null, {
      fallbackActiveSlideId: ''
    }),
    null
  );
});

test('capturePersistedDeckPlaybackStateWithFallback reuses captured active slide ids and only resolves a fallback when needed', () => {
  const playbackState = {
    activeSlideIds: ['slide-live'],
    slideCounterText: '2 / 5'
  };
  let fallbackCalls = 0;

  assert.equal(
    deckPersistence.capturePersistedDeckPlaybackStateWithFallback(
      { label: 'iframe-doc' },
      {
        capturePlaybackState(doc, options) {
          assert.equal(doc.label, 'iframe-doc');
          assert.equal(typeof options.resolveFallbackActiveSlideId, 'function');
          return playbackState;
        },
        resolveFallbackActiveSlideId() {
          fallbackCalls += 1;
          return 'slide-fallback';
        }
      }
    ),
    playbackState
  );
  assert.equal(fallbackCalls, 0);

  assert.deepEqual(
    deckPersistence.capturePersistedDeckPlaybackStateWithFallback(
      { label: 'iframe-doc' },
      {
        capturePlaybackState() {
          return {
            activeSlideIds: [],
            slideCounterText: '2 / 5'
          };
        },
        fallbackActiveSlideId: 'slide-2'
      }
    ),
    {
      activeSlideIds: ['slide-2'],
      slideCounterText: '2 / 5'
    }
  );
});

test('stripTransientDeckRuntimeState removes configured transient class names from the cloned deck html', () => {
  function createClassList(initialValues = []) {
    const values = new Set(initialValues);
    return {
      contains(value) {
        return values.has(value);
      },
      remove(...entries) {
        entries.forEach((entry) => values.delete(entry));
      }
    };
  }

  const revealedNode = {
    classList: createClassList(['revealed', 'hero-card'])
  };
  const votedNode = {
    classList: createClassList(['voted'])
  };
  const root = {
    querySelector() {
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.revealed') {
        return [revealedNode];
      }
      if (selector === '.voted') {
        return [votedNode];
      }
      return [];
    }
  };

  deckPersistence.stripTransientDeckRuntimeState(root, {
    transientClassNames: ['revealed', 'voted']
  });

  assert.equal(revealedNode.classList.contains('revealed'), false);
  assert.equal(revealedNode.classList.contains('hero-card'), true);
  assert.equal(votedNode.classList.contains('voted'), false);
});

test('stripTransientDeckRuntimeState empties configured runtime containers in addition to the default container cleanup list', () => {
  const indicatorDotsNode = {
    replaceChildrenCalls: 0,
    replaceChildren() {
      this.replaceChildrenCalls += 1;
    }
  };
  const pixelMatrixNode = {
    replaceChildrenCalls: 0,
    replaceChildren() {
      this.replaceChildrenCalls += 1;
    }
  };
  const root = {
    querySelector() {
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '#indicatorDots') {
        return [indicatorDotsNode];
      }
      if (selector === '#pixelMatrix') {
        return [pixelMatrixNode];
      }
      return [];
    }
  };

  deckPersistence.stripTransientDeckRuntimeState(root, {
    emptyContainerIds: [' pixelMatrix ', '', 'pixelMatrix']
  });

  assert.equal(indicatorDotsNode.replaceChildrenCalls, 1);
  assert.equal(pixelMatrixNode.replaceChildrenCalls, 1);
});

test('stripTransientDeckRuntimeState applies configured style cleanup rules in addition to the default style cleanup list', () => {
  function createStyledNode(initialProperties = {}) {
    const styleProperties = new Map(Object.entries(initialProperties));
    return {
      removedStyleAttribute: false,
      style: {
        removeProperty(property) {
          styleProperties.delete(property);
        }
      },
      getAttribute(name) {
        if (name !== 'style') {
          return '';
        }
        return Array.from(styleProperties.entries())
          .map(([property, value]) => `${property}: ${value}`)
          .join('; ');
      },
      removeAttribute(name) {
        if (name === 'style') {
          this.removedStyleAttribute = true;
        }
      }
    };
  }

  const progressLineNode = createStyledNode({
    width: '10%',
    'background-color': 'red'
  });
  const animatedCardNode = createStyledNode({
    transform: 'translate3d(0px, 30px, 0px)',
    opacity: '0',
    color: 'rgb(15, 23, 42)'
  });
  const root = {
    querySelector() {
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '#progressLine') {
        return [progressLineNode];
      }
      if (selector === '.glass-panel, h1') {
        return [animatedCardNode];
      }
      return [];
    }
  };

  deckPersistence.stripTransientDeckRuntimeState(root, {
    styleCleanups: [
      {
        selector: ' .glass-panel, h1 ',
        properties: [' transform ', 'opacity', '', 'transform']
      }
    ]
  });

  assert.equal(progressLineNode.getAttribute('style').includes('width:'), false);
  assert.equal(progressLineNode.getAttribute('style').includes('background-color: red'), true);
  assert.equal(animatedCardNode.getAttribute('style').includes('transform:'), false);
  assert.equal(animatedCardNode.getAttribute('style').includes('opacity:'), false);
  assert.equal(animatedCardNode.getAttribute('style').includes('color: rgb(15, 23, 42)'), true);
});

test('restorePersistedDeckPlaybackState accepts legacy activeSlideId values', () => {
  const slideNumNode = { textContent: '' };
  const slides = [
    {
      id: 'slide-1',
      classList: {
        _values: new Set(['slide', 'slide-active']),
        add(value) {
          this._values.add(value);
        },
        remove(value) {
          this._values.delete(value);
        },
        contains(value) {
          return this._values.has(value);
        }
      }
    },
    {
      id: 'slide-2',
      classList: {
        _values: new Set(['slide']),
        add(value) {
          this._values.add(value);
        },
        remove(value) {
          this._values.delete(value);
        },
        contains(value) {
          return this._values.has(value);
        }
      }
    }
  ];
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, '.slide[data-slide-id]');
      return slides;
    },
    querySelector(selector) {
      if (selector === '#slideNum') {
        return slideNumNode;
      }
      const match = selector.match(/\.slide\[data-slide-id="([^"]+)"\]/);
      if (!match) {
        return null;
      }
      return slides.find((slide) => slide.id === match[1]) || null;
    }
  };

  deckPersistence.restorePersistedDeckPlaybackState(root, {
    activeSlideId: 'slide-2',
    slideCounterText: '2 / 2'
  });

  assert.equal(slides[0].classList.contains('slide-active'), false);
  assert.equal(slides[1].classList.contains('slide-active'), true);
  assert.equal(slideNumNode.textContent, '2 / 2');
});

test('restorePersistedDeckPlaybackState preserves the current active slide when playback ids are stale', () => {
  const slideNumNode = { textContent: '' };
  const slides = [
    {
      id: 'slide-1',
      classList: {
        _values: new Set(['slide', 'slide-active']),
        add(value) {
          this._values.add(value);
        },
        remove(value) {
          this._values.delete(value);
        },
        contains(value) {
          return this._values.has(value);
        }
      }
    },
    {
      id: 'slide-2',
      classList: {
        _values: new Set(['slide']),
        add(value) {
          this._values.add(value);
        },
        remove(value) {
          this._values.delete(value);
        },
        contains(value) {
          return this._values.has(value);
        }
      }
    }
  ];
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, '.slide[data-slide-id]');
      return slides;
    },
    querySelector(selector) {
      if (selector === '#slideNum') {
        return slideNumNode;
      }
      const match = selector.match(/\.slide\[data-slide-id="([^"]+)"\]/);
      if (!match) {
        return null;
      }
      return slides.find((slide) => slide.id === match[1]) || null;
    }
  };

  deckPersistence.restorePersistedDeckPlaybackState(root, {
    activeSlideIds: ['slide-stale'],
    slideCounterText: '4 / 9'
  });

  assert.equal(slides[0].classList.contains('slide-active'), true);
  assert.equal(slides[1].classList.contains('slide-active'), false);
  assert.equal(slideNumNode.textContent, '4 / 9');
});

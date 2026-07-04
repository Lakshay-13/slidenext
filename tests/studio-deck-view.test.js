const test = require('node:test');
const assert = require('node:assert/strict');

const deckView = require('../shared/studio-deck-view.js');

test('createStudioCanonicalDeckResolver caches the first canonical deck build for a view session', () => {
  const doc = { label: 'iframe-doc' };
  const calls = [];
  const resolveCanonicalDeck = deckView.createStudioCanonicalDeckResolver(doc, {
    buildCanonicalDeck(nextDoc) {
      calls.push(nextDoc);
      return { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
    }
  });

  const firstDeck = resolveCanonicalDeck();
  const secondDeck = resolveCanonicalDeck({ label: 'ignored-doc' });

  assert.equal(calls.length, 1);
  assert.equal(calls[0], doc);
  assert.equal(firstDeck, secondDeck);
});

test('resolveStudioCanonicalDeckViewState eagerly resolves the canonical deck only when no live active slide is available', () => {
  const doc = { label: 'iframe-doc' };
  let resolveCanonicalDeckCalls = 0;

  const withLiveSlide = deckView.resolveStudioCanonicalDeckViewState(doc, {
    resolveCanonicalDeck() {
      resolveCanonicalDeckCalls += 1;
      return { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
    },
    resolveLiveActiveSlideId(nextDoc) {
      assert.equal(nextDoc, doc);
      return 'slide-live';
    }
  });

  assert.equal(withLiveSlide.liveActiveSlideId, 'slide-live');
  assert.equal(withLiveSlide.resolvedCanonicalDeck, null);
  assert.equal(resolveCanonicalDeckCalls, 0);

  const withoutLiveSlide = deckView.resolveStudioCanonicalDeckViewState(doc, {
    resolveCanonicalDeck() {
      resolveCanonicalDeckCalls += 1;
      return { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
    },
    resolveLiveActiveSlideId(nextDoc) {
      assert.equal(nextDoc, doc);
      return '';
    }
  });

  assert.equal(withoutLiveSlide.liveActiveSlideId, '');
  assert.deepEqual(withoutLiveSlide.resolvedCanonicalDeck, {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  });
  assert.equal(resolveCanonicalDeckCalls, 1);
});

test('createStudioDeckViewBuildOptions reuses shared canonical view state for fallback html and render options', () => {
  const doc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] }
    ]
  };
  let fallbackArgs = null;
  let renderArgs = null;

  const buildOptions = deckView.createStudioDeckViewBuildOptions(doc, {
    resolveCanonicalDeckViewState(nextDoc) {
      assert.equal(nextDoc, doc);
      return {
        resolveCanonicalDeck(sourceDoc = nextDoc) {
          assert.equal(sourceDoc, doc);
          return canonicalDeck;
        },
        liveActiveSlideId: 'slide-live',
        resolvedCanonicalDeck: null
      };
    },
    buildFallbackHtml(sourceDoc, nextCanonicalDeck) {
      fallbackArgs = { sourceDoc, nextCanonicalDeck };
      return '<html>fallback</html>';
    },
    buildRenderOptions(sourceDoc, nextCanonicalDeck, options = {}) {
      renderArgs = { sourceDoc, nextCanonicalDeck, options };
      return {
        activeSlideId: options.activeSlideId,
        preferSourceHtml: false
      };
    }
  });

  assert.equal(buildOptions.buildCanonicalDeck(doc), canonicalDeck);
  assert.equal(buildOptions.buildFallbackHtml(doc), '<html>fallback</html>');
  assert.deepEqual(fallbackArgs, {
    sourceDoc: doc,
    nextCanonicalDeck: canonicalDeck
  });
  assert.deepEqual(renderArgs, {
    sourceDoc: doc,
    nextCanonicalDeck: null,
    options: {
      activeSlideId: 'slide-live'
    }
  });
  assert.deepEqual(buildOptions.deckHtmlOptions.renderOptions, {
    activeSlideId: 'slide-live',
    preferSourceHtml: false
  });
});

test('createStudioDeckViewBuildOptions prefers an explicit active slide override for render options', () => {
  const doc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] }
    ]
  };
  let renderArgs = null;

  const buildOptions = deckView.createStudioDeckViewBuildOptions(doc, {
    activeSlideId: 'slide-explicit',
    resolveCanonicalDeckViewState() {
      return {
        resolveCanonicalDeck() {
          return canonicalDeck;
        },
        liveActiveSlideId: 'slide-live',
        resolvedCanonicalDeck: null
      };
    },
    buildRenderOptions(sourceDoc, nextCanonicalDeck, options = {}) {
      renderArgs = { sourceDoc, nextCanonicalDeck, options };
      return {
        activeSlideId: options.activeSlideId,
        preferSourceHtml: false
      };
    }
  });

  assert.deepEqual(renderArgs, {
    sourceDoc: doc,
    nextCanonicalDeck: null,
    options: {
      activeSlideId: 'slide-explicit'
    }
  });
  assert.deepEqual(buildOptions.deckHtmlOptions.renderOptions, {
    activeSlideId: 'slide-explicit',
    preferSourceHtml: false
  });
});

test('createStudioDeckRenderOptions prefers an explicit active slide id and otherwise falls back through the resolver', () => {
  const doc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const calls = [];

  const explicitRenderOptions = deckView.createStudioDeckRenderOptions(doc, canonicalDeck, {
    activeSlideId: 'slide-explicit',
    resolveFallbackActiveSlideId(nextDoc, nextCanonicalDeck) {
      calls.push([nextDoc, nextCanonicalDeck]);
      return 'slide-fallback';
    }
  });

  assert.deepEqual(explicitRenderOptions, {
    activeSlideId: 'slide-explicit',
    preferSourceHtml: false,
    preferHeadSourceHtml: false,
    preferBodySourceHtml: false,
    preferSlideSourceHtml: false,
    preferNodeSourceHtml: false
  });
  assert.deepEqual(calls, []);

  const fallbackRenderOptions = deckView.createStudioDeckRenderOptions(doc, canonicalDeck, {
    resolveFallbackActiveSlideId(nextDoc, nextCanonicalDeck) {
      calls.push([nextDoc, nextCanonicalDeck]);
      return 'slide-fallback';
    }
  });

  assert.deepEqual(fallbackRenderOptions, {
    activeSlideId: 'slide-fallback',
    preferSourceHtml: false,
    preferHeadSourceHtml: false,
    preferBodySourceHtml: false,
    preferSlideSourceHtml: false,
    preferNodeSourceHtml: false
  });
  assert.deepEqual(calls, [[doc, canonicalDeck]]);
});

test('createStudioDeckRenderOptions falls back through shared active slide resolution when no resolver is provided', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  const calls = [];

  const renderOptions = deckView.createStudioDeckRenderOptions(
    { label: 'iframe-doc' },
    canonicalDeck,
    {
      currentSlideIndex: 1,
      getPersistedActiveSlideId() {
        calls.push('getPersistedActiveSlideId');
        return 'slide-persisted';
      },
      resolveLiveActiveSlideId(doc) {
        calls.push(['resolveLiveActiveSlideId', doc]);
        return '';
      },
      isCanonicalDeck(deck) {
        calls.push(['isCanonicalDeck', deck]);
        return deck === canonicalDeck;
      }
    }
  );

  assert.deepEqual(renderOptions, {
    activeSlideId: 'slide-2',
    preferSourceHtml: false,
    preferHeadSourceHtml: false,
    preferBodySourceHtml: false,
    preferSlideSourceHtml: false,
    preferNodeSourceHtml: false
  });
  assert.deepEqual(calls, [
    'getPersistedActiveSlideId',
    ['isCanonicalDeck', canonicalDeck],
    ['resolveLiveActiveSlideId', { label: 'iframe-doc' }]
  ]);
});

test('resolveStudioZoomActionState derives zoom readiness from the active slide resolver', () => {
  assert.deepEqual(
    deckView.resolveStudioZoomActionState(null),
    {
      canUseZoomControls: false
    }
  );

  assert.deepEqual(
    deckView.resolveStudioZoomActionState(
      { activeSlide: { id: 'slide-1' } },
      {
        getActiveSlide(doc) {
          return doc && doc.activeSlide ? doc.activeSlide : null;
        }
      }
    ),
    {
      canUseZoomControls: true
    }
  );
});

test('resolveStudioLiveActiveSlide returns the active slide node when present and null otherwise', () => {
  const activeSlide = { label: 'slide-active' };
  const doc = {
    querySelector(selector) {
      assert.equal(selector, '.slide-active');
      return activeSlide;
    }
  };

  assert.equal(deckView.resolveStudioLiveActiveSlide(doc), activeSlide);
  assert.equal(deckView.resolveStudioLiveActiveSlide(null), null);
});

test('resolveStudioLiveActiveSlideId resolves through the provided live slide and id readers', () => {
  const activeSlide = { label: 'slide-active' };
  const doc = { label: 'iframe-doc' };
  const calls = [];

  assert.equal(
    deckView.resolveStudioLiveActiveSlideId(doc, {
      resolveLiveActiveSlide(nextDoc) {
        calls.push(['resolveLiveActiveSlide', nextDoc]);
        return activeSlide;
      },
      getActiveSlideId(nextDoc, nextActiveSlide) {
        calls.push(['getActiveSlideId', nextDoc, nextActiveSlide]);
        return 'slide-2';
      }
    }),
    'slide-2'
  );
  assert.deepEqual(calls, [
    ['resolveLiveActiveSlide', doc],
    ['getActiveSlideId', doc, activeSlide]
  ]);

  assert.equal(
    deckView.resolveStudioLiveActiveSlideId(doc, {
      resolveLiveActiveSlide() {
        return null;
      },
      getActiveSlideId() {
        throw new Error('getActiveSlideId should not run without an active slide');
      }
    }),
    ''
  );
});

test('resolveStudioFallbackActiveSlideId prefers the live active slide id before fallback canonical resolution', () => {
  const calls = [];

  const result = deckView.resolveStudioFallbackActiveSlideId(
    { label: 'iframe-doc' },
    null,
    {
      currentSlideIndex: 1,
      getPersistedActiveSlideId() {
        calls.push('getPersistedActiveSlideId');
        return 'slide-persisted';
      },
      resolveLiveActiveSlideId(doc) {
        calls.push(['resolveLiveActiveSlideId', doc]);
        return 'slide-live';
      },
      resolveCanonicalDeck() {
        calls.push('resolveCanonicalDeck');
        return {
          slides: [
            { id: 'slide-1', nodes: [] },
            { id: 'slide-2', nodes: [] }
          ]
        };
      }
    }
  );

  assert.equal(result, 'slide-live');
  assert.deepEqual(calls, [
    'getPersistedActiveSlideId',
    ['resolveLiveActiveSlideId', { label: 'iframe-doc' }]
  ]);
});

test('resolveStudioFallbackActiveSlideId rebuilds malformed canonical decks before choosing the current session slide', () => {
  const rebuiltCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  const malformedCanonicalDeck = {
    slides: 'not-an-array'
  };
  const calls = [];

  const result = deckView.resolveStudioFallbackActiveSlideId(
    { label: 'iframe-doc' },
    malformedCanonicalDeck,
    {
      currentSlideIndex: 1,
      getPersistedActiveSlideId() {
        calls.push('getPersistedActiveSlideId');
        return 'slide-persisted';
      },
      resolveLiveActiveSlideId(doc) {
        calls.push(['resolveLiveActiveSlideId', doc]);
        return '';
      },
      resolveCanonicalDeck(doc) {
        calls.push(['resolveCanonicalDeck', doc]);
        return rebuiltCanonicalDeck;
      },
      isCanonicalDeck(deck) {
        calls.push(['isCanonicalDeck', deck]);
        return deck === rebuiltCanonicalDeck;
      }
    }
  );

  assert.equal(result, 'slide-2');
  assert.deepEqual(calls, [
    'getPersistedActiveSlideId',
    ['isCanonicalDeck', malformedCanonicalDeck],
    ['resolveCanonicalDeck', { label: 'iframe-doc' }],
    ['resolveLiveActiveSlideId', { label: 'iframe-doc' }]
  ]);
});

test('resolveStudioFallbackActiveSlideId honors canonical deck overrides before resolving the fallback slide', () => {
  const rebuiltCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  const malformedCanonicalDeck = {
    slides: 'not-an-array'
  };
  const calls = [];

  const result = deckView.resolveStudioFallbackActiveSlideId(
    { label: 'iframe-doc' },
    malformedCanonicalDeck,
    {
      currentSlideIndex: 1,
      getPersistedActiveSlideId() {
        calls.push('getPersistedActiveSlideId');
        return 'slide-persisted';
      },
      resolveCanonicalDeck() {
        calls.push('resolveCanonicalDeck');
        throw new Error('resolveCanonicalDeck should not run when the override resolves a valid deck');
      },
      resolveCanonicalDeckOverride(nextCanonicalDeck, doc) {
        calls.push(['resolveCanonicalDeckOverride', nextCanonicalDeck, doc]);
        return rebuiltCanonicalDeck;
      },
      resolveLiveActiveSlideId(doc) {
        calls.push(['resolveLiveActiveSlideId', doc]);
        return '';
      },
      isCanonicalDeck(deck) {
        calls.push(['isCanonicalDeck', deck]);
        return deck === rebuiltCanonicalDeck;
      }
    }
  );

  assert.equal(result, 'slide-2');
  assert.deepEqual(calls, [
    'getPersistedActiveSlideId',
    ['resolveCanonicalDeckOverride', malformedCanonicalDeck, { label: 'iframe-doc' }],
    ['isCanonicalDeck', rebuiltCanonicalDeck],
    ['resolveLiveActiveSlideId', { label: 'iframe-doc' }]
  ]);
});

test('buildStudioDeckHtml prefers the canonical builder when the canonical deck is valid', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] }
    ]
  };

  assert.equal(
    deckView.buildStudioDeckHtml(
      { label: 'doc' },
      {
        buildCanonicalDeck(doc) {
          assert.equal(doc.label, 'doc');
          return canonicalDeck;
        },
        buildCanonicalHtml(nextCanonicalDeck, doc) {
          assert.equal(nextCanonicalDeck, canonicalDeck);
          assert.equal(doc.label, 'doc');
          return '<html>canonical</html>';
        },
        buildFallbackHtml() {
          throw new Error('buildFallbackHtml should not run when the canonical deck is valid');
        }
      }
    ),
    '<html>canonical</html>'
  );
});

test('buildStudioDeckHtml falls back and can transform fallback html when the canonical deck is unavailable', () => {
  const calls = [];

  assert.equal(
    deckView.buildStudioDeckHtml(
      { label: 'doc' },
      {
        buildCanonicalDeck(doc) {
          calls.push(['buildCanonicalDeck', doc]);
          return {
            metadata: {
              title: 'Broken Deck'
            }
          };
        },
        buildCanonicalHtml() {
          throw new Error('buildCanonicalHtml should not run without a valid canonical deck');
        },
        buildFallbackHtml(doc) {
          calls.push(['buildFallbackHtml', doc]);
          return '<html>fallback</html>';
        },
        transformFallbackHtml(fallbackHtml, doc) {
          calls.push(['transformFallbackHtml', fallbackHtml, doc]);
          return `${fallbackHtml}:transformed`;
        }
      }
    ),
    '<html>fallback</html>:transformed'
  );

  assert.deepEqual(calls, [
    ['buildCanonicalDeck', { label: 'doc' }],
    ['buildFallbackHtml', { label: 'doc' }],
    ['transformFallbackHtml', '<html>fallback</html>', { label: 'doc' }]
  ]);
});

test('buildStudioDeckViewHtml prefers the provided shared html builder when available', () => {
  const calls = [];

  assert.equal(
    deckView.buildStudioDeckViewHtml(
      { label: 'doc' },
      {
        buildViewOptions(doc) {
          calls.push(['buildViewOptions', doc]);
          return {
            buildFallbackHtml() {
              throw new Error('buildFallbackHtml should not run when the shared html builder is available');
            }
          };
        },
        buildSharedHtml(doc, options) {
          calls.push(['buildSharedHtml', doc, options]);
          return '<html>shared</html>';
        }
      }
    ),
    '<html>shared</html>'
  );

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], ['buildViewOptions', { label: 'doc' }]);
  assert.equal(calls[1][0], 'buildSharedHtml');
  assert.deepEqual(calls[1][1], { label: 'doc' });
  assert.equal(typeof calls[1][2].buildFallbackHtml, 'function');
});

test('buildStudioDeckViewHtml falls back to deck html orchestration when no shared html builder is provided', () => {
  const calls = [];

  assert.equal(
    deckView.buildStudioDeckViewHtml(
      { label: 'doc' },
      {
        buildViewOptions(doc) {
          calls.push(['buildViewOptions', doc]);
          return {
            buildCanonicalDeck(nextDoc) {
              calls.push(['buildCanonicalDeck', nextDoc]);
              return {
                metadata: {
                  title: 'Broken Deck'
                }
              };
            },
            buildFallbackHtml(nextDoc) {
              calls.push(['buildFallbackHtml', nextDoc]);
              return '<html>fallback</html>';
            }
          };
        },
        transformFallbackHtml(fallbackHtml, nextDocOrOptions) {
          calls.push(['transformFallbackHtml', fallbackHtml, nextDocOrOptions]);
          return `${fallbackHtml}:transformed`;
        }
      }
    ),
    '<html>fallback</html>:transformed'
  );

  assert.deepEqual(calls, [
    ['buildViewOptions', { label: 'doc' }],
    ['buildCanonicalDeck', { label: 'doc' }],
    ['buildFallbackHtml', { label: 'doc' }],
    ['transformFallbackHtml', '<html>fallback</html>', { label: 'doc' }]
  ]);
});

test('buildStudioPreviewHtml falls back when the canonical deck is malformed', () => {
  const result = deckView.buildStudioPreviewHtml(
    { label: 'doc' },
    {
      buildCanonicalDeck() {
        return {
          metadata: {
            title: 'Broken Deck'
          }
        };
      },
      buildFallbackHtml(doc) {
        return `fallback:${doc.label}`;
      }
    }
  );

  assert.equal(result, 'fallback:doc');
});

test('buildStudioPreviewHtml injects a preview base href into raw html fallback content', () => {
  const result = deckView.buildStudioPreviewHtml(
    null,
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      deckHtmlOptions: {
        currentLocationHref: 'http://localhost:3000/'
      },
      buildCanonicalDeck() {
        return {
          metadata: {
            title: 'Broken Deck'
          }
        };
      },
      buildFallbackHtml() {
        return '<html><head><title>Preview</title></head><body><img src="images/hero.png"></body></html>';
      }
    }
  );

  assert.match(result, /<base href=".*\/presentations\/onboarding-presentation\/">/);
  assert.match(result, /<img src="images\/hero\.png">/);
});

test('buildStudioPreviewHtml can render from a canonical deck when the live editor frame is unavailable', () => {
  const result = deckView.buildStudioPreviewHtml(
    null,
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      buildCanonicalDeck(doc) {
        assert.equal(doc, null);
        return {
          slides: [
            { id: 'slide-1', nodes: [] }
          ]
        };
      }
    }
  );

  assert.match(result, /slidesContainer/);
});

test('buildStudioSourceHtml falls back when the canonical deck is malformed', () => {
  const result = deckView.buildStudioSourceHtml(
    { label: 'doc' },
    {
      buildCanonicalDeck() {
        return {
          metadata: {
            title: 'Broken Deck'
          }
        };
      },
      buildFallbackHtml(doc) {
        return `fallback:${doc.label}`;
      }
    }
  );

  assert.equal(result, 'fallback:doc');
});

test('buildStudioSourceHtml can render from a canonical deck when the live editor frame is unavailable', () => {
  const result = deckView.buildStudioSourceHtml(
    null,
    {
      buildCanonicalDeck(doc) {
        assert.equal(doc, null);
        return {
          slides: [
            { id: 'slide-1', nodes: [] }
          ]
        };
      }
    }
  );

  assert.match(result, /slidesContainer/);
});

const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeckModel = require('../shared/canonical-deck.js');
const editorPersistence = require('../shared/studio-editor-persistence.js');

test('createStudioPersistableDeckState preserves the iframe doc and captured deck fields', () => {
  assert.deepEqual(
    editorPersistence.createStudioPersistableDeckState(
      { label: 'iframe-doc' },
      {
        cleanHtml: '<html>persisted</html>',
        canonicalDeck: {
          kind: 'slidenext.deck',
          schemaVersion: 1,
          slides: []
        },
        playbackState: {
          activeSlideIds: ['slide-1'],
          slideCounterText: '1 / 1'
        }
      }
    ),
    {
      doc: { label: 'iframe-doc' },
      cleanHtml: '<html>persisted</html>',
      canonicalDeck: {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: []
      },
      playbackState: {
        activeSlideIds: ['slide-1'],
        slideCounterText: '1 / 1'
      }
    }
  );
});

test('createStudioPersistedDeckStateSnapshot normalizes persisted html and preserves canonical and playback baselines', () => {
  assert.deepEqual(
    editorPersistence.createStudioPersistedDeckStateSnapshot({
      persistedDeckHtml: '<html>persisted</html>',
      persistedCanonicalDeck: {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: []
      },
      persistedPlaybackState: {
        activeSlideIds: ['slide-1'],
        slideCounterText: '1 / 1'
      }
    }),
    {
      cleanHtml: '<html>persisted</html>',
      canonicalDeck: {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: []
      },
      playbackState: {
        activeSlideIds: ['slide-1'],
        slideCounterText: '1 / 1'
      }
    }
  );

  assert.deepEqual(
    editorPersistence.createStudioPersistedDeckStateSnapshot({}),
    {
      cleanHtml: '',
      canonicalDeck: null,
      playbackState: null
    }
  );
});

test('resolveStudioPersistedDeckStateSnapshotWithContent reuses an explicit snapshot and otherwise composes it from persisted baselines', () => {
  const persistedDeckState = {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: []
    },
    playbackState: {
      activeSlideIds: ['slide-1'],
      slideCounterText: '1 / 1'
    }
  };

  assert.deepEqual(
    editorPersistence.resolveStudioPersistedDeckStateSnapshotWithContent({
      persistedDeckState
    }),
    persistedDeckState
  );

  assert.deepEqual(
    editorPersistence.resolveStudioPersistedDeckStateSnapshotWithContent({
      persistedDeckHtml: '<html>persisted</html>',
      persistedCanonicalDeck: persistedDeckState.canonicalDeck,
      persistedPlaybackState: persistedDeckState.playbackState
    }),
    persistedDeckState
  );

  assert.equal(
    editorPersistence.resolveStudioPersistedDeckStateSnapshotWithContent({
      persistedDeckState: {
        cleanHtml: '',
        canonicalDeck: null,
        playbackState: null
      }
    }),
    null
  );
});

test('applyStudioPersistedDeckState updates persisted state and syncs canonical metadata only when allowed', () => {
  const calls = [];
  const nextState = {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: { kind: 'slidenext.deck', schemaVersion: 1, slides: [] }
  };

  assert.equal(
    editorPersistence.applyStudioPersistedDeckState(nextState, {
      currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
      updatePersistedDeckState(state) {
        calls.push(['updatePersistedDeckState', state]);
      },
      setCurrentPresentationCanonicalDeck(canonicalDeck, presentationUrl) {
        calls.push(['setCurrentPresentationCanonicalDeck', canonicalDeck, presentationUrl]);
      }
    }),
    nextState
  );

  editorPersistence.applyStudioPersistedDeckState(
    { canonicalDeck: nextState.canonicalDeck },
    {
      presentationUrl: '/presentations/custom/index.html',
      syncPresentationMetadata: false,
      updatePersistedDeckState(state) {
        calls.push(['updatePersistedDeckState', state]);
      },
      setCurrentPresentationCanonicalDeck(canonicalDeck, presentationUrl) {
        calls.push(['setCurrentPresentationCanonicalDeck', canonicalDeck, presentationUrl]);
      }
    }
  );

  assert.deepEqual(calls, [
    ['updatePersistedDeckState', nextState],
    ['setCurrentPresentationCanonicalDeck', nextState.canonicalDeck, '/presentations/onboarding-presentation/index.html'],
    ['updatePersistedDeckState', { canonicalDeck: nextState.canonicalDeck }]
  ]);
});

test('syncStudioPresentationMetadataPersistedCanonicalDeck updates the persisted canonical baseline and refreshes fallback chrome when the iframe is unavailable', () => {
  const calls = [];
  const metadata = {
    id: 'onboarding-presentation',
    canonicalDeck: {
      slides: []
    }
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };

  assert.equal(
    editorPersistence.syncStudioPresentationMetadataPersistedCanonicalDeck(metadata, {
      currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
      resolveStoredCanonicalDeck(nextMetadata) {
        calls.push(['resolveStoredCanonicalDeck', nextMetadata]);
        return canonicalDeck;
      },
      applyPersistedDeckState(nextState, options) {
        calls.push(['applyPersistedDeckState', nextState, options]);
      },
      getIframeDoc() {
        calls.push(['getIframeDoc']);
        return null;
      },
      generateThumbnails() {
        calls.push(['generateThumbnails']);
      },
      syncStudioChromeToActiveSlide(nextDoc) {
        calls.push(['syncStudioChromeToActiveSlide', nextDoc]);
      },
      updateDeckReadyToolbarActionState(nextDoc) {
        calls.push(['updateDeckReadyToolbarActionState', nextDoc]);
      }
    }),
    canonicalDeck
  );

  assert.deepEqual(calls, [
    ['resolveStoredCanonicalDeck', metadata],
    [
      'applyPersistedDeckState',
      { canonicalDeck },
      {
        presentationUrl: '/presentations/onboarding-presentation/index.html',
        syncPresentationMetadata: false
      }
    ],
    ['getIframeDoc'],
    ['generateThumbnails'],
    ['syncStudioChromeToActiveSlide', null],
    ['updateDeckReadyToolbarActionState', null]
  ]);
});

test('syncStudioPresentationMetadataPersistedCanonicalDeck skips persistence refresh when metadata has no stored canonical deck', () => {
  const calls = [];

  assert.equal(
    editorPersistence.syncStudioPresentationMetadataPersistedCanonicalDeck(
      { id: 'onboarding-presentation' },
      {
        resolveStoredCanonicalDeck(nextMetadata) {
          calls.push(['resolveStoredCanonicalDeck', nextMetadata]);
          return null;
        },
        applyPersistedDeckState() {
          calls.push(['applyPersistedDeckState']);
        },
        getIframeDoc() {
          calls.push(['getIframeDoc']);
          return null;
        }
      }
    ),
    null
  );

  assert.deepEqual(calls, [
    ['resolveStoredCanonicalDeck', { id: 'onboarding-presentation' }]
  ]);
});

test('updateStudioPersistedDeckState normalizes persisted html, canonical deck, and playback state before applying them', () => {
  const calls = [];
  const rawCanonicalDeck = {
    metadata: {
      id: 'onboarding-presentation'
    },
    slides: []
  };
  const normalizedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };

  assert.deepEqual(
    editorPersistence.updateStudioPersistedDeckState(
      {
        cleanHtml: '<html>persisted</html>',
        canonicalDeck: rawCanonicalDeck,
        playbackState: { activeSlideId: 'slide-2' }
      },
      {
        resolveCanonicalDeck(canonicalDeck) {
          calls.push(['resolveCanonicalDeck', canonicalDeck]);
          return normalizedCanonicalDeck;
        },
        normalizePlaybackState(playbackState) {
          calls.push(['normalizePlaybackState', playbackState]);
          return { activeSlideIds: ['slide-2'], slideCounterText: '' };
        },
        setPersistedDeckHtml(cleanHtml) {
          calls.push(['setPersistedDeckHtml', cleanHtml]);
        },
        setPersistedCanonicalDeck(canonicalDeck) {
          calls.push(['setPersistedCanonicalDeck', canonicalDeck]);
        },
        setPersistedPlaybackState(playbackState) {
          calls.push(['setPersistedPlaybackState', playbackState]);
        }
      }
    ),
    {
      cleanHtml: '<html>persisted</html>',
      canonicalDeck: normalizedCanonicalDeck,
      playbackState: { activeSlideIds: ['slide-2'], slideCounterText: '' }
    }
  );

  assert.deepEqual(calls, [
    ['setPersistedDeckHtml', '<html>persisted</html>'],
    ['resolveCanonicalDeck', rawCanonicalDeck],
    ['setPersistedCanonicalDeck', normalizedCanonicalDeck],
    ['normalizePlaybackState', { activeSlideId: 'slide-2' }],
    ['setPersistedPlaybackState', { activeSlideIds: ['slide-2'], slideCounterText: '' }]
  ]);
});

test('resolveStudioPersistableDeckStateWithContent requires non-empty persisted html', () => {
  const persistedDeckState = {
    doc: { label: 'iframe-doc' },
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: []
    }
  };

  assert.deepEqual(
    editorPersistence.resolveStudioPersistableDeckStateWithContent(persistedDeckState),
    persistedDeckState
  );

  assert.equal(
    editorPersistence.resolveStudioPersistableDeckStateWithContent({
      doc: { label: 'iframe-doc' },
      cleanHtml: '',
      canonicalDeck: null
    }),
    null
  );
});

test('resolveStudioCapturedPersistableDeckState rebuilds canonical and playback state only when capture did not report them', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };
  const playbackState = {
    activeSlideIds: ['slide-1'],
    slideCounterText: '1 / 1'
  };
  let buildCanonicalDeckCalls = 0;
  let resolvePlaybackStateCalls = 0;

  assert.deepEqual(
    editorPersistence.resolveStudioCapturedPersistableDeckState('<html>persisted</html>', {
      canonicalDeck,
      playbackState,
      buildCanonicalDeck() {
        buildCanonicalDeckCalls += 1;
        return null;
      },
      resolvePlaybackState() {
        resolvePlaybackStateCalls += 1;
        return null;
      }
    }),
    {
      cleanHtml: '<html>persisted</html>',
      canonicalDeck,
      playbackState
    }
  );
  assert.equal(buildCanonicalDeckCalls, 0);
  assert.equal(resolvePlaybackStateCalls, 0);

  assert.deepEqual(
    editorPersistence.resolveStudioCapturedPersistableDeckState('<html>persisted</html>', {
      buildCanonicalDeck() {
        buildCanonicalDeckCalls += 1;
        return canonicalDeck;
      },
      resolvePlaybackState(nextCanonicalDeck) {
        resolvePlaybackStateCalls += 1;
        assert.equal(nextCanonicalDeck, canonicalDeck);
        return playbackState;
      }
    }),
    {
      cleanHtml: '<html>persisted</html>',
      canonicalDeck,
      playbackState
    }
  );
  assert.equal(buildCanonicalDeckCalls, 1);
  assert.equal(resolvePlaybackStateCalls, 1);
});

test('captureStudioPersistableDeckBuildState captures canonical and playback state through the shared html builder wrapper', () => {
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };
  const playbackState = {
    activeSlideIds: ['slide-1'],
    slideCounterText: '1 / 1'
  };
  let reportedCanonicalDeck = null;
  let reportedPlaybackState = null;

  assert.deepEqual(
    editorPersistence.captureStudioPersistableDeckBuildState(
      iframeDoc,
      {
        canonicalDeck,
        buildPersistableDeckHtml(doc, buildOptions = {}) {
          assert.equal(doc, iframeDoc);
          assert.equal(buildOptions.canonicalDeck, canonicalDeck);
          assert.equal(typeof buildOptions.onCanonicalDeckResolved, 'function');
          assert.equal(typeof buildOptions.onPlaybackStateResolved, 'function');
          buildOptions.onCanonicalDeckResolved(canonicalDeck);
          buildOptions.onPlaybackStateResolved(playbackState);
          return '<html>persisted</html>';
        },
        onCanonicalDeckResolved(nextCanonicalDeck) {
          reportedCanonicalDeck = nextCanonicalDeck;
        },
        onPlaybackStateResolved(nextPlaybackState) {
          reportedPlaybackState = nextPlaybackState;
        }
      }
    ),
    {
      cleanHtml: '<html>persisted</html>',
      canonicalDeck,
      playbackState
    }
  );

  assert.equal(reportedCanonicalDeck, canonicalDeck);
  assert.equal(reportedPlaybackState, playbackState);
});

test('captureStudioPersistableDeckState reuses captured build-state values and shared fallback resolution', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };
  const calls = [];

  assert.deepEqual(
    editorPersistence.captureStudioPersistableDeckState(
      { label: 'iframe-doc' },
      {
        captureBuildState(doc, buildOptions = {}) {
          calls.push(['captureBuildState', doc, buildOptions]);
          return {
            cleanHtml: '<html>persisted</html>',
            canonicalDeck: null,
            playbackState: undefined
          };
        },
        canonicalDeck,
        buildCanonicalDeck() {
          calls.push(['buildCanonicalDeck']);
          return canonicalDeck;
        },
        resolvePlaybackState(nextCanonicalDeck) {
          calls.push(['resolvePlaybackState', nextCanonicalDeck]);
          return {
            activeSlideIds: ['slide-1'],
            slideCounterText: '1 / 1'
          };
        }
      }
    ),
    {
      cleanHtml: '<html>persisted</html>',
      canonicalDeck,
      playbackState: {
        activeSlideIds: ['slide-1'],
        slideCounterText: '1 / 1'
      }
    }
  );

  assert.equal(calls[0][0], 'captureBuildState');
  assert.deepEqual(calls[0][1], { label: 'iframe-doc' });
  assert.deepEqual(calls[0][2], { canonicalDeck });
  assert.deepEqual(calls.slice(1), [
    ['buildCanonicalDeck'],
    ['resolvePlaybackState', canonicalDeck]
  ]);
});

test('resolveStudioPersistenceStateFromDocumentCapture captures deck state before delegating to a persistence resolver', () => {
  const iframeDoc = { label: 'iframe-doc' };
  const capturedDeckState = {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: []
    },
    playbackState: {
      activeSlideIds: ['slide-1'],
      slideCounterText: '1 / 1'
    }
  };
  let delegatedArgs = null;

  const result = editorPersistence.resolveStudioPersistenceStateFromDocumentCapture(
    iframeDoc,
    '/presentations/onboarding-presentation/index.html',
    {
      capturePersistableDeckState(nextDoc) {
        assert.equal(nextDoc, iframeDoc);
        return capturedDeckState;
      },
      persistenceOptions: {
        sessionToken: 12
      }
    },
    (doc, nextCapturedDeckState, presentationUrl, options = {}) => {
      delegatedArgs = {
        doc,
        nextCapturedDeckState,
        presentationUrl,
        options
      };
      return {
        persistenceContext: {
          presentationUrl
        }
      };
    }
  );

  assert.equal(result.persistenceContext.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.nextCapturedDeckState, capturedDeckState);
  assert.equal(delegatedArgs.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.deepEqual(delegatedArgs.options, {
    sessionToken: 12
  });
});

test('createStudioPersistenceActionContext normalizes persistence state', () => {
  assert.deepEqual(
    editorPersistence.createStudioPersistenceActionContext(
      '/presentations/onboarding-presentation/index.html',
      '<html></html>'
    ),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html></html>',
      shouldUpdatePersistedHtml: true
    }
  );

  assert.deepEqual(
    editorPersistence.createStudioPersistenceActionContext(
      '/presentations/onboarding-presentation/index.html',
      '<html></html>',
      { shouldUpdatePersistedHtml: false }
    ),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html></html>',
      shouldUpdatePersistedHtml: false
    }
  );

  assert.deepEqual(
    editorPersistence.createStudioPersistenceActionContext(
      '/presentations/onboarding-presentation/index.html',
      '<html></html>',
      { sessionToken: 9 }
    ),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html></html>',
      shouldUpdatePersistedHtml: true,
      sessionToken: 9
    }
  );

  assert.deepEqual(
    editorPersistence.createStudioPersistenceActionContext(
      '/presentations/onboarding-presentation/index.html',
      '<html></html>',
      {
        canonicalDeck: {
          metadata: {
            title: 'Project Onboarding'
          },
          slides: [
            {
              id: 'slide-1',
              nodes: []
            }
          ]
        }
      }
    ),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html></html>',
      shouldUpdatePersistedHtml: true,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck({
        metadata: {
          title: 'Project Onboarding'
        },
        slides: [
          {
            id: 'slide-1',
            nodes: []
          }
        ]
      })
    }
  );

  assert.deepEqual(
    editorPersistence.createStudioPersistenceActionContext(
      '/presentations/onboarding-presentation/index.html',
      '<html></html>',
      {
        playbackState: null,
        shouldUpdatePersistedPlaybackState: true
      }
    ),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html></html>',
      shouldUpdatePersistedHtml: true,
      playbackState: null,
      shouldUpdatePersistedPlaybackState: true
    }
  );
});

test('createStudioPersistedDeckStateActionContext reuses captured deck state fields when building a persistence action context', () => {
  assert.deepEqual(
    editorPersistence.createStudioPersistedDeckStateActionContext(
      {
        cleanHtml: '<html></html>',
        canonicalDeck: {
          kind: 'slidenext.deck',
          schemaVersion: 1,
          slides: []
        },
        playbackState: {
          activeSlideIds: ['slide-2'],
          slideCounterText: '2 / 4'
        }
      },
      '/presentations/onboarding-presentation/index.html',
      { sessionToken: 12 }
    ),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html></html>',
      shouldUpdatePersistedHtml: true,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck({
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: []
      }),
      playbackState: {
        activeSlideIds: ['slide-2'],
        slideCounterText: '2 / 4'
      },
      shouldUpdatePersistedPlaybackState: true,
      sessionToken: 12
    }
  );
});

test('createStudioVersionPersistenceActionContext always disables persisted-html writes for checkpoint-only flows', () => {
  assert.deepEqual(
    editorPersistence.createStudioVersionPersistenceActionContext(
      '/presentations/onboarding-presentation/index.html',
      '<html></html>',
      {
        shouldUpdatePersistedHtml: true,
        playbackState: {
          activeSlideIds: ['slide-2'],
          slideCounterText: '2 / 4'
        },
        shouldUpdatePersistedPlaybackState: true,
        sessionToken: 12
      }
    ),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html></html>',
      shouldUpdatePersistedHtml: false,
      playbackState: {
        activeSlideIds: ['slide-2'],
        slideCounterText: '2 / 4'
      },
      shouldUpdatePersistedPlaybackState: false,
      sessionToken: 12
    }
  );
});

test('buildStudioSaveRequestBody includes canonical deck sidecars only when they are valid', () => {
  const canonicalDeck = {
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };

  assert.deepEqual(
    editorPersistence.buildStudioSaveRequestBody(
      '/presentations/onboarding-presentation/index.html',
      '<html></html>',
      {
        isAutoSave: true,
        versionLabel: 'Auto: Updated Deck',
        canonicalDeck
      }
    ),
    {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      htmlContent: '<html></html>',
      isAutoSave: true,
      versionLabel: 'Auto: Updated Deck',
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck)
    }
  );

  assert.deepEqual(
    editorPersistence.buildStudioSaveRequestBody(
      '/presentations/onboarding-presentation/index.html',
      '<html></html>',
      {
        canonicalDeck: {
          metadata: {
            title: 'Broken Deck'
          }
        },
        isCanonicalDeck: () => false
      }
    ),
    {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      htmlContent: '<html></html>',
      isAutoSave: false
    }
  );
});

test('resolveStudioSaveRequestCanonicalDeck falls back to the provided canonical deck builder when an override is malformed', () => {
  const fallbackCanonicalDeck = {
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };
  let buildCanonicalDeckCalls = 0;

  assert.deepEqual(
    editorPersistence.resolveStudioSaveRequestCanonicalDeck({
      canonicalDeck: {
        metadata: {
          title: 'Broken Deck'
        }
      },
      buildCanonicalDeck() {
        buildCanonicalDeckCalls += 1;
        return fallbackCanonicalDeck;
      }
    }),
    canonicalDeckModel.createCanonicalDeck(fallbackCanonicalDeck)
  );
  assert.equal(buildCanonicalDeckCalls, 1);
});

test('resolveStudioCanonicalDeckOverride preserves the provided override when no canonical validator is available', () => {
  const providedCanonicalDeck = {
    metadata: {
      title: 'Unvalidated Deck'
    }
  };
  let buildCanonicalDeckCalls = 0;

  assert.equal(
    editorPersistence.resolveStudioCanonicalDeckOverride({
      canonicalDeck: providedCanonicalDeck,
      buildCanonicalDeck() {
        buildCanonicalDeckCalls += 1;
        return {
          slides: [
            {
              id: 'slide-1',
              nodes: []
            }
          ]
        };
      }
    }),
    providedCanonicalDeck
  );
  assert.equal(buildCanonicalDeckCalls, 0);
});

test('resolveStudioCanonicalDeckOverride rebuilds malformed overrides when a canonical validator is available', () => {
  const fallbackCanonicalDeck = {
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };
  let buildCanonicalDeckCalls = 0;

  assert.deepEqual(
    editorPersistence.resolveStudioCanonicalDeckOverride({
      canonicalDeck: {
        metadata: {
          title: 'Broken Deck'
        }
      },
      buildCanonicalDeck() {
        buildCanonicalDeckCalls += 1;
        return fallbackCanonicalDeck;
      },
      isCanonicalDeck: canonicalDeckModel.isCanonicalDeck
    }),
    canonicalDeckModel.createCanonicalDeck(fallbackCanonicalDeck)
  );
  assert.equal(buildCanonicalDeckCalls, 1);
});

test('resolveStudioFallbackCanonicalDeck rebuilds malformed canonical deck overrides through the shared fallback helper', () => {
  const fallbackCanonicalDeck = canonicalDeckModel.createCanonicalDeck({
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  });
  const malformedCanonicalDeck = {
    metadata: {
      title: 'Broken Deck'
    }
  };
  const calls = [];

  assert.equal(
    editorPersistence.resolveStudioFallbackCanonicalDeck(malformedCanonicalDeck, {
      buildCanonicalDeck() {
        calls.push(['buildCanonicalDeck']);
        return fallbackCanonicalDeck;
      },
      resolveCanonicalDeckOverride(nextCanonicalDeck, options = {}) {
        calls.push(['resolveCanonicalDeckOverride', nextCanonicalDeck, options.buildCanonicalDeck]);
        return malformedCanonicalDeck;
      },
      isCanonicalDeck(nextCanonicalDeck) {
        calls.push(['isCanonicalDeck', nextCanonicalDeck]);
        return nextCanonicalDeck === fallbackCanonicalDeck;
      }
    }),
    fallbackCanonicalDeck
  );

  assert.equal(calls.length, 3);
  assert.equal(calls[0][0], 'resolveCanonicalDeckOverride');
  assert.equal(calls[0][1], malformedCanonicalDeck);
  assert.equal(typeof calls[0][2], 'function');
  assert.deepEqual(calls.slice(1), [
    ['isCanonicalDeck', malformedCanonicalDeck],
    ['buildCanonicalDeck']
  ]);
});

test('buildStudioSaveRequestBody can rebuild a canonical deck sidecar from a fallback deck builder', () => {
  const fallbackCanonicalDeck = {
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };
  let buildCanonicalDeckCalls = 0;

  assert.deepEqual(
    editorPersistence.buildStudioSaveRequestBody(
      '/presentations/onboarding-presentation/index.html',
      '<html></html>',
      {
        canonicalDeck: {
          metadata: {
            title: 'Broken Deck'
          }
        },
        buildCanonicalDeck() {
          buildCanonicalDeckCalls += 1;
          return fallbackCanonicalDeck;
        }
      }
    ),
    {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      htmlContent: '<html></html>',
      isAutoSave: false,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(fallbackCanonicalDeck)
    }
  );
  assert.equal(buildCanonicalDeckCalls, 1);
});

test('buildStudioPersistenceRequestPlan reuses persisted-html checks to skip redundant save payloads', () => {
  const canonicalDeck = {
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };
  const buildSaveRequestBodyCalls = [];

  const persistedPlan = editorPersistence.buildStudioPersistenceRequestPlan(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>',
    {
      isPersistedHtml: () => true,
      buildSaveRequestBody() {
        buildSaveRequestBodyCalls.push('persisted');
        return { shouldNotBeBuilt: true };
      },
      sessionToken: 4
    }
  );

  assert.deepEqual(persistedPlan, {
    hasPersistedCurrentHtml: true,
    hasPersistedCurrentState: true,
    saveRequestBody: null,
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html></html>',
      shouldUpdatePersistedHtml: false,
      sessionToken: 4
    }
  });
  assert.deepEqual(buildSaveRequestBodyCalls, []);

  const dirtyPlan = editorPersistence.buildStudioPersistenceRequestPlan(
    '/presentations/onboarding-presentation/index.html',
    '<html>changed</html>',
    {
      isPersistedHtml: () => false,
      buildSaveRequestBody() {
        buildSaveRequestBodyCalls.push('dirty');
        return editorPersistence.buildStudioSaveRequestBody(
          '/presentations/onboarding-presentation/index.html',
          '<html>changed</html>',
          {
            canonicalDeck
          }
        );
      },
      playbackState: {
        activeSlideIds: ['slide-1'],
        slideCounterText: '1 / 1'
      },
      shouldUpdatePersistedPlaybackState: true,
      sessionToken: 5
    }
  );

  assert.deepEqual(dirtyPlan, {
    hasPersistedCurrentHtml: false,
    hasPersistedCurrentState: false,
    saveRequestBody: {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      htmlContent: '<html>changed</html>',
      isAutoSave: false,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck)
    },
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html>changed</html>',
      shouldUpdatePersistedHtml: true,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck),
      playbackState: {
        activeSlideIds: ['slide-1'],
        slideCounterText: '1 / 1'
      },
      shouldUpdatePersistedPlaybackState: true,
      sessionToken: 5
    }
  });
  assert.deepEqual(buildSaveRequestBodyCalls, ['dirty']);
});

test('resolveStudioPersistedHtmlReuse returns persisted html only when the canonical deck still matches', () => {
  const canonicalDeck = canonicalDeckModel.createCanonicalDeck({
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  });

  assert.equal(
    editorPersistence.resolveStudioPersistedHtmlReuse({
      cleanHtml: '<html>persisted</html>',
      canonicalDeck
    }, {
      canonicalDeck
    }),
    '<html>persisted</html>'
  );

  assert.equal(
    editorPersistence.resolveStudioPersistedHtmlReuse({
      cleanHtml: '<html>persisted</html>',
      canonicalDeck
    }, {
      canonicalDeck: canonicalDeckModel.createCanonicalDeck({
        metadata: {
          title: 'Different Deck'
        },
        slides: [
          {
            id: 'slide-2',
            nodes: []
          }
        ]
      })
    }),
    ''
  );
});

test('resolveStudioPersistedHtmlReuse ignores whitespace-only persisted html baselines', () => {
  const canonicalDeck = canonicalDeckModel.createCanonicalDeck({
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  });

  assert.equal(
    editorPersistence.resolveStudioPersistedHtmlReuse({
      cleanHtml: '   ',
      canonicalDeck
    }, {
      canonicalDeck
    }),
    ''
  );
});

test('isStudioPersistedState requires both html and canonical deck sidecars to match when a canonical deck is present', () => {
  const canonicalDeck = canonicalDeckModel.createCanonicalDeck({
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  });

  assert.equal(
    editorPersistence.isStudioPersistedState('<html></html>', canonicalDeck, {
      persistedHtml: '<html></html>',
      persistedCanonicalDeck: canonicalDeck
    }),
    true
  );

  assert.equal(
    editorPersistence.isStudioPersistedState('<html></html>', canonicalDeck, {
      persistedHtml: '<html></html>',
      persistedCanonicalDeck: canonicalDeckModel.createCanonicalDeck({
        metadata: {
          title: 'Project Onboarding'
        },
        slides: [
          {
            id: 'slide-1',
            nodes: [
              {
                id: 'node-1',
                type: 'html'
              }
            ]
          }
        ]
      })
    }),
    false
  );

  assert.equal(
    editorPersistence.isStudioPersistedState('<html></html>', null, {
      persistedHtml: '<html></html>',
      persistedCanonicalDeck: canonicalDeck
    }),
    true
  );
});

test('buildStudioPersistenceRequestPlan keeps save payloads when canonical deck state changed despite matching html', () => {
  const canonicalDeck = canonicalDeckModel.createCanonicalDeck({
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  });
  const buildSaveRequestBodyCalls = [];

  const plan = editorPersistence.buildStudioPersistenceRequestPlan(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>',
    {
      isPersistedState(saveRequestBody, cleanHtml) {
        return editorPersistence.isStudioPersistedState(cleanHtml, saveRequestBody && saveRequestBody.canonicalDeck, {
          persistedHtml: '<html></html>',
          persistedCanonicalDeck: canonicalDeckModel.createCanonicalDeck({
            metadata: {
              title: 'Project Onboarding'
            },
            slides: [
              {
                id: 'slide-1',
                nodes: [
                  {
                    id: 'node-1',
                    type: 'html'
                  }
                ]
              }
            ]
          })
        });
      },
      buildSaveRequestBody() {
        buildSaveRequestBodyCalls.push('save');
        return editorPersistence.buildStudioSaveRequestBody(
          '/presentations/onboarding-presentation/index.html',
          '<html></html>',
          { canonicalDeck }
        );
      }
    }
  );

  assert.deepEqual(plan, {
    hasPersistedCurrentHtml: false,
    hasPersistedCurrentState: false,
    saveRequestBody: {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      htmlContent: '<html></html>',
      isAutoSave: false,
      canonicalDeck
    },
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html></html>',
      shouldUpdatePersistedHtml: true,
      canonicalDeck,
    }
  });
  assert.deepEqual(buildSaveRequestBodyCalls, ['save']);
});

test('buildStudioAutoSavePersistencePlan reuses current persisted deck state and autosave request wiring', () => {
  const canonicalDeck = canonicalDeckModel.createCanonicalDeck({
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  });
  const playbackState = {
    activeSlideIds: ['slide-live'],
    slideCounterText: '2 / 4'
  };
  const buildSaveRequestBodyCalls = [];

  const persistencePlan = editorPersistence.buildStudioAutoSavePersistencePlan(
    {
      doc: { label: 'iframe-doc' },
      cleanHtml: '<html>live-save</html>',
      canonicalDeck,
      playbackState
    },
    '/presentations/onboarding-presentation/index.html',
    {
      isPersistedState() {
        return false;
      },
      buildSaveRequestBody(doc, cleanHtml, options = {}) {
        buildSaveRequestBodyCalls.push({ doc, cleanHtml, options });
        return editorPersistence.buildStudioSaveRequestBody(
          options.presentationUrl,
          cleanHtml,
          {
            isAutoSave: options.isAutoSave,
            canonicalDeck: options.canonicalDeck
          }
        );
      },
      sessionToken: 9
    }
  );

  assert.deepEqual(buildSaveRequestBodyCalls, [
    {
      doc: { label: 'iframe-doc' },
      cleanHtml: '<html>live-save</html>',
      options: {
        presentationUrl: '/presentations/onboarding-presentation/index.html',
        isAutoSave: true,
        canonicalDeck
      }
    }
  ]);
  assert.deepEqual(persistencePlan, {
    hasPersistedCurrentHtml: false,
    hasPersistedCurrentState: false,
    saveRequestBody: {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      htmlContent: '<html>live-save</html>',
      isAutoSave: true,
      canonicalDeck
    },
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html>live-save</html>',
      shouldUpdatePersistedHtml: true,
      canonicalDeck,
      playbackState,
      shouldUpdatePersistedPlaybackState: true,
      sessionToken: 9
    }
  });
});

test('createStudioAutoSavePersistenceState reuses the shared autosave plan and preserves the captured deck state', () => {
  const persistedDeckState = {
    doc: { label: 'iframe-doc' },
    cleanHtml: '<html>live-save</html>',
    canonicalDeck: canonicalDeckModel.createCanonicalDeck({
      metadata: {
        title: 'Project Onboarding'
      },
      slides: [
        {
          id: 'slide-1',
          nodes: []
        }
      ]
    }),
    playbackState: {
      activeSlideIds: ['slide-live'],
      slideCounterText: '2 / 4'
    }
  };
  const persistenceState = editorPersistence.createStudioAutoSavePersistenceState(
    persistedDeckState,
    '/presentations/onboarding-presentation/index.html',
    {
      isPersistedState() {
        return false;
      },
      buildSaveRequestBody(doc, cleanHtml, options = {}) {
        return editorPersistence.buildStudioSaveRequestBody(
          options.presentationUrl,
          cleanHtml,
          {
            isAutoSave: options.isAutoSave,
            canonicalDeck: options.canonicalDeck
          }
        );
      },
      sessionToken: 9
    }
  );

  assert.deepEqual(persistenceState, {
    persistedDeckState,
    persistencePlan: {
      hasPersistedCurrentHtml: false,
      hasPersistedCurrentState: false,
      saveRequestBody: {
        htmlPath: '/presentations/onboarding-presentation/index.html',
        htmlContent: '<html>live-save</html>',
        isAutoSave: true,
        canonicalDeck: persistedDeckState.canonicalDeck
      },
      persistenceContext: {
        presentationUrl: '/presentations/onboarding-presentation/index.html',
        cleanHtml: '<html>live-save</html>',
        shouldUpdatePersistedHtml: true,
        canonicalDeck: persistedDeckState.canonicalDeck,
        playbackState: persistedDeckState.playbackState,
        shouldUpdatePersistedPlaybackState: true,
        sessionToken: 9
      }
    }
  });
});

test('resolveStudioAutoSavePersistenceState returns null without persisted html and otherwise reuses the shared autosave state helper', () => {
  const persistedDeckState = {
    doc: { label: 'iframe-doc' },
    cleanHtml: '<html>live-save</html>',
    canonicalDeck: canonicalDeckModel.createCanonicalDeck({
      metadata: {
        title: 'Project Onboarding'
      },
      slides: [
        {
          id: 'slide-1',
          nodes: []
        }
      ]
    }),
    playbackState: {
      activeSlideIds: ['slide-live'],
      slideCounterText: '2 / 4'
    }
  };

  assert.deepEqual(
    editorPersistence.resolveStudioAutoSavePersistenceState(
      persistedDeckState,
      '/presentations/onboarding-presentation/index.html',
      {
        isPersistedState() {
          return false;
        },
        buildSaveRequestBody(doc, cleanHtml, options = {}) {
          return editorPersistence.buildStudioSaveRequestBody(
            options.presentationUrl,
            cleanHtml,
            {
              isAutoSave: options.isAutoSave,
              canonicalDeck: options.canonicalDeck
            }
          );
        },
        sessionToken: 9
      }
    ),
    editorPersistence.createStudioAutoSavePersistenceState(
      persistedDeckState,
      '/presentations/onboarding-presentation/index.html',
      {
        isPersistedState() {
          return false;
        },
        buildSaveRequestBody(doc, cleanHtml, options = {}) {
          return editorPersistence.buildStudioSaveRequestBody(
            options.presentationUrl,
            cleanHtml,
            {
              isAutoSave: options.isAutoSave,
              canonicalDeck: options.canonicalDeck
            }
          );
        },
        sessionToken: 9
      }
    )
  );

  assert.equal(
    editorPersistence.resolveStudioAutoSavePersistenceState(
      {
        doc: { label: 'iframe-doc' },
        cleanHtml: '',
        canonicalDeck: null,
        playbackState: null
      },
      '/presentations/onboarding-presentation/index.html',
      { sessionToken: 9 }
    ),
    null
  );
});

test('resolveStudioAutoSavePersistenceStateFromCapture reuses persisted deck state creation before autosave resolution', () => {
  const iframeDoc = { label: 'iframe-doc' };
  const capturedDeckState = {
    cleanHtml: '<html>live-save</html>',
    canonicalDeck: canonicalDeckModel.createCanonicalDeck({
      metadata: {
        title: 'Project Onboarding'
      },
      slides: [
        {
          id: 'slide-1',
          nodes: []
        }
      ]
    }),
    playbackState: {
      activeSlideIds: ['slide-live'],
      slideCounterText: '2 / 4'
    }
  };

  const buildOptions = {
    isPersistedState() {
      return false;
    },
    buildSaveRequestBody(doc, cleanHtml, options = {}) {
      return editorPersistence.buildStudioSaveRequestBody(
        options.presentationUrl,
        cleanHtml,
        {
          isAutoSave: options.isAutoSave,
          canonicalDeck: options.canonicalDeck
        }
      );
    },
    sessionToken: 9
  };

  assert.deepEqual(
    editorPersistence.resolveStudioAutoSavePersistenceStateFromCapture(
      iframeDoc,
      capturedDeckState,
      '/presentations/onboarding-presentation/index.html',
      buildOptions
    ),
    editorPersistence.createStudioAutoSavePersistenceState(
      editorPersistence.createStudioPersistableDeckState(iframeDoc, capturedDeckState),
      '/presentations/onboarding-presentation/index.html',
      buildOptions
    )
  );

  assert.equal(
    editorPersistence.resolveStudioAutoSavePersistenceStateFromCapture(
      iframeDoc,
      {
        cleanHtml: '',
        canonicalDeck: null,
        playbackState: null
      },
      '/presentations/onboarding-presentation/index.html',
      buildOptions
    ),
    null
  );
});

test('createStudioAutoSaveRequest always posts the autosave payload to the save endpoint', () => {
  const saveRequestBody = {
    htmlPath: '/presentations/onboarding-presentation/index.html',
    htmlContent: '<html>live-save</html>',
    isAutoSave: true
  };

  assert.deepEqual(
    editorPersistence.createStudioAutoSaveRequest({
      hasPersistedCurrentState: false,
      saveRequestBody
    }),
    {
      url: '/api/save',
      body: saveRequestBody
    }
  );
});

test('executeStudioAutoSavePersistenceRequest reuses the autosave request and request execution glue', async () => {
  const saveRequestBody = {
    htmlPath: '/presentations/onboarding-presentation/index.html',
    htmlContent: '<html>live-save</html>',
    isAutoSave: true
  };
  const fetchCalls = [];

  const result = await editorPersistence.executeStudioAutoSavePersistenceRequest(
    {
      hasPersistedCurrentState: false,
      saveRequestBody
    },
    {
      fetchImpl: async (url, init) => {
        fetchCalls.push([url, JSON.parse(init.body)]);
        return {
          async json() {
            return { success: true };
          }
        };
      }
    }
  );

  assert.deepEqual(fetchCalls, [[
    '/api/save',
    saveRequestBody
  ]]);
  assert.deepEqual(result, { success: true });
});

test('executeStudioAutoSavePersistenceRequestWithHandlers applies success callbacks after a successful autosave request', async () => {
  const autoSavePersistenceState = {
    persistencePlan: {
      hasPersistedCurrentState: false,
      saveRequestBody: {
        htmlPath: '/presentations/onboarding-presentation/index.html',
        htmlContent: '<html>live-save</html>',
        isAutoSave: true
      },
      persistenceContext: {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      }
    }
  };
  const fetchCalls = [];
  let successArgs = null;
  let failureCalls = 0;

  const result = await editorPersistence.executeStudioAutoSavePersistenceRequestWithHandlers(
    autoSavePersistenceState,
    {
      fetchImpl: async (url, init) => {
        fetchCalls.push([url, JSON.parse(init.body)]);
        return {
          async json() {
            return { success: true };
          }
        };
      },
      applyPersistenceSuccess(persistenceContext, options = {}) {
        successArgs = {
          persistenceContext,
          options
        };
      },
      applyPersistenceFailure() {
        failureCalls += 1;
      },
      successOptions: {
        marker: 'autosave-success'
      }
    }
  );

  assert.deepEqual(fetchCalls, [[
    '/api/save',
    autoSavePersistenceState.persistencePlan.saveRequestBody
  ]]);
  assert.equal(successArgs.persistenceContext, autoSavePersistenceState.persistencePlan.persistenceContext);
  assert.deepEqual(successArgs.options, {
    marker: 'autosave-success'
  });
  assert.equal(failureCalls, 0);
  assert.deepEqual(result, {
    data: {
      success: true
    },
    autoSavePersistenceState
  });
});

test('executeStudioAutoSavePersistenceRequestWithHandlers applies failure callbacks after an unsuccessful autosave response', async () => {
  const autoSavePersistenceState = {
    persistencePlan: {
      hasPersistedCurrentState: false,
      saveRequestBody: {
        htmlPath: '/presentations/onboarding-presentation/index.html',
        htmlContent: '<html>live-save</html>',
        isAutoSave: true
      },
      persistenceContext: {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      }
    }
  };
  let successCalls = 0;
  let failureArgs = null;

  const result = await editorPersistence.executeStudioAutoSavePersistenceRequestWithHandlers(
    autoSavePersistenceState,
    {
      fetchImpl: async () => ({
        async json() {
          return { success: false, error: 'write failed' };
        }
      }),
      applyPersistenceSuccess() {
        successCalls += 1;
      },
      applyPersistenceFailure(persistenceContext, options = {}) {
        failureArgs = {
          persistenceContext,
          options
        };
      },
      failureOptions: {
        marker: 'autosave-failure'
      }
    }
  );

  assert.equal(successCalls, 0);
  assert.equal(failureArgs.persistenceContext, autoSavePersistenceState.persistencePlan.persistenceContext);
  assert.deepEqual(failureArgs.options, {
    marker: 'autosave-failure'
  });
  assert.deepEqual(result, {
    data: {
      success: false,
      error: 'write failed'
    },
    autoSavePersistenceState
  });
});

test('executeStudioPersistenceRequest posts JSON request bodies and returns parsed responses', async () => {
  const fetchCalls = [];

  const result = await editorPersistence.executeStudioPersistenceRequest(
    {
      url: '/api/save',
      body: {
        htmlPath: '/presentations/onboarding-presentation/index.html',
        htmlContent: '<html>live-save</html>'
      }
    },
    {
      fetchImpl: async (url, init) => {
        fetchCalls.push([url, init]);
        return {
          async json() {
            return { success: true };
          }
        };
      }
    }
  );

  assert.deepEqual(fetchCalls, [[
    '/api/save',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        htmlPath: '/presentations/onboarding-presentation/index.html',
        htmlContent: '<html>live-save</html>'
      })
    }
  ]]);
  assert.deepEqual(result, { success: true });
});

test('buildStudioVersionCheckpointPersistencePlan reuses the shared playback fallback and persistence-plan wiring', () => {
  const canonicalDeck = canonicalDeckModel.createCanonicalDeck({
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  });
  const playbackState = {
    activeSlideIds: ['slide-2'],
    slideCounterText: '2 / 3'
  };
  const buildSaveRequestBodyCalls = [];
  const resolvePlaybackStateCalls = [];

  const persistencePlan = editorPersistence.buildStudioVersionCheckpointPersistencePlan(
    'Checkpoint Plan',
    '<html>persisted</html>',
    'presentations/onboarding-presentation/index.html',
    {
      isPersistedState() {
        return false;
      },
      buildSaveRequestBody(doc, cleanHtml, options = {}) {
        buildSaveRequestBodyCalls.push({ doc, cleanHtml, options });
        return editorPersistence.buildStudioSaveRequestBody(
          options.presentationUrl,
          cleanHtml,
          {
            versionLabel: options.versionLabel,
            canonicalDeck: options.canonicalDeck
          }
        );
      },
      resolvePlaybackState(doc, nextCanonicalDeck) {
        resolvePlaybackStateCalls.push([doc, nextCanonicalDeck]);
        return playbackState;
      },
      sessionToken: 4,
      doc: { label: 'iframe-doc' },
      canonicalDeck
    }
  );

  assert.deepEqual(buildSaveRequestBodyCalls, [
    {
      doc: { label: 'iframe-doc' },
      cleanHtml: '<html>persisted</html>',
      options: {
        presentationUrl: 'presentations/onboarding-presentation/index.html',
        versionLabel: 'Checkpoint Plan',
        canonicalDeck
      }
    }
  ]);
  assert.deepEqual(resolvePlaybackStateCalls, [[{ label: 'iframe-doc' }, canonicalDeck]]);
  assert.deepEqual(persistencePlan, {
    hasPersistedCurrentHtml: false,
    hasPersistedCurrentState: false,
    saveRequestBody: {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted</html>',
      isAutoSave: false,
      versionLabel: 'Checkpoint Plan',
      canonicalDeck
    },
    persistenceContext: {
      presentationUrl: 'presentations/onboarding-presentation/index.html',
      cleanHtml: '<html>persisted</html>',
      shouldUpdatePersistedHtml: true,
      canonicalDeck,
      playbackState,
      shouldUpdatePersistedPlaybackState: true,
      sessionToken: 4
    }
  });
});

test('createStudioVersionCheckpointRequest selects the correct endpoint and request body', () => {
  const saveRequestBody = {
    htmlPath: '/presentations/onboarding-presentation/index.html',
    htmlContent: '<html>persisted</html>',
    versionLabel: 'Checkpoint Plan'
  };

  assert.deepEqual(
    editorPersistence.createStudioVersionCheckpointRequest(
      'Checkpoint Plan',
      '/presentations/onboarding-presentation/index.html',
      {
        hasPersistedCurrentState: false,
        saveRequestBody
      }
    ),
    {
      url: '/api/save',
      body: saveRequestBody
    }
  );

  assert.deepEqual(
    editorPersistence.createStudioVersionCheckpointRequest(
      'Checkpoint Plan',
      '/presentations/onboarding-presentation/index.html',
      {
        hasPersistedCurrentState: true,
        saveRequestBody: null
      }
    ),
    {
      url: '/api/versions/create',
      body: {
        htmlPath: '/presentations/onboarding-presentation/index.html',
        versionLabel: 'Checkpoint Plan'
      }
    }
  );
});

test('executeStudioVersionCheckpointPersistenceRequest reuses the shared checkpoint plan and request execution glue', async () => {
  const canonicalDeck = canonicalDeckModel.createCanonicalDeck({
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  });
  const playbackState = {
    activeSlideIds: ['slide-2'],
    slideCounterText: '2 / 3'
  };
  const fetchCalls = [];

  const result = await editorPersistence.executeStudioVersionCheckpointPersistenceRequest(
    'Checkpoint Plan',
    '<html>persisted</html>',
    'presentations/onboarding-presentation/index.html',
    {
      isPersistedState() {
        return false;
      },
      buildSaveRequestBody(doc, cleanHtml, options = {}) {
        return editorPersistence.buildStudioSaveRequestBody(
          options.presentationUrl,
          cleanHtml,
          {
            versionLabel: options.versionLabel,
            canonicalDeck: options.canonicalDeck
          }
        );
      },
      doc: { label: 'iframe-doc' },
      canonicalDeck,
      playbackState,
      sessionToken: 4,
      fetchImpl: async (url, init) => {
        fetchCalls.push([url, JSON.parse(init.body)]);
        return {
          async json() {
            return { success: true };
          }
        };
      }
    }
  );

  assert.deepEqual(fetchCalls, [[
    '/api/save',
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted</html>',
      isAutoSave: false,
      versionLabel: 'Checkpoint Plan',
      canonicalDeck
    }
  ]]);
  assert.deepEqual(result, {
    data: { success: true },
    persistencePlan: {
      hasPersistedCurrentHtml: false,
      hasPersistedCurrentState: false,
      saveRequestBody: {
        htmlPath: 'presentations/onboarding-presentation/index.html',
        htmlContent: '<html>persisted</html>',
        isAutoSave: false,
        versionLabel: 'Checkpoint Plan',
        canonicalDeck
      },
      persistenceContext: {
        presentationUrl: 'presentations/onboarding-presentation/index.html',
        cleanHtml: '<html>persisted</html>',
        shouldUpdatePersistedHtml: true,
        canonicalDeck,
        playbackState,
        shouldUpdatePersistedPlaybackState: true,
        sessionToken: 4
      }
    }
  });
});

test('executeStudioVersionCheckpointPersistenceRequestWithSuccess reuses checkpoint request execution and applies success callbacks', async () => {
  const canonicalDeck = canonicalDeckModel.createCanonicalDeck({
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  });
  const playbackState = {
    activeSlideIds: ['slide-2'],
    slideCounterText: '2 / 3'
  };
  let successArgs = null;

  const result = await editorPersistence.executeStudioVersionCheckpointPersistenceRequestWithSuccess(
    'Checkpoint Plan',
    '<html>persisted</html>',
    'presentations/onboarding-presentation/index.html',
    {
      isPersistedState() {
        return false;
      },
      buildSaveRequestBody(doc, cleanHtml, options = {}) {
        return editorPersistence.buildStudioSaveRequestBody(
          options.presentationUrl,
          cleanHtml,
          {
            versionLabel: options.versionLabel,
            canonicalDeck: options.canonicalDeck
          }
        );
      },
      doc: { label: 'iframe-doc' },
      canonicalDeck,
      playbackState,
      sessionToken: 4,
      fetchImpl: async () => ({
        async json() {
          return { success: true };
        }
      }),
      applyPersistenceSuccess(persistenceContext, options = {}) {
        successArgs = {
          persistenceContext,
          options
        };
      },
      successOptions: {
        marker: 'version-request-success'
      }
    }
  );

  assert.deepEqual(successArgs.options, {
    marker: 'version-request-success'
  });
  assert.equal(
    successArgs.persistenceContext.presentationUrl,
    'presentations/onboarding-presentation/index.html'
  );
  assert.equal(successArgs.persistenceContext.cleanHtml, '<html>persisted</html>');
  assert.deepEqual(successArgs.persistenceContext.playbackState, playbackState);
  assert.equal(successArgs.persistenceContext.sessionToken, 4);
  assert.deepEqual(result.data, { success: true });
  assert.equal(
    result.persistencePlan.persistenceContext.presentationUrl,
    'presentations/onboarding-presentation/index.html'
  );
});

test('executeStudioVersionCheckpointSave delegates checkpoint saves through a provided callback and preserves the state bundle', async () => {
  const versionCheckpointPersistenceState = {
    cleanHtml: '<html>persisted</html>',
    requestOptions: {
      sessionToken: 12
    },
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };
  let saveArgs = null;

  const result = await editorPersistence.executeStudioVersionCheckpointSave(
    'Checkpoint Baseline',
    versionCheckpointPersistenceState,
    '/presentations/onboarding-presentation/index.html',
    {
      saveVersionCheckpoint: async (...args) => {
        saveArgs = args;
        return {
          success: true
        };
      }
    }
  );

  assert.deepEqual(saveArgs, [
    'Checkpoint Baseline',
    '<html>persisted</html>',
    '/presentations/onboarding-presentation/index.html',
    versionCheckpointPersistenceState.requestOptions
  ]);
  assert.deepEqual(result, {
    data: {
      success: true
    },
    versionCheckpointPersistenceState
  });
});

test('executeStudioVersionCheckpointSaveWithSuccess reuses checkpoint save execution and applies success callbacks', async () => {
  const versionCheckpointPersistenceState = {
    cleanHtml: '<html>persisted</html>',
    requestOptions: {
      sessionToken: 12
    },
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };
  let saveArgs = null;
  let successArgs = null;

  const result = await editorPersistence.executeStudioVersionCheckpointSaveWithSuccess(
    'Checkpoint Baseline',
    versionCheckpointPersistenceState,
    '/presentations/onboarding-presentation/index.html',
    {
      saveVersionCheckpoint: async (...args) => {
        saveArgs = args;
        return {
          success: true
        };
      },
      applyVersionCheckpointSaveSuccess(nextVersionCheckpointPersistenceState, options = {}) {
        successArgs = {
          nextVersionCheckpointPersistenceState,
          options
        };
      },
      successOptions: {
        marker: 'version-success'
      }
    }
  );

  assert.deepEqual(saveArgs, [
    'Checkpoint Baseline',
    '<html>persisted</html>',
    '/presentations/onboarding-presentation/index.html',
    versionCheckpointPersistenceState.requestOptions
  ]);
  assert.equal(successArgs.nextVersionCheckpointPersistenceState, versionCheckpointPersistenceState);
  assert.deepEqual(successArgs.options, {
    marker: 'version-success'
  });
  assert.deepEqual(result, {
    data: {
      success: true
    },
    versionCheckpointPersistenceState
  });
});

test('executeStudioVersionCheckpointSaveWithFailure reuses version save execution and applies failure callbacks for unsuccessful responses', async () => {
  const versionCheckpointPersistenceState = {
    cleanHtml: '<html>persisted</html>',
    requestOptions: {
      sessionToken: 12
    },
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };
  let failureArgs = null;

  const result = await editorPersistence.executeStudioVersionCheckpointSaveWithFailure(
    'Checkpoint Baseline',
    versionCheckpointPersistenceState,
    '/presentations/onboarding-presentation/index.html',
    {
      saveVersionCheckpoint: async () => ({
        success: false,
        error: 'disk full'
      }),
      applyPersistenceFailure(persistenceContext, options = {}) {
        failureArgs = {
          persistenceContext,
          options
        };
      },
      buildFailureOptions(data) {
        return {
          marker: 'version-failure',
          data
        };
      }
    }
  );

  assert.equal(failureArgs.persistenceContext, versionCheckpointPersistenceState.persistenceContext);
  assert.deepEqual(failureArgs.options, {
    marker: 'version-failure',
    data: {
      success: false,
      error: 'disk full'
    }
  });
  assert.deepEqual(result, {
    data: {
      success: false,
      error: 'disk full'
    },
    versionCheckpointPersistenceState
  });
});

test('isStudioVersionCheckpointSavePersisted reuses the checkpoint persistence plan wiring', () => {
  const canonicalDeck = canonicalDeckModel.createCanonicalDeck({
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  });
  let buildSaveRequestBodyArgs = null;
  let isPersistedStateArgs = null;

  const result = editorPersistence.isStudioVersionCheckpointSavePersisted(
    'Checkpoint Baseline',
    {
      cleanHtml: '<html>persisted</html>',
      requestOptions: {
        doc: { label: 'iframe-doc' },
        canonicalDeck,
        sessionToken: 4
      }
    },
    '/presentations/onboarding-presentation/index.html',
    {
      buildSaveRequestBody(doc, cleanHtml, options = {}) {
        buildSaveRequestBodyArgs = {
          doc,
          cleanHtml,
          options
        };
        return editorPersistence.buildStudioSaveRequestBody(
          options.presentationUrl,
          cleanHtml,
          {
            versionLabel: options.versionLabel,
            canonicalDeck: options.canonicalDeck
          }
        );
      },
      isPersistedState(saveRequestBody, cleanHtml) {
        isPersistedStateArgs = {
          saveRequestBody,
          cleanHtml
        };
        return true;
      }
    }
  );

  assert.equal(result, true);
  assert.equal(buildSaveRequestBodyArgs.doc.label, 'iframe-doc');
  assert.equal(buildSaveRequestBodyArgs.cleanHtml, '<html>persisted</html>');
  assert.deepEqual(buildSaveRequestBodyArgs.options, {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    versionLabel: 'Checkpoint Baseline',
    canonicalDeck
  });
  assert.deepEqual(isPersistedStateArgs, {
    saveRequestBody: {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted</html>',
      isAutoSave: false,
      versionLabel: 'Checkpoint Baseline',
      canonicalDeck
    },
    cleanHtml: '<html>persisted</html>'
  });
});

test('createStudioVersionCheckpointRequestOptions preserves the captured deck state and session token', () => {
  assert.deepEqual(
    editorPersistence.createStudioVersionCheckpointRequestOptions(
      {
        doc: { label: 'iframe-doc' },
        cleanHtml: '<html>persisted</html>',
        canonicalDeck: {
          kind: 'slidenext.deck',
          schemaVersion: 1,
          slides: []
        },
        playbackState: {
          activeSlideIds: ['slide-1'],
          slideCounterText: '1 / 1'
        }
      },
      { sessionToken: 17 }
    ),
    {
      sessionToken: 17,
      doc: { label: 'iframe-doc' },
      canonicalDeck: {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: []
      },
      playbackState: {
        activeSlideIds: ['slide-1'],
        slideCounterText: '1 / 1'
      }
    }
  );
});

test('createStudioVersionCheckpointPersistenceState reuses the shared version context and request options', () => {
  assert.deepEqual(
    editorPersistence.createStudioVersionCheckpointPersistenceState(
      {
        doc: { label: 'iframe-doc' },
        cleanHtml: '<html>persisted</html>',
        canonicalDeck: {
          kind: 'slidenext.deck',
          schemaVersion: 1,
          slides: []
        },
        playbackState: {
          activeSlideIds: ['slide-1'],
          slideCounterText: '1 / 1'
        }
      },
      '/presentations/onboarding-presentation/index.html',
      { sessionToken: 17 }
    ),
    {
      cleanHtml: '<html>persisted</html>',
      persistenceContext: {
        presentationUrl: '/presentations/onboarding-presentation/index.html',
        cleanHtml: '<html>persisted</html>',
        shouldUpdatePersistedHtml: false,
        sessionToken: 17
      },
      requestOptions: {
        sessionToken: 17,
        doc: { label: 'iframe-doc' },
        canonicalDeck: {
          kind: 'slidenext.deck',
          schemaVersion: 1,
          slides: []
        },
        playbackState: {
          activeSlideIds: ['slide-1'],
          slideCounterText: '1 / 1'
        }
      }
    }
  );
});

test('resolveStudioVersionCheckpointPersistenceState returns null without persisted html and otherwise reuses the shared checkpoint state helper', () => {
  const persistedDeckState = {
    doc: { label: 'iframe-doc' },
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: []
    },
    playbackState: {
      activeSlideIds: ['slide-1'],
      slideCounterText: '1 / 1'
    }
  };

  assert.deepEqual(
    editorPersistence.resolveStudioVersionCheckpointPersistenceState(
      persistedDeckState,
      '/presentations/onboarding-presentation/index.html',
      { sessionToken: 17 }
    ),
    editorPersistence.createStudioVersionCheckpointPersistenceState(
      persistedDeckState,
      '/presentations/onboarding-presentation/index.html',
      { sessionToken: 17 }
    )
  );

  assert.equal(
    editorPersistence.resolveStudioVersionCheckpointPersistenceState(
      {
        doc: { label: 'iframe-doc' },
        cleanHtml: '',
        canonicalDeck: null,
        playbackState: null
      },
      '/presentations/onboarding-presentation/index.html',
      { sessionToken: 17 }
    ),
    null
  );
});

test('resolveStudioVersionCheckpointPersistenceStateFromCapture reuses persisted deck state creation before checkpoint resolution', () => {
  const iframeDoc = { label: 'iframe-doc' };
  const capturedDeckState = {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: []
    },
    playbackState: {
      activeSlideIds: ['slide-1'],
      slideCounterText: '1 / 1'
    }
  };

  assert.deepEqual(
    editorPersistence.resolveStudioVersionCheckpointPersistenceStateFromCapture(
      iframeDoc,
      capturedDeckState,
      '/presentations/onboarding-presentation/index.html',
      { sessionToken: 12 }
    ),
    editorPersistence.createStudioVersionCheckpointPersistenceState(
      editorPersistence.createStudioPersistableDeckState(iframeDoc, capturedDeckState),
      '/presentations/onboarding-presentation/index.html',
      { sessionToken: 12 }
    )
  );

  assert.equal(
    editorPersistence.resolveStudioVersionCheckpointPersistenceStateFromCapture(
      iframeDoc,
      {
        cleanHtml: '',
        canonicalDeck: null,
        playbackState: null
      },
      '/presentations/onboarding-presentation/index.html',
      { sessionToken: 12 }
    ),
    null
  );
});

test('isStudioPersistedHtml only reports true when a non-empty persisted html snapshot matches exactly', () => {
  assert.equal(
    editorPersistence.isStudioPersistedHtml('<html></html>', '<html></html>'),
    true
  );

  assert.equal(
    editorPersistence.isStudioPersistedHtml('<html></html>', ''),
    false
  );

  assert.equal(
    editorPersistence.isStudioPersistedHtml('<html>changed</html>', '<html></html>'),
    false
  );
});

test('isStudioPersistedDeckHtml reuses persisted deck-state baselines for html comparisons', () => {
  assert.equal(
    editorPersistence.isStudioPersistedDeckHtml('<html></html>', {
      cleanHtml: '<html></html>',
      canonicalDeck: null
    }),
    true
  );

  assert.equal(
    editorPersistence.isStudioPersistedDeckHtml('<html></html>', {
      cleanHtml: '<html>changed</html>'
    }),
    false
  );

  assert.equal(
    editorPersistence.isStudioPersistedDeckHtml('<html></html>', null),
    false
  );
});

test('isStudioPersistedSaveRequest reuses persisted deck-state baselines for html and canonical deck comparisons', () => {
  const canonicalDeck = canonicalDeckModel.createCanonicalDeck({
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  });
  const persistedDeckState = {
    cleanHtml: '<html></html>',
    canonicalDeck
  };

  assert.equal(
    editorPersistence.isStudioPersistedSaveRequest(
      {
        htmlContent: '<html></html>',
        canonicalDeck
      },
      persistedDeckState
    ),
    true
  );

  assert.equal(
    editorPersistence.isStudioPersistedSaveRequest(
      {
        htmlContent: '<html>changed</html>',
        canonicalDeck
      },
      persistedDeckState
    ),
    false
  );

  assert.equal(
    editorPersistence.isStudioPersistedSaveRequest(
      {
        htmlContent: '<html></html>',
        canonicalDeck: canonicalDeckModel.createCanonicalDeck({
          slides: [
            {
              id: 'slide-2',
              nodes: []
            }
          ]
        })
      },
      persistedDeckState
    ),
    false
  );
});

test('isStudioPersistenceTaskStale rejects missing or stale deck/session combinations', () => {
  assert.equal(
    editorPersistence.isStudioPersistenceTaskStale('', {
      currentPresentationUrl: '/presentations/onboarding-presentation/index.html'
    }),
    true
  );

  assert.equal(
    editorPersistence.isStudioPersistenceTaskStale(
      '/presentations/onboarding-presentation/index.html',
      {
        currentPresentationUrl: '/presentations/ai-tools-presentation/index.html'
      }
    ),
    true
  );

  assert.equal(
    editorPersistence.isStudioPersistenceTaskStale(
      '/presentations/onboarding-presentation/index.html',
      {
        currentPresentationUrl: '/presentations/onboarding-presentation/index.html'
      }
    ),
    false
  );

  assert.equal(
    editorPersistence.isStudioPersistenceTaskStale(
      '/presentations/onboarding-presentation/index.html',
      {
        currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
        currentSessionToken: 4,
        sessionToken: 5
      }
    ),
    true
  );

  assert.equal(
    editorPersistence.isStudioPersistenceTaskStale(
      '/presentations/onboarding-presentation/index.html',
      {
        currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
        currentSessionToken: 5,
        sessionToken: 5
      }
    ),
    false
  );
});

test('clearStudioPersistenceTimers clears debounce and version timers and resets timer state', () => {
  const clearedTimerIds = [];
  const nextTimerState = editorPersistence.clearStudioPersistenceTimers({
    autoSaveDebounceTimer: 11,
    autoVersionTimers: {
      fast: 21,
      slow: 22
    },
    clearTimer(timerId) {
      clearedTimerIds.push(timerId);
    }
  });

  assert.deepEqual(clearedTimerIds, [11, 21, 22]);
  assert.deepEqual(nextTimerState, {
    autoSaveDebounceTimer: null,
    autoVersionTimers: {}
  });

  const fallbackClears = [];
  assert.deepEqual(
    editorPersistence.clearStudioPersistenceTimers({
      autoSaveDebounceTimer: null,
      autoVersionTimers: null,
      clearTimer(timerId) {
        fallbackClears.push(timerId);
      }
    }),
    {
      autoSaveDebounceTimer: null,
      autoVersionTimers: {}
    }
  );
  assert.deepEqual(fallbackClears, []);
});

test('resolveStudioPersistenceCanonicalDeck normalizes valid deck-like payloads and rejects malformed ones', () => {
  assert.deepEqual(
    editorPersistence.resolveStudioPersistenceCanonicalDeck({
      metadata: {
        title: 'Project Onboarding'
      },
      slides: [
        {
          id: 'slide-1',
          nodes: []
        }
      ]
    }),
    canonicalDeckModel.createCanonicalDeck({
      metadata: {
        title: 'Project Onboarding'
      },
      slides: [
        {
          id: 'slide-1',
          nodes: []
        }
      ]
    })
  );

  assert.equal(
    editorPersistence.resolveStudioPersistenceCanonicalDeck({
      metadata: {
        title: 'Broken Deck'
      }
    }),
    null
  );
});

test('handleStudioPersistenceSuccess updates the active deck persistence state only', () => {
  const context = editorPersistence.createStudioPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>',
    {
      canonicalDeck: {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: []
      },
      playbackState: null
    }
  );
  const calls = [];

  const applied = editorPersistence.handleStudioPersistenceSuccess(context, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    setPersistedHtml(nextHtml) {
      calls.push(['setPersistedHtml', nextHtml]);
    },
    setPersistedCanonicalDeck(nextCanonicalDeck) {
      calls.push(['setPersistedCanonicalDeck', nextCanonicalDeck.kind]);
    },
    setPersistedPlaybackState(nextPlaybackState) {
      calls.push(['setPersistedPlaybackState', nextPlaybackState]);
    },
    onSuccess(nextContext) {
      calls.push(['onSuccess', nextContext.presentationUrl]);
    }
  });

  assert.equal(applied, true);
  assert.deepEqual(calls, [
    ['setPersistedHtml', '<html></html>'],
    ['setPersistedCanonicalDeck', 'slidenext.deck'],
    ['setPersistedPlaybackState', null],
    ['onSuccess', '/presentations/onboarding-presentation/index.html']
  ]);
});

test('runStudioPersistenceActionIfCurrent invokes callbacks only for the active deck session', () => {
  const context = editorPersistence.createStudioPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>',
    { sessionToken: 3 }
  );
  const calls = [];

  const applied = editorPersistence.runStudioPersistenceActionIfCurrent(context, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    getCurrentSessionToken: () => 3
  }, (nextContext) => {
    calls.push(nextContext.presentationUrl);
  });

  assert.equal(applied, true);
  assert.deepEqual(calls, ['/presentations/onboarding-presentation/index.html']);
});

test('runStudioPersistenceActionIfCurrent skips stale same-url editor sessions', () => {
  const context = editorPersistence.createStudioPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>',
    { sessionToken: 3 }
  );
  const calls = [];

  const applied = editorPersistence.runStudioPersistenceActionIfCurrent(context, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    getCurrentSessionToken: () => 4
  }, () => {
    calls.push('should-not-run');
  });

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});

test('handleStudioPersistenceSuccess skips stale deck completions', () => {
  const context = editorPersistence.createStudioPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>'
  );
  const calls = [];

  const applied = editorPersistence.handleStudioPersistenceSuccess(context, {
    getCurrentPresentationUrl: () => '/presentations/ai-tools-presentation/index.html',
    setPersistedHtml() {
      calls.push(['setPersistedHtml']);
    },
    onSuccess() {
      calls.push(['onSuccess']);
    }
  });

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});

test('handleStudioPersistenceSuccess skips stale same-url editor sessions', () => {
  const context = editorPersistence.createStudioPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>',
    { sessionToken: 3 }
  );
  const calls = [];

  const applied = editorPersistence.handleStudioPersistenceSuccess(context, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    getCurrentSessionToken: () => 4,
    setPersistedHtml() {
      calls.push(['setPersistedHtml']);
    },
    onSuccess() {
      calls.push(['onSuccess']);
    }
  });

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});

test('handleStudioVersionPersistenceSuccess refreshes version entries only for the active deck', () => {
  const context = editorPersistence.createStudioVersionPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>',
    { sessionToken: 8 }
  );
  const calls = [];

  const applied = editorPersistence.handleStudioVersionPersistenceSuccess(context, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    getCurrentSessionToken: () => 8,
    onSuccess(nextContext) {
      calls.push(['onSuccess', nextContext.presentationUrl]);
    },
    refreshVersionEntries(presentationUrl, sessionToken) {
      calls.push(['refreshVersionEntries', presentationUrl, sessionToken]);
    }
  });

  assert.equal(applied, true);
  assert.deepEqual(calls, [
    ['onSuccess', '/presentations/onboarding-presentation/index.html'],
    ['refreshVersionEntries', '/presentations/onboarding-presentation/index.html', 8]
  ]);
});

test('handleStudioVersionPersistenceSuccess skips stale same-url editor sessions', () => {
  const context = editorPersistence.createStudioVersionPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>',
    { sessionToken: 10 }
  );
  const calls = [];

  const applied = editorPersistence.handleStudioVersionPersistenceSuccess(context, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    getCurrentSessionToken: () => 11,
    onSuccess() {
      calls.push(['onSuccess']);
    },
    refreshVersionEntries() {
      calls.push(['refreshVersionEntries']);
    }
  });

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});

test('handleStudioPersistenceFailure reports failures only for the active deck', () => {
  const context = editorPersistence.createStudioPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>'
  );
  const calls = [];

  const applied = editorPersistence.handleStudioPersistenceFailure(context, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    onFailure(nextContext) {
      calls.push(['onFailure', nextContext.presentationUrl]);
    }
  });

  assert.equal(applied, true);
  assert.deepEqual(calls, [['onFailure', '/presentations/onboarding-presentation/index.html']]);
});

test('handleStudioPersistenceFailure skips stale deck failures', () => {
  const context = editorPersistence.createStudioPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>'
  );
  const calls = [];

  const applied = editorPersistence.handleStudioPersistenceFailure(context, {
    getCurrentPresentationUrl: () => '/presentations/ai-tools-presentation/index.html',
    onFailure() {
      calls.push(['onFailure']);
    }
  });

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});

test('handleStudioPersistenceFailure skips stale same-url editor sessions', () => {
  const context = editorPersistence.createStudioPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>',
    { sessionToken: 6 }
  );
  const calls = [];

  const applied = editorPersistence.handleStudioPersistenceFailure(context, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    getCurrentSessionToken: () => 7,
    onFailure() {
      calls.push(['onFailure']);
    }
  });

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});

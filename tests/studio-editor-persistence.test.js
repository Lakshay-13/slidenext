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

test('createStudioPersistenceHandlerOptions preserves the supplied session readers and persistence hooks', () => {
  const getCurrentPresentationUrl = () => '/presentations/onboarding-presentation/index.html';
  const getCurrentSessionToken = () => 3;
  const hooks = {
    setPersistedHtml() {},
    setPersistedCanonicalDeck() {},
    setPersistedPlaybackState() {},
    onSuccess() {},
    onFailure() {}
  };

  const options = editorPersistence.createStudioPersistenceHandlerOptions({
    getCurrentPresentationUrl,
    getCurrentSessionToken,
    ...hooks
  });

  assert.equal(options.getCurrentPresentationUrl, getCurrentPresentationUrl);
  assert.equal(options.getCurrentSessionToken, getCurrentSessionToken);
  assert.equal(options.setPersistedHtml, hooks.setPersistedHtml);
  assert.equal(options.setPersistedCanonicalDeck, hooks.setPersistedCanonicalDeck);
  assert.equal(options.setPersistedPlaybackState, hooks.setPersistedPlaybackState);
  assert.equal(options.onSuccess, hooks.onSuccess);
  assert.equal(options.onFailure, hooks.onFailure);
});

test('createStudioVersionPersistenceHandlerOptions preserves the supplied session readers and version hooks', () => {
  const getCurrentPresentationUrl = () => '/presentations/onboarding-presentation/index.html';
  const getCurrentSessionToken = () => 9;
  const hooks = {
    onSuccess() {},
    refreshVersionEntries() {}
  };

  const options = editorPersistence.createStudioVersionPersistenceHandlerOptions({
    getCurrentPresentationUrl,
    getCurrentSessionToken,
    ...hooks
  });

  assert.equal(options.getCurrentPresentationUrl, getCurrentPresentationUrl);
  assert.equal(options.getCurrentSessionToken, getCurrentSessionToken);
  assert.equal(options.onSuccess, hooks.onSuccess);
  assert.equal(options.refreshVersionEntries, hooks.refreshVersionEntries);
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

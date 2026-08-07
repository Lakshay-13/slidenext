const test = require('node:test');
const assert = require('node:assert/strict');
const editorPersistenceState = require('../shared/studio-editor-persistence-state.js');

test('createStudioEditorPersistedDeckStateAdapter lazily reuses the shared updater', () => {
  let createCalls = 0;
  const delegatedStates = [];
  const persistenceApi = {
    createStudioPersistedDeckStateUpdater(options) {
      createCalls += 1;
      return (nextState) => {
        delegatedStates.push([nextState, options]);
        return { ...nextState, normalized: true };
      };
    }
  };
  const adapter = editorPersistenceState.createStudioEditorPersistedDeckStateAdapter({
    persistenceApi
  });

  assert.deepEqual(adapter({ cleanHtml: '<html>one</html>' }), {
    cleanHtml: '<html>one</html>',
    normalized: true
  });
  assert.deepEqual(adapter({ cleanHtml: '<html>two</html>' }), {
    cleanHtml: '<html>two</html>',
    normalized: true
  });
  assert.equal(createCalls, 1);
  assert.deepEqual(delegatedStates.map(([nextState]) => nextState), [
    { cleanHtml: '<html>one</html>' },
    { cleanHtml: '<html>two</html>' }
  ]);
});

test('createStudioEditorPersistedDeckStateAdapter fails closed without shared persistence', () => {
  const adapter = editorPersistenceState.createStudioEditorPersistedDeckStateAdapter();
  assert.deepEqual(adapter({ cleanHtml: '<html>ignored</html>' }), {});
});

test('createStudioEditorPersistedDeckStateApplierAdapter reuses the shared applier and preserves call options', () => {
  let createCalls = 0;
  let capturedOptions = null;
  const persistenceApi = {
    createStudioPersistedDeckStateApplier(options) {
      createCalls += 1;
      capturedOptions = options;
      return (nextState, nextOptions) => ({ nextState, nextOptions });
    }
  };
  const updatePersistedDeckState = () => {};
  const setCurrentPresentationCanonicalDeck = () => {};
  const adapter = editorPersistenceState.createStudioEditorPersistedDeckStateApplierAdapter({
    persistenceApi,
    currentPresentationUrl: '/presentations/deck/index.html',
    updatePersistedDeckState,
    setCurrentPresentationCanonicalDeck
  });
  const nextState = { canonicalDeck: { slides: [] } };
  const nextOptions = { presentationUrl: '/presentations/custom/index.html' };

  assert.deepEqual(adapter(nextState, nextOptions), { nextState, nextOptions });
  assert.deepEqual(adapter(nextState, nextOptions), { nextState, nextOptions });
  assert.equal(createCalls, 1);
  assert.equal(capturedOptions.currentPresentationUrl, '/presentations/deck/index.html');
  assert.equal(capturedOptions.updatePersistedDeckState, updatePersistedDeckState);
  assert.equal(capturedOptions.setCurrentPresentationCanonicalDeck, setCurrentPresentationCanonicalDeck);
});

test('createStudioEditorPersistedDeckStateApplierAdapter returns input state without shared persistence', () => {
  const adapter = editorPersistenceState.createStudioEditorPersistedDeckStateApplierAdapter();
  const nextState = { playbackState: null };
  assert.equal(adapter(nextState), nextState);
});

test('createStudioEditorPersistedDeckStateReaderAdapter lazily caches state, content, and content-resolution readers', () => {
  const persistedState = {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: { id: 'persisted-deck' },
    playbackState: { activeSlideIds: ['slide-2'] }
  };
  const readerOptions = [];
  let contentResolverOptions = null;
  const persistenceApi = {
    createStudioPersistedDeckStateReader(options) {
      readerOptions.push(options);
      const reader = () => persistedState;
      reader.resolveWithContent = (nextState) => ({ ...nextState, resolved: true });
      return reader;
    },
    createStudioPersistedDeckStateContentResolver(options) {
      contentResolverOptions = options;
      return (nextState) => ({ ...nextState, contentResolved: true });
    }
  };
  const adapter = editorPersistenceState.createStudioEditorPersistedDeckStateReaderAdapter({
    persistenceApi,
    getPersistedDeckHtml: () => persistedState.cleanHtml,
    getPersistedCanonicalDeck: () => persistedState.canonicalDeck,
    getPersistedPlaybackState: () => persistedState.playbackState
  });

  assert.deepEqual(adapter(), persistedState);
  assert.deepEqual(adapter(), persistedState);
  assert.deepEqual(adapter.resolveWithContent({ cleanHtml: '<html>input</html>' }), {
    cleanHtml: '<html>input</html>',
    resolved: true
  });
  assert.deepEqual(adapter.resolveWithContent({ cleanHtml: '<html>second</html>' }), {
    cleanHtml: '<html>second</html>',
    resolved: true
  });
  assert.deepEqual(adapter.resolvePersistedDeckStateWithContent({ cleanHtml: '<html>third</html>' }), {
    cleanHtml: '<html>third</html>',
    contentResolved: true
  });
  assert.equal(readerOptions.length, 2);
  assert.equal(readerOptions[0].getPersistedDeckHtml(), persistedState.cleanHtml);
  assert.equal(readerOptions[1].resolvePersistableDeckStateWithContent, null);
  assert.equal(typeof contentResolverOptions.readPersistedDeckState, 'function');
  assert.equal(typeof contentResolverOptions.resolveWithContent, 'function');
});

test('createStudioEditorPersistedDeckStateReaderAdapter fails closed without shared persistence', () => {
  const adapter = editorPersistenceState.createStudioEditorPersistedDeckStateReaderAdapter();

  assert.deepEqual(adapter(), {
    cleanHtml: '',
    canonicalDeck: null,
    playbackState: null
  });
  assert.equal(adapter.resolveWithContent({ cleanHtml: '<html>input</html>' }), null);
  assert.equal(adapter.resolvePersistedDeckStateWithContent({ cleanHtml: '<html>input</html>' }), null);
});

test('createStudioEditorPersistedActiveSlideIdAdapter lazily reuses the shared active-slide reader', () => {
  let createCalls = 0;
  let delegatedOptions = null;
  const persistenceApi = {
    resolvePersistedActiveSlideId() {
      throw new Error('resolvePersistedActiveSlideId should be provided to the shared reader');
    },
    createStudioPersistedActiveSlideIdReader(options) {
      createCalls += 1;
      delegatedOptions = options;
      return (playbackState) => playbackState && playbackState.activeSlideIds
        ? playbackState.activeSlideIds[0]
        : '';
    }
  };
  const adapter = editorPersistenceState.createStudioEditorPersistedActiveSlideIdAdapter({
    persistenceApi,
    getPlaybackState: () => ({ activeSlideIds: ['slide-1'] }),
    resolvePersistedDeckActiveSlideId: () => 'slide-shared'
  });

  assert.equal(adapter(), 'slide-1');
  assert.equal(adapter({ activeSlideIds: ['slide-2'] }), 'slide-2');
  assert.equal(createCalls, 1);
  assert.equal(typeof delegatedOptions.getPlaybackState, 'function');
  assert.equal(typeof delegatedOptions.resolvePersistedDeckActiveSlideId, 'function');
});

test('createStudioEditorPersistedActiveSlideIdAdapter fails closed without shared persistence', () => {
  const adapter = editorPersistenceState.createStudioEditorPersistedActiveSlideIdAdapter();

  assert.equal(adapter(), '');
  assert.equal(adapter({ activeSlideIds: ['slide-1'] }), '');
});

test('createStudioEditorFallbackCanonicalDeckAdapter preserves conditional canonical rebuilds', () => {
  const fallbackDeck = { kind: 'slidenext.deck', slides: [] };
  const resolverOptions = [];
  const persistenceApi = {
    createStudioFallbackCanonicalDeckResolver(options) {
      resolverOptions.push(options);
      return (canonicalDeck) => canonicalDeck && options.buildCanonicalDeck
        ? options.buildCanonicalDeck()
        : canonicalDeck;
    }
  };
  const adapter = editorPersistenceState.createStudioEditorFallbackCanonicalDeckAdapter({
    persistenceApi,
    buildCanonicalDeck: () => fallbackDeck,
    resolveCanonicalDeckOverride: (canonicalDeck) => canonicalDeck,
    isCanonicalDeck: (canonicalDeck) => canonicalDeck === fallbackDeck
  });
  const malformedDeck = { id: 'malformed' };

  assert.equal(adapter(malformedDeck), fallbackDeck);
  assert.equal(adapter(null), null);
  assert.equal(resolverOptions.length, 2);
  assert.equal(typeof resolverOptions[0].buildCanonicalDeck, 'function');
  assert.equal(resolverOptions[1].buildCanonicalDeck, null);
});

test('createStudioEditorFallbackCanonicalDeckAdapter fails closed without shared persistence', () => {
  const adapter = editorPersistenceState.createStudioEditorFallbackCanonicalDeckAdapter();

  assert.equal(adapter({ id: 'malformed' }), null);
});

test('createStudioEditorCanonicalDeckOverrideAdapter forwards per-call builders and validators', () => {
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  let delegatedOptions = null;
  const persistenceApi = {
    resolveStudioCanonicalDeckOverride(options) {
      delegatedOptions = options;
      return canonicalDeck;
    }
  };
  const isCanonicalDeck = (deck) => deck === canonicalDeck;
  const buildCanonicalDeck = () => canonicalDeck;
  const adapter = editorPersistenceState.createStudioEditorCanonicalDeckOverrideAdapter({
    persistenceApi,
    isCanonicalDeck
  });
  const override = { id: 'override' };

  assert.equal(adapter(override, { buildCanonicalDeck }), canonicalDeck);
  assert.equal(delegatedOptions.canonicalDeck, override);
  assert.equal(delegatedOptions.buildCanonicalDeck, buildCanonicalDeck);
  assert.equal(delegatedOptions.isCanonicalDeck, isCanonicalDeck);
  assert.equal(adapter(override), canonicalDeck);
  assert.equal(delegatedOptions.buildCanonicalDeck, null);
});

test('createStudioEditorCanonicalDeckOverrideAdapter fails closed without shared persistence', () => {
  const adapter = editorPersistenceState.createStudioEditorCanonicalDeckOverrideAdapter();

  assert.equal(adapter({ id: 'override' }), null);
});

test('createStudioEditorReusablePersistedHtmlAdapter preserves builder-first option forwarding', () => {
  const persistedDeckState = {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: { id: 'persisted-deck' }
  };
  const canonicalDeck = { id: 'current-deck' };
  let factoryOptions = null;
  const persistenceApi = {
    resolveStudioReusablePersistedHtml() {
      throw new Error('direct reusable-html helper should not run when the builder exists');
    },
    resolveStudioPersistedHtmlReuse() {},
    isStudioPersistedCanonicalDeck() {},
    createStudioReusablePersistedHtmlResolver(options) {
      factoryOptions = options;
      return (nextPersistedDeckState, nextOptions) => ({
        persistedDeckState: nextPersistedDeckState,
        options: nextOptions
      });
    }
  };
  const adapter = editorPersistenceState.createStudioEditorReusablePersistedHtmlAdapter({
    persistenceApi
  });
  const resolvePersistedHtmlReuse = () => '<html>reuse</html>';
  const isPersistedCanonicalDeck = () => true;

  const result = adapter(persistedDeckState, {
    canonicalDeck,
    persistedHtml: persistedDeckState.cleanHtml,
    persistedCanonicalDeck: persistedDeckState.canonicalDeck,
    resolveStudioPersistedHtmlReuse: resolvePersistedHtmlReuse,
    isPersistedCanonicalDeck
  });

  assert.equal(result.persistedDeckState, persistedDeckState);
  assert.equal(result.options.canonicalDeck, canonicalDeck);
  assert.equal(result.options.persistedHtml, persistedDeckState.cleanHtml);
  assert.equal(result.options.resolvePersistedHtmlReuse, resolvePersistedHtmlReuse);
  assert.equal(result.options.isPersistedCanonicalDeck, isPersistedCanonicalDeck);
  assert.equal(factoryOptions.resolveReusablePersistedHtml, persistenceApi.resolveStudioReusablePersistedHtml);
  assert.equal(factoryOptions.resolvePersistedHtmlReuse, resolvePersistedHtmlReuse);
  assert.equal(factoryOptions.isPersistedCanonicalDeck, isPersistedCanonicalDeck);
});

test('createStudioEditorReusablePersistedHtmlAdapter uses the direct helper when no builder exists', () => {
  const calls = [];
  const persistedDeckState = { cleanHtml: '<html>persisted</html>' };
  const adapter = editorPersistenceState.createStudioEditorReusablePersistedHtmlAdapter({
    persistenceApi: {
      resolveStudioReusablePersistedHtml(nextState, options) {
        calls.push([nextState, options]);
        return '<html>reused</html>';
      }
    }
  });

  assert.equal(adapter(persistedDeckState, { canonicalDeck: { id: 'current-deck' } }), '<html>reused</html>');
  assert.equal(calls[0][0], persistedDeckState);
  assert.deepEqual(calls[0][1], {
    persistedHtml: undefined,
    canonicalDeck: { id: 'current-deck' },
    persistedCanonicalDeck: undefined,
    resolvePersistedHtmlReuse: null,
    isPersistedCanonicalDeck: null
  });
});

test('createStudioEditorReusablePersistedHtmlAdapter fails closed without shared persistence', () => {
  const adapter = editorPersistenceState.createStudioEditorReusablePersistedHtmlAdapter();

  assert.equal(adapter({ cleanHtml: '<html>persisted</html>' }), '');
});

test('createStudioEditorMetadataPersistenceOptionsAdapter preserves builder precedence and callbacks', () => {
  const metadata = { id: 'deck-1' };
  const mergedResolver = () => ({ merged: true });
  const presentationResolver = () => ({ presentation: true });
  const mergeOptions = () => ({ mergedOptions: true });
  const metadataResolver = (options) => ({
    metadata: options.currentPresentationMetadata,
    persistenceOptions: options.persistenceOptions
  });
  let factoryOptions = null;
  const persistenceApi = {
    resolveStudioMetadataPersistenceOptions() {
      throw new Error('direct metadata helper should not run when the builder exists');
    },
    createStudioMetadataPersistenceOptionsResolver(options) {
      factoryOptions = options;
      return (nextOptions) => options.resolveMetadataPersistenceOptions({
        currentPresentationMetadata: options.getCurrentPresentationMetadata(),
        persistenceOptions: nextOptions.persistenceOptions
      });
    }
  };
  const adapter = editorPersistenceState.createStudioEditorMetadataPersistenceOptionsAdapter({
    persistenceApi,
    getCurrentPresentationMetadata: () => metadata,
    resolveMergedPresentationPersistenceOptions: mergedResolver,
    resolvePresentationPersistenceOptions: presentationResolver,
    mergePresentationPersistenceOptions: mergeOptions,
    resolveMetadataPersistenceOptions: metadataResolver
  });

  assert.deepEqual(adapter({ persistenceOptions: { theme: 'dark' } }), {
    metadata,
    persistenceOptions: { theme: 'dark' }
  });
  assert.equal(factoryOptions.getCurrentPresentationMetadata(), metadata);
  assert.equal(factoryOptions.resolveMergedPresentationPersistenceOptions, mergedResolver);
  assert.equal(factoryOptions.resolvePresentationPersistenceOptions, presentationResolver);
  assert.equal(factoryOptions.mergePresentationPersistenceOptions, mergeOptions);
  assert.equal(factoryOptions.resolveMetadataPersistenceOptions, metadataResolver);
});

test('createStudioEditorMetadataPersistenceOptionsAdapter uses the direct helper when no builder exists', () => {
  let delegatedOptions = null;
  const adapter = editorPersistenceState.createStudioEditorMetadataPersistenceOptionsAdapter({
    persistenceApi: {
      resolveStudioMetadataPersistenceOptions(options) {
        delegatedOptions = options;
        return { direct: true };
      }
    },
    currentPresentationMetadata: { id: 'deck-1' }
  });

  assert.deepEqual(adapter({ persistenceOptions: { theme: 'light' } }), { direct: true });
  assert.deepEqual(delegatedOptions, {
    currentPresentationMetadata: { id: 'deck-1' },
    persistenceOptions: { theme: 'light' },
    resolveMergedPresentationPersistenceOptions: null,
    resolvePresentationPersistenceOptions: null,
    mergePresentationPersistenceOptions: null
  });
});

test('createStudioEditorMetadataPersistenceOptionsAdapter fails closed without shared persistence', () => {
  const adapter = editorPersistenceState.createStudioEditorMetadataPersistenceOptionsAdapter();

  assert.deepEqual(adapter({ persistenceOptions: { theme: 'dark' } }), {});
});

test('createStudioEditorPersistableDeckSanitizerOptionsAdapter preserves builder precedence and callbacks', () => {
  const resolveMetadataPersistenceOptions = () => ({ metadata: true });
  const getDeckSanitizerOptions = () => ({ sanitizer: true });
  let factoryOptions = null;
  const persistenceApi = {
    buildStudioPersistableDeckSanitizerOptions() {
      throw new Error('direct sanitizer helper should not run when the builder exists');
    },
    createStudioPersistableDeckSanitizerOptionsBuilder(options) {
      factoryOptions = options;
      return (playbackState, nextOptions) => ({
        playbackState,
        metadata: (
          typeof nextOptions.resolveMetadataPersistenceOptions === 'function'
            ? nextOptions.resolveMetadataPersistenceOptions
            : options.resolveMetadataPersistenceOptions
        )(),
        sanitizer: (
          typeof nextOptions.getDeckSanitizerOptions === 'function'
            ? nextOptions.getDeckSanitizerOptions
            : options.getDeckSanitizerOptions
        )()
      });
    }
  };
  const adapter = editorPersistenceState.createStudioEditorPersistableDeckSanitizerOptionsAdapter({
    persistenceApi,
    resolveMetadataPersistenceOptions,
    getDeckSanitizerOptions
  });
  const playbackState = { activeSlideIds: ['slide-2'] };

  assert.deepEqual(adapter(playbackState), {
    playbackState,
    metadata: { metadata: true },
    sanitizer: { sanitizer: true }
  });
  assert.equal(factoryOptions.resolveMetadataPersistenceOptions, resolveMetadataPersistenceOptions);
  assert.equal(factoryOptions.getDeckSanitizerOptions, getDeckSanitizerOptions);
});

test('createStudioEditorPersistableDeckSanitizerOptionsAdapter uses direct helper when no builder exists', () => {
  let delegatedArgs = null;
  const resolveMetadataPersistenceOptions = () => ({ metadata: true });
  const getDeckSanitizerOptions = () => ({ sanitizer: true });
  const adapter = editorPersistenceState.createStudioEditorPersistableDeckSanitizerOptionsAdapter({
    persistenceApi: {
      buildStudioPersistableDeckSanitizerOptions(playbackState, options) {
        delegatedArgs = { playbackState, options };
        return { direct: true };
      }
    },
    resolveMetadataPersistenceOptions,
    getDeckSanitizerOptions
  });
  const playbackState = { activeSlideIds: ['slide-3'] };

  assert.deepEqual(adapter(playbackState), { direct: true });
  assert.equal(delegatedArgs.playbackState, playbackState);
  assert.equal(delegatedArgs.options.resolveMetadataPersistenceOptions, resolveMetadataPersistenceOptions);
  assert.equal(delegatedArgs.options.getDeckSanitizerOptions, getDeckSanitizerOptions);
});

test('createStudioEditorPersistableDeckSanitizerOptionsAdapter fails closed without shared persistence', () => {
  const adapter = editorPersistenceState.createStudioEditorPersistableDeckSanitizerOptionsAdapter();

  assert.deepEqual(adapter({ activeSlideIds: ['slide-1'] }), {});
});

test('createStudioEditorReusablePersistedHtmlSanitizerAdapter forwards shared sanitizer inputs', () => {
  const playbackState = { activeSlideIds: ['slide-2'] };
  const buildPersistableDeckHtml = () => '<html>built</html>';
  const resolveMetadataPersistenceOptions = () => ({ emptyContainerIds: ['pixelMatrix'] });
  const getDeckSanitizerOptions = () => ({ chromeNodeIds: ['editorSelectionOverlay'] });
  const DOMParser = class DOMParser {};
  let delegatedArgs = null;
  const adapter = editorPersistenceState.createStudioEditorReusablePersistedHtmlSanitizerAdapter({
    persistenceApi: {
      sanitizeStudioReusablePersistedHtml(persistedHtml, options) {
        delegatedArgs = { persistedHtml, options };
        return '<html>sanitized</html>';
      }
    },
    buildPersistableDeckHtml,
    resolveMetadataPersistenceOptions,
    getDeckSanitizerOptions,
    DOMParser
  });

  assert.equal(adapter('<html>persisted</html>', { playbackState }), '<html>sanitized</html>');
  assert.equal(delegatedArgs.persistedHtml, '<html>persisted</html>');
  assert.equal(delegatedArgs.options.playbackState, playbackState);
  assert.equal(delegatedArgs.options.buildPersistableDeckHtml, buildPersistableDeckHtml);
  assert.equal(delegatedArgs.options.resolveMetadataPersistenceOptions, resolveMetadataPersistenceOptions);
  assert.equal(delegatedArgs.options.getDeckSanitizerOptions, getDeckSanitizerOptions);
  assert.equal(delegatedArgs.options.DOMParser, DOMParser);
});

test('createStudioEditorReusablePersistedHtmlSanitizerAdapter preserves per-call overrides', () => {
  let delegatedOptions = null;
  const adapter = editorPersistenceState.createStudioEditorReusablePersistedHtmlSanitizerAdapter({
    persistenceApi: {
      sanitizeStudioReusablePersistedHtml(_persistedHtml, options) {
        delegatedOptions = options;
        return options.buildPersistableDeckHtml();
      }
    },
    buildPersistableDeckHtml: () => '<html>default</html>'
  });
  const buildPersistableDeckHtml = () => '<html>override</html>';
  const resolveMetadataPersistenceOptions = () => ({ override: true });
  const getDeckSanitizerOptions = () => ({ override: true });

  assert.equal(adapter('<html>persisted</html>', {
    buildPersistableDeckHtml,
    resolveMetadataPersistenceOptions,
    getDeckSanitizerOptions
  }), '<html>override</html>');
  assert.equal(delegatedOptions.buildPersistableDeckHtml, buildPersistableDeckHtml);
  assert.equal(delegatedOptions.resolveMetadataPersistenceOptions, resolveMetadataPersistenceOptions);
  assert.equal(delegatedOptions.getDeckSanitizerOptions, getDeckSanitizerOptions);
});

test('createStudioEditorReusablePersistedHtmlSanitizerAdapter fails closed without shared sanitizer', () => {
  const adapter = editorPersistenceState.createStudioEditorReusablePersistedHtmlSanitizerAdapter();

  assert.equal(adapter('<html>persisted</html>'), '<html>persisted</html>');
  assert.equal(adapter(null), '');
});

test('createStudioEditorCapturedPersistableDeckStateResolverAdapter preserves builder precedence', () => {
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const playbackState = { activeSlideIds: ['slide-2'] };
  let factoryOptions = null;
  const resolveStudioCapturedPersistableDeckState = () => {
    throw new Error('direct captured-state resolver should not run when the builder exists');
  };
  const adapter = editorPersistenceState.createStudioEditorCapturedPersistableDeckStateResolverAdapter({
    persistenceApi: {
      resolveStudioCapturedPersistableDeckState,
      createStudioCapturedPersistableDeckStateResolver(options) {
        factoryOptions = options;
        return (cleanHtml, nextOptions) => ({
          cleanHtml,
          canonicalDeck: nextOptions.canonicalDeck,
          playbackState: nextOptions.resolvePlaybackState(nextOptions.canonicalDeck)
        });
      }
    }
  });
  const resolvePlaybackState = (nextCanonicalDeck) => {
    assert.equal(nextCanonicalDeck, canonicalDeck);
    return playbackState;
  };

  assert.deepEqual(adapter('<html>persisted</html>', {
    canonicalDeck,
    resolvePlaybackState
  }), {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck,
    playbackState
  });
  assert.equal(factoryOptions.resolveCapturedPersistableDeckState, resolveStudioCapturedPersistableDeckState);
  assert.equal(typeof factoryOptions.buildCanonicalDeck, 'function');
  assert.equal(typeof factoryOptions.resolvePlaybackState, 'function');
});

test('createStudioEditorCapturedPersistableDeckStateResolverAdapter uses the direct helper without a builder', () => {
  let delegatedArgs = null;
  const resolveStudioCapturedPersistableDeckState = (cleanHtml, options) => {
    delegatedArgs = { cleanHtml, options };
    return { direct: true };
  };
  const adapter = editorPersistenceState.createStudioEditorCapturedPersistableDeckStateResolverAdapter({
    persistenceApi: { resolveStudioCapturedPersistableDeckState }
  });

  assert.deepEqual(adapter('<html>persisted</html>', {
    canonicalDeck: { id: 'deck-1' },
    playbackState: { activeSlideIds: ['slide-1'] }
  }), { direct: true });
  assert.equal(delegatedArgs.cleanHtml, '<html>persisted</html>');
  assert.deepEqual(delegatedArgs.options, {
    canonicalDeck: { id: 'deck-1' },
    playbackState: { activeSlideIds: ['slide-1'] },
    buildCanonicalDeck: delegatedArgs.options.buildCanonicalDeck,
    resolvePlaybackState: delegatedArgs.options.resolvePlaybackState
  });
  assert.equal(typeof delegatedArgs.options.buildCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.options.resolvePlaybackState, 'function');
});

test('createStudioEditorCapturedPersistableDeckStateResolverAdapter returns null without a shared resolver', () => {
  const adapter = editorPersistenceState.createStudioEditorCapturedPersistableDeckStateResolverAdapter();

  assert.equal(adapter('<html>persisted</html>'), null);
});

test('createStudioEditorPersistableDeckBuildStateCapturerAdapter preserves builder precedence', () => {
  const iframeDoc = { label: 'iframe-doc' };
  const buildPersistableDeckHtml = () => '<html>persisted</html>';
  let factoryOptions = null;
  const captureStudioPersistableDeckBuildState = () => {
    throw new Error('direct build-state capturer should not run when the builder exists');
  };
  const adapter = editorPersistenceState.createStudioEditorPersistableDeckBuildStateCapturerAdapter({
    persistenceApi: {
      captureStudioPersistableDeckBuildState,
      createStudioPersistableDeckBuildStateCapturer(options) {
        factoryOptions = options;
        return (doc, nextOptions) => ({
          doc,
          buildPersistableDeckHtml: options.buildPersistableDeckHtml,
          canonicalDeck: nextOptions.canonicalDeck
        });
      }
    },
    buildPersistableDeckHtml
  });

  assert.deepEqual(adapter(iframeDoc, { canonicalDeck: { id: 'deck-1' } }), {
    doc: iframeDoc,
    buildPersistableDeckHtml,
    canonicalDeck: { id: 'deck-1' }
  });
  assert.equal(factoryOptions.capturePersistableDeckBuildState, captureStudioPersistableDeckBuildState);
  assert.equal(factoryOptions.buildPersistableDeckHtml, buildPersistableDeckHtml);
});

test('createStudioEditorPersistableDeckBuildStateCapturerAdapter uses direct helper without a builder', () => {
  const iframeDoc = { label: 'iframe-doc' };
  let delegatedArgs = null;
  const captureStudioPersistableDeckBuildState = (doc, options) => {
    delegatedArgs = { doc, options };
    return { direct: true };
  };
  const adapter = editorPersistenceState.createStudioEditorPersistableDeckBuildStateCapturerAdapter({
    persistenceApi: { captureStudioPersistableDeckBuildState },
    buildPersistableDeckHtml: () => '<html>persisted</html>'
  });

  assert.deepEqual(adapter(iframeDoc, { canonicalDeck: { id: 'deck-1' } }), { direct: true });
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.options.canonicalDeck.id, 'deck-1');
  assert.equal(typeof delegatedArgs.options.buildPersistableDeckHtml, 'function');
});

test('createStudioEditorPersistableDeckBuildStateCapturerAdapter returns null without a shared capturer', () => {
  const adapter = editorPersistenceState.createStudioEditorPersistableDeckBuildStateCapturerAdapter();

  assert.equal(adapter({ label: 'iframe-doc' }), null);
});

test('createStudioEditorPersistableDeckStateCapturerAdapter preserves builder precedence', () => {
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const playbackState = { activeSlideIds: ['slide-1'] };
  const capturePersistableDeckState = () => {
    throw new Error('direct persistable-deck-state capture should not run when the builder exists');
  };
  const captureBuildState = () => ({ cleanHtml: '<html>persisted</html>' });
  const buildCanonicalDeck = () => canonicalDeck;
  const resolvePlaybackState = () => playbackState;
  let factoryOptions = null;
  const adapter = editorPersistenceState.createStudioEditorPersistableDeckStateCapturerAdapter({
    persistenceApi: {
      captureStudioPersistableDeckState: () => {
        throw new Error('default capture should not run when the builder exists');
      },
      createStudioPersistableDeckStateCapturer(options) {
        factoryOptions = options;
        return (doc, nextOptions) => ({
          doc,
          canonicalDeck: nextOptions.canonicalDeck,
          playbackState: options.resolvePlaybackState(nextOptions.canonicalDeck)
        });
      }
    },
    capturePersistableDeckState,
    captureBuildState,
    buildCanonicalDeck,
    resolvePlaybackState
  });

  assert.deepEqual(adapter(iframeDoc, { canonicalDeck }), {
    doc: iframeDoc,
    canonicalDeck,
    playbackState
  });
  assert.equal(factoryOptions.capturePersistableDeckState, capturePersistableDeckState);
  assert.equal(factoryOptions.captureBuildState, captureBuildState);
  assert.equal(factoryOptions.buildCanonicalDeck, buildCanonicalDeck);
  assert.equal(factoryOptions.resolvePlaybackState, resolvePlaybackState);
});

test('createStudioEditorPersistableDeckStateCapturerAdapter uses direct helper without a builder', () => {
  const iframeDoc = { label: 'iframe-doc' };
  let delegatedArgs = null;
  const capturePersistableDeckState = (doc, options) => {
    delegatedArgs = { doc, options };
    return { direct: true };
  };
  const adapter = editorPersistenceState.createStudioEditorPersistableDeckStateCapturerAdapter({
    persistenceApi: { captureStudioPersistableDeckState: capturePersistableDeckState },
    captureBuildState: () => ({ cleanHtml: '<html>persisted</html>' }),
    buildCanonicalDeck: () => ({ id: 'deck-1' }),
    resolvePlaybackState: () => ({ activeSlideIds: ['slide-1'] })
  });

  assert.deepEqual(adapter(iframeDoc, { canonicalDeck: { id: 'deck-1' } }), { direct: true });
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.deepEqual(delegatedArgs.options.canonicalDeck, { id: 'deck-1' });
  assert.equal(typeof delegatedArgs.options.captureBuildState, 'function');
  assert.equal(typeof delegatedArgs.options.buildCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.options.resolvePlaybackState, 'function');
});

test('createStudioEditorPersistableDeckStateCapturerAdapter returns null without a shared capturer', () => {
  const adapter = editorPersistenceState.createStudioEditorPersistableDeckStateCapturerAdapter();

  assert.equal(adapter({ label: 'iframe-doc' }), null);
});

test('createStudioEditorPersistedDeckPlaybackStateCapturerAdapter preserves shared fallback inputs', () => {
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const getSlides = () => [];
  const resolveFallbackActiveSlideId = (doc, nextCanonicalDeck) => {
    assert.equal(doc, iframeDoc);
    assert.equal(nextCanonicalDeck, canonicalDeck);
    return 'slide-1';
  };
  const deckPersistenceApi = {
    capturePersistedDeckPlaybackStateWithFallback() {},
    capturePersistedDeckPlaybackState() {},
    ensurePersistedDeckPlaybackStateActiveSlideId() {}
  };
  let factoryOptions = null;
  const adapter = editorPersistenceState.createStudioEditorPersistedDeckPlaybackStateCapturerAdapter({
    persistenceApi: {
      captureStudioPersistedDeckPlaybackState() {
        throw new Error('direct playback helper should not run when the builder exists');
      },
      createStudioPersistedDeckPlaybackStateCapturer(options) {
        factoryOptions = options;
        return (doc) => ({
          doc,
          fallbackActiveSlideId: options.resolveFallbackActiveSlideId(),
          slideIdAttr: options.slideIdAttr
        });
      }
    },
    deckPersistenceApi,
    getSlides,
    slideIdAttr: 'data-slide-id',
    resolveFallbackActiveSlideId
  });

  assert.deepEqual(adapter(iframeDoc, { canonicalDeck }), {
    doc: iframeDoc,
    fallbackActiveSlideId: 'slide-1',
    slideIdAttr: 'data-slide-id'
  });
  assert.equal(factoryOptions.capturePersistedDeckPlaybackStateWithFallback, deckPersistenceApi.capturePersistedDeckPlaybackStateWithFallback);
  assert.equal(factoryOptions.capturePersistedDeckPlaybackState, deckPersistenceApi.capturePersistedDeckPlaybackState);
  assert.equal(factoryOptions.ensurePersistedDeckPlaybackStateActiveSlideId, deckPersistenceApi.ensurePersistedDeckPlaybackStateActiveSlideId);
  assert.equal(factoryOptions.getSlides, getSlides);
});

test('createStudioEditorPersistedDeckPlaybackStateCapturerAdapter uses direct shared helper without a builder', () => {
  const iframeDoc = { label: 'iframe-doc' };
  let delegatedArgs = null;
  const capturePlaybackState = (doc, options) => {
    delegatedArgs = { doc, options };
    return { activeSlideIds: ['slide-1'] };
  };
  const adapter = editorPersistenceState.createStudioEditorPersistedDeckPlaybackStateCapturerAdapter({
    persistenceApi: { captureStudioPersistedDeckPlaybackState: capturePlaybackState },
    getSlides: () => [],
    slideIdAttr: 'data-slide-id'
  });

  assert.deepEqual(adapter(iframeDoc, { canonicalDeck: { id: 'deck-1' } }), {
    activeSlideIds: ['slide-1']
  });
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(typeof delegatedArgs.options.getSlides, 'function');
  assert.equal(delegatedArgs.options.slideIdAttr, 'data-slide-id');
});

test('createStudioEditorPersistedDeckPlaybackStateCapturerAdapter returns null without shared playback helpers', () => {
  const adapter = editorPersistenceState.createStudioEditorPersistedDeckPlaybackStateCapturerAdapter();

  assert.equal(adapter({ label: 'iframe-doc' }), null);
});

test('createStudioEditorSaveRequestBodyAdapter preserves builder precedence', () => {
  const iframeDoc = { label: 'iframe-doc' };
  const cleanHtml = '<html>persisted</html>';
  const getPresentationUrl = () => 'presentations/deck/index.html';
  const capturePersistableDeckState = () => ({ cleanHtml, canonicalDeck: { id: 'deck-1' } });
  const resolveCanonicalDeck = (canonicalDeck) => canonicalDeck;
  const buildPersistableDeckHtml = () => cleanHtml;
  let factoryOptions = null;
  const adapter = editorPersistenceState.createStudioEditorSaveRequestBodyAdapter({
    persistenceApi: {
      createStudioSaveRequestBodyBuilder(options) {
        factoryOptions = options;
        return (doc, nextCleanHtml, nextOptions) => ({
          doc,
          cleanHtml: nextCleanHtml,
          presentationUrl: nextOptions.presentationUrl,
          capturePersistableDeckState: options.capturePersistableDeckState,
          resolveCanonicalDeck: options.resolveCanonicalDeck,
          buildPersistableDeckHtml: options.buildPersistableDeckHtml
        });
      },
      resolveStudioSaveRequestDeckState() {
        throw new Error('direct save-state resolution should not run when the builder exists');
      }
    },
    getPresentationUrl,
    capturePersistableDeckState,
    resolveCanonicalDeck,
    buildPersistableDeckHtml
  });

  const result = adapter(iframeDoc, null, { presentationUrl: 'presentations/custom/index.html' });
  assert.equal(result.doc, iframeDoc);
  assert.equal(result.cleanHtml, null);
  assert.equal(result.presentationUrl, 'presentations/custom/index.html');
  assert.equal(factoryOptions.getPresentationUrl, getPresentationUrl);
  assert.equal(factoryOptions.capturePersistableDeckState, capturePersistableDeckState);
  assert.equal(factoryOptions.resolveCanonicalDeck, resolveCanonicalDeck);
  assert.equal(factoryOptions.buildPersistableDeckHtml, buildPersistableDeckHtml);
});

test('createStudioEditorSaveRequestBodyAdapter uses direct shared helpers without a builder', () => {
  let resolveArgs = null;
  let buildArgs = null;
  const adapter = editorPersistenceState.createStudioEditorSaveRequestBodyAdapter({
    persistenceApi: {
      resolveStudioSaveRequestDeckState(doc, cleanHtml, options) {
        resolveArgs = { doc, cleanHtml, options };
        return { cleanHtml: '<html>resolved</html>', canonicalDeck: { id: 'deck-1' } };
      },
      buildStudioSaveRequestBody(presentationUrl, cleanHtml, options) {
        buildArgs = { presentationUrl, cleanHtml, options };
        return { htmlPath: presentationUrl, htmlContent: cleanHtml, ...options };
      }
    },
    getPresentationUrl: () => 'presentations/deck/index.html'
  });

  assert.deepEqual(adapter({ label: 'iframe-doc' }, null, {
    isAutoSave: true,
    versionLabel: 'checkpoint'
  }), {
    htmlPath: 'presentations/deck/index.html',
    htmlContent: '<html>resolved</html>',
    isAutoSave: true,
    versionLabel: 'checkpoint',
    canonicalDeck: { id: 'deck-1' }
  });
  assert.equal(resolveArgs.doc.label, 'iframe-doc');
  assert.equal(resolveArgs.cleanHtml, null);
  assert.equal(buildArgs.presentationUrl, 'presentations/deck/index.html');
  assert.equal(buildArgs.cleanHtml, '<html>resolved</html>');
});

test('createStudioEditorSaveRequestBodyAdapter returns null without shared save helpers', () => {
  const adapter = editorPersistenceState.createStudioEditorSaveRequestBodyAdapter();

  assert.equal(adapter({ label: 'iframe-doc' }), null);
});

test('createStudioEditorPersistedDeckHtmlCheckerAdapter preserves builder precedence', () => {
  const persistedDeckState = { cleanHtml: '<html>persisted</html>' };
  const readPersistedDeckState = () => persistedDeckState;
  const isPersistedDeckHtml = () => true;
  let factoryOptions = null;
  const adapter = editorPersistenceState.createStudioEditorPersistedDeckHtmlCheckerAdapter({
    persistenceApi: {
      isStudioPersistedDeckHtml() {
        throw new Error('direct html checker should not run when the builder exists');
      },
      createStudioPersistedDeckHtmlChecker(options) {
        factoryOptions = options;
        return (cleanHtml) => ({
          cleanHtml,
          persistedDeckState: options.readPersistedDeckState(),
          result: options.isPersistedDeckHtml(cleanHtml, options.readPersistedDeckState())
        });
      }
    },
    readPersistedDeckState,
    isPersistedDeckHtml
  });

  assert.deepEqual(adapter('<html>current</html>'), {
    cleanHtml: '<html>current</html>',
    persistedDeckState,
    result: true
  });
  assert.equal(factoryOptions.readPersistedDeckState, readPersistedDeckState);
  assert.equal(factoryOptions.isPersistedDeckHtml, isPersistedDeckHtml);
});

test('createStudioEditorPersistedDeckHtmlCheckerAdapter uses direct helper without a builder', () => {
  let delegatedArgs = null;
  const isPersistedDeckHtml = (cleanHtml, persistedDeckState) => {
    delegatedArgs = { cleanHtml, persistedDeckState };
    return cleanHtml === persistedDeckState.cleanHtml;
  };
  const persistedDeckState = { cleanHtml: '<html>persisted</html>' };
  const adapter = editorPersistenceState.createStudioEditorPersistedDeckHtmlCheckerAdapter({
    persistenceApi: { isStudioPersistedDeckHtml: isPersistedDeckHtml },
    readPersistedDeckState: () => persistedDeckState
  });

  assert.equal(adapter('<html>persisted</html>'), true);
  assert.equal(delegatedArgs.cleanHtml, '<html>persisted</html>');
  assert.equal(delegatedArgs.persistedDeckState, persistedDeckState);
});

test('createStudioEditorPersistedDeckHtmlCheckerAdapter returns null without a shared checker', () => {
  const adapter = editorPersistenceState.createStudioEditorPersistedDeckHtmlCheckerAdapter();

  assert.equal(adapter('<html>current</html>'), null);
});

test('createStudioEditorPersistedSaveRequestCheckerAdapter preserves builder precedence', () => {
  const persistedDeckState = { cleanHtml: '<html>persisted</html>', canonicalDeck: { id: 'deck-1' } };
  const readPersistedDeckState = () => persistedDeckState;
  const isPersistedSaveRequest = () => true;
  let factoryOptions = null;
  const adapter = editorPersistenceState.createStudioEditorPersistedSaveRequestCheckerAdapter({
    persistenceApi: {
      isStudioPersistedSaveRequest() {
        throw new Error('direct save checker should not run when the builder exists');
      },
      createStudioPersistedSaveRequestChecker(options) {
        factoryOptions = options;
        return (saveRequestBody, cleanHtml) => ({
          saveRequestBody,
          cleanHtml,
          persistedDeckState: options.readPersistedDeckState(),
          result: options.isPersistedSaveRequest(saveRequestBody, options.readPersistedDeckState(), cleanHtml)
        });
      }
    },
    readPersistedDeckState,
    isPersistedSaveRequest
  });

  const saveRequestBody = { htmlContent: '<html>current</html>' };
  assert.deepEqual(adapter(saveRequestBody, '<html>current</html>'), {
    saveRequestBody,
    cleanHtml: '<html>current</html>',
    persistedDeckState,
    result: true
  });
  assert.equal(factoryOptions.readPersistedDeckState, readPersistedDeckState);
  assert.equal(factoryOptions.isPersistedSaveRequest, isPersistedSaveRequest);
});

test('createStudioEditorPersistedSaveRequestCheckerAdapter uses direct helper without a builder', () => {
  let delegatedArgs = null;
  const persistedDeckState = { cleanHtml: '<html>persisted</html>' };
  const isPersistedSaveRequest = (saveRequestBody, nextPersistedDeckState, cleanHtml) => {
    delegatedArgs = { saveRequestBody, persistedDeckState: nextPersistedDeckState, cleanHtml };
    return true;
  };
  const adapter = editorPersistenceState.createStudioEditorPersistedSaveRequestCheckerAdapter({
    persistenceApi: { isStudioPersistedSaveRequest: isPersistedSaveRequest },
    readPersistedDeckState: () => persistedDeckState
  });
  const saveRequestBody = { htmlContent: '<html>current</html>' };

  assert.equal(adapter(saveRequestBody), true);
  assert.equal(delegatedArgs.saveRequestBody, saveRequestBody);
  assert.equal(delegatedArgs.persistedDeckState, persistedDeckState);
  assert.equal(delegatedArgs.cleanHtml, '<html>current</html>');
});

test('createStudioEditorPersistedSaveRequestCheckerAdapter returns null without a shared checker', () => {
  const adapter = editorPersistenceState.createStudioEditorPersistedSaveRequestCheckerAdapter();

  assert.equal(adapter({ htmlContent: '<html>current</html>' }), null);
});

test('createStudioEditorPersistenceStateFromDocumentCaptureResolverAdapter preserves builder precedence', () => {
  const iframeDoc = { label: 'iframe-doc' };
  const capturePersistableDeckState = () => ({ cleanHtml: '<html>captured</html>' });
  const resolvePersistenceStateFromDocumentCapture = () => {
    throw new Error('direct persistence resolver should not run when the builder exists');
  };
  let factoryOptions = null;
  const adapter = editorPersistenceState.createStudioEditorPersistenceStateFromDocumentCaptureResolverAdapter({
    persistenceApi: {
      createStudioPersistenceStateFromDocumentCaptureResolver(options) {
        factoryOptions = options;
        return (doc, nextOptions) => ({
          doc,
          nextOptions,
          capturePersistableDeckState: options.capturePersistableDeckState,
          resolvePersistenceStateFromDocumentCapture: options.resolvePersistenceStateFromDocumentCapture
        });
      }
    },
    getPresentationUrl: () => '/presentations/deck/index.html',
    capturePersistableDeckState,
    resolvePersistenceStateFromDocumentCapture
  });
  const nextOptions = {
    presentationUrl: '/presentations/custom/index.html',
    persistenceOptions: { sessionToken: 12 },
    resolvePersistenceStateFromCapture() {}
  };

  const result = adapter(iframeDoc, nextOptions);
  assert.equal(result.doc, iframeDoc);
  assert.equal(result.nextOptions, nextOptions);
  assert.equal(result.capturePersistableDeckState, capturePersistableDeckState);
  assert.equal(result.resolvePersistenceStateFromDocumentCapture, resolvePersistenceStateFromDocumentCapture);
  assert.equal(factoryOptions.getPresentationUrl(), '/presentations/deck/index.html');
  assert.equal(factoryOptions.capturePersistableDeckState, capturePersistableDeckState);
  assert.equal(factoryOptions.resolvePersistenceStateFromDocumentCapture, resolvePersistenceStateFromDocumentCapture);
});

test('createStudioEditorPersistenceStateFromDocumentCaptureResolverAdapter uses direct helper without a builder', () => {
  const iframeDoc = { label: 'iframe-doc' };
  const capturedDeckState = { cleanHtml: '<html>captured</html>' };
  const capturePersistableDeckState = (doc) => {
    assert.equal(doc, iframeDoc);
    return capturedDeckState;
  };
  let delegatedArgs = null;
  const resolvePersistenceStateFromDocumentCapture = (doc, presentationUrl, options, resolvePersistenceStateFromCapture) => {
    delegatedArgs = { doc, presentationUrl, options, resolvePersistenceStateFromCapture };
    return { resolved: true };
  };
  const adapter = editorPersistenceState.createStudioEditorPersistenceStateFromDocumentCaptureResolverAdapter({
    persistenceApi: {
      resolveStudioPersistenceStateFromDocumentCapture: resolvePersistenceStateFromDocumentCapture
    },
    getPresentationUrl: () => '/presentations/deck/index.html',
    capturePersistableDeckState
  });
  const resolvePersistenceStateFromCapture = () => {};

  assert.deepEqual(adapter(iframeDoc, {
    persistenceOptions: { sessionToken: 12 },
    resolvePersistenceStateFromCapture
  }), { resolved: true });
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.presentationUrl, '/presentations/deck/index.html');
  assert.equal(delegatedArgs.options.capturePersistableDeckState, capturePersistableDeckState);
  assert.deepEqual(delegatedArgs.options.persistenceOptions, { sessionToken: 12 });
  assert.equal(delegatedArgs.resolvePersistenceStateFromCapture, resolvePersistenceStateFromCapture);
});

test('createStudioEditorPersistenceStateFromDocumentCaptureResolverAdapter returns null without required helpers', () => {
  const adapter = editorPersistenceState.createStudioEditorPersistenceStateFromDocumentCaptureResolverAdapter();

  assert.equal(adapter({}), null);
});

test('createStudioEditorPersistenceTaskStaleCheckerAdapter preserves builder precedence', () => {
  const isPersistenceTaskStale = () => {
    throw new Error('direct stale checker should not run when the builder exists');
  };
  let factoryOptions = null;
  const adapter = editorPersistenceState.createStudioEditorPersistenceTaskStaleCheckerAdapter({
    persistenceApi: {
      createStudioPersistenceTaskStaleChecker(options) {
        factoryOptions = options;
        return (presentationUrl, sessionToken) => ({
          presentationUrl,
          sessionToken,
          currentPresentationUrl: options.getPresentationUrl(),
          currentSessionToken: options.getSessionToken(),
          isPersistenceTaskStale: options.isPersistenceTaskStale
        });
      }
    },
    getPresentationUrl: () => '/presentations/deck/index.html',
    getSessionToken: () => 12,
    isPersistenceTaskStale
  });

  const result = adapter('/presentations/custom/index.html', 15);
  assert.equal(result.presentationUrl, '/presentations/custom/index.html');
  assert.equal(result.sessionToken, 15);
  assert.equal(result.currentPresentationUrl, '/presentations/deck/index.html');
  assert.equal(result.currentSessionToken, 12);
  assert.equal(result.isPersistenceTaskStale, isPersistenceTaskStale);
  assert.equal(factoryOptions.getPresentationUrl(), '/presentations/deck/index.html');
  assert.equal(factoryOptions.getSessionToken(), 12);
  assert.equal(factoryOptions.isPersistenceTaskStale, isPersistenceTaskStale);
});

test('createStudioEditorPersistenceTaskStaleCheckerAdapter uses direct helper without a builder', () => {
  let delegatedArgs = null;
  const isPersistenceTaskStale = (presentationUrl, options) => {
    delegatedArgs = { presentationUrl, options };
    return true;
  };
  const adapter = editorPersistenceState.createStudioEditorPersistenceTaskStaleCheckerAdapter({
    persistenceApi: { isStudioPersistenceTaskStale: isPersistenceTaskStale },
    getPresentationUrl: () => '/presentations/deck/index.html',
    getSessionToken: () => 12
  });

  assert.equal(adapter('/presentations/custom/index.html', 15), true);
  assert.equal(delegatedArgs.presentationUrl, '/presentations/custom/index.html');
  assert.deepEqual(delegatedArgs.options, {
    currentPresentationUrl: '/presentations/deck/index.html',
    currentSessionToken: 12,
    sessionToken: 15
  });
});

test('createStudioEditorPersistenceTaskStaleCheckerAdapter returns null without a shared checker', () => {
  const adapter = editorPersistenceState.createStudioEditorPersistenceTaskStaleCheckerAdapter();

  assert.equal(adapter('/presentations/deck/index.html', 12), null);
});

test('createStudioEditorPersistenceActionCurrentRunnerAdapter preserves builder precedence', () => {
  const readCurrentSessionState = () => ({
    getCurrentPresentationUrl: () => '/presentations/deck/index.html',
    getCurrentSessionToken: () => 12
  });
  const runPersistenceActionIfCurrent = () => {
    throw new Error('direct action runner should not run when the builder exists');
  };
  let factoryOptions = null;
  const adapter = editorPersistenceState.createStudioEditorPersistenceActionCurrentRunnerAdapter({
    persistenceApi: {
      createStudioPersistenceActionCurrentRunner(options) {
        factoryOptions = options;
        return (persistenceContext, action) => ({
          persistenceContext,
          action,
          readCurrentSessionState: options.readCurrentSessionState,
          runPersistenceActionIfCurrent: options.runPersistenceActionIfCurrent
        });
      }
    },
    readCurrentSessionState,
    runPersistenceActionIfCurrent
  });
  const persistenceContext = { presentationUrl: '/presentations/deck/index.html' };
  const action = () => {};

  const result = adapter(persistenceContext, action);
  assert.equal(result.persistenceContext, persistenceContext);
  assert.equal(result.action, action);
  assert.equal(result.readCurrentSessionState, readCurrentSessionState);
  assert.equal(result.runPersistenceActionIfCurrent, runPersistenceActionIfCurrent);
  assert.equal(factoryOptions.readCurrentSessionState, readCurrentSessionState);
  assert.equal(factoryOptions.runPersistenceActionIfCurrent, runPersistenceActionIfCurrent);
});

test('createStudioEditorPersistenceActionCurrentRunnerAdapter uses direct helper without a builder', () => {
  const sessionState = {
    getCurrentPresentationUrl: () => '/presentations/deck/index.html',
    getCurrentSessionToken: () => 12
  };
  const readCurrentSessionState = () => sessionState;
  let delegatedArgs = null;
  const runPersistenceActionIfCurrent = (persistenceContext, options, action) => {
    delegatedArgs = { persistenceContext, options, action };
    return true;
  };
  const adapter = editorPersistenceState.createStudioEditorPersistenceActionCurrentRunnerAdapter({
    persistenceApi: { runStudioPersistenceActionIfCurrent: runPersistenceActionIfCurrent },
    readCurrentSessionState
  });
  const persistenceContext = { sessionToken: 12 };
  const action = () => {};

  assert.equal(adapter(persistenceContext, action), true);
  assert.equal(delegatedArgs.persistenceContext, persistenceContext);
  assert.equal(delegatedArgs.options, sessionState);
  assert.equal(delegatedArgs.action, action);
});

test('createStudioEditorPersistenceActionCurrentRunnerAdapter returns null without a shared runner', () => {
  const adapter = editorPersistenceState.createStudioEditorPersistenceActionCurrentRunnerAdapter();

  assert.equal(adapter({}, null), null);
});

test('createStudioEditorPersistenceFailureHandlerAdapter preserves builder precedence', () => {
  const createHandlerOptions = (options) => ({ handlerOptions: true, ...options });
  const handlePersistenceFailure = () => {
    throw new Error('direct failure handler should not run when the builder exists');
  };
  let factoryOptions = null;
  const adapter = editorPersistenceState.createStudioEditorPersistenceFailureHandlerAdapter({
    persistenceApi: {
      createStudioPersistenceFailureHandler(options) {
        factoryOptions = options;
        return (persistenceContext, nextOptions) => ({
          persistenceContext,
          resolvedOptions: options.createHandlerOptions(nextOptions),
          handlePersistenceFailure: options.handlePersistenceFailure
        });
      }
    },
    createHandlerOptions,
    handlePersistenceFailure
  });
  const persistenceContext = { presentationUrl: '/presentations/deck/index.html' };
  const nextOptions = { onFailure: 'callback-sentinel' };

  const result = adapter(persistenceContext, nextOptions);
  assert.equal(result.persistenceContext, persistenceContext);
  assert.deepEqual(result.resolvedOptions, {
    handlerOptions: true,
    onFailure: 'callback-sentinel'
  });
  assert.equal(result.handlePersistenceFailure, handlePersistenceFailure);
  assert.equal(factoryOptions.createHandlerOptions, createHandlerOptions);
  assert.equal(factoryOptions.handlePersistenceFailure, handlePersistenceFailure);
});

test('createStudioEditorPersistenceFailureHandlerAdapter uses direct helper without a builder', () => {
  const createHandlerOptions = (options) => ({ handlerOptions: true, ...options });
  let delegatedArgs = null;
  const handlePersistenceFailure = (persistenceContext, options) => {
    delegatedArgs = { persistenceContext, options };
    return false;
  };
  const adapter = editorPersistenceState.createStudioEditorPersistenceFailureHandlerAdapter({
    persistenceApi: { handleStudioPersistenceFailure: handlePersistenceFailure },
    createHandlerOptions
  });
  const persistenceContext = { sessionToken: 12 };

  assert.equal(adapter(persistenceContext, { onFailure: 'callback-sentinel' }), false);
  assert.equal(delegatedArgs.persistenceContext, persistenceContext);
  assert.deepEqual(delegatedArgs.options, {
    handlerOptions: true,
    onFailure: 'callback-sentinel'
  });
});

test('createStudioEditorPersistenceFailureHandlerAdapter returns null without a shared handler', () => {
  const adapter = editorPersistenceState.createStudioEditorPersistenceFailureHandlerAdapter();

  assert.equal(adapter({}, {}), null);
});

test('createStudioEditorPersistenceSuccessHandlerAdapter preserves builder precedence', () => {
  const createHandlerOptions = (options) => ({ handlerOptions: true, ...options });
  const handlePersistenceSuccess = () => {
    throw new Error('direct success handler should not run when the builder exists');
  };
  let factoryOptions = null;
  const adapter = editorPersistenceState.createStudioEditorPersistenceSuccessHandlerAdapter({
    persistenceApi: {
      createStudioPersistenceSuccessHandler(options) {
        factoryOptions = options;
        return (persistenceContext, nextOptions) => ({
          persistenceContext,
          resolvedOptions: options.createHandlerOptions(nextOptions),
          handlePersistenceSuccess: options.handlePersistenceSuccess
        });
      }
    },
    createHandlerOptions,
    handlePersistenceSuccess
  });
  const persistenceContext = { presentationUrl: '/presentations/deck/index.html' };
  const nextOptions = { onSuccess: 'callback-sentinel' };

  const result = adapter(persistenceContext, nextOptions);
  assert.equal(result.persistenceContext, persistenceContext);
  assert.deepEqual(result.resolvedOptions, {
    handlerOptions: true,
    onSuccess: 'callback-sentinel'
  });
  assert.equal(result.handlePersistenceSuccess, handlePersistenceSuccess);
  assert.equal(factoryOptions.createHandlerOptions, createHandlerOptions);
  assert.equal(factoryOptions.handlePersistenceSuccess, handlePersistenceSuccess);
});

test('createStudioEditorPersistenceSuccessHandlerAdapter uses direct helper without a builder', () => {
  const createHandlerOptions = (options) => ({ handlerOptions: true, ...options });
  let delegatedArgs = null;
  const handlePersistenceSuccess = (persistenceContext, options) => {
    delegatedArgs = { persistenceContext, options };
    return true;
  };
  const adapter = editorPersistenceState.createStudioEditorPersistenceSuccessHandlerAdapter({
    persistenceApi: { handleStudioPersistenceSuccess: handlePersistenceSuccess },
    createHandlerOptions
  });
  const persistenceContext = { sessionToken: 12 };

  assert.equal(adapter(persistenceContext, { onSuccess: 'callback-sentinel' }), true);
  assert.equal(delegatedArgs.persistenceContext, persistenceContext);
  assert.deepEqual(delegatedArgs.options, {
    handlerOptions: true,
    onSuccess: 'callback-sentinel'
  });
});

test('createStudioEditorPersistenceSuccessHandlerAdapter returns null without a shared handler', () => {
  const adapter = editorPersistenceState.createStudioEditorPersistenceSuccessHandlerAdapter();

  assert.equal(adapter({}, {}), null);
});

test('createStudioEditorVersionPersistenceSuccessHandlerAdapter preserves builder precedence', () => {
  const createHandlerOptions = (options) => ({ handlerOptions: true, ...options });
  const handleVersionPersistenceSuccess = () => {
    throw new Error('direct version success handler should not run when the builder exists');
  };
  let factoryOptions = null;
  const adapter = editorPersistenceState.createStudioEditorVersionPersistenceSuccessHandlerAdapter({
    persistenceApi: {
      createStudioVersionPersistenceSuccessHandler(options) {
        factoryOptions = options;
        return (persistenceContext, nextOptions) => ({
          persistenceContext,
          resolvedOptions: options.createHandlerOptions(nextOptions),
          handleVersionPersistenceSuccess: options.handleVersionPersistenceSuccess
        });
      }
    },
    createHandlerOptions,
    handleVersionPersistenceSuccess
  });
  const persistenceContext = { presentationUrl: '/presentations/deck/index.html' };
  const nextOptions = { onSuccess: 'callback-sentinel' };

  const result = adapter(persistenceContext, nextOptions);
  assert.equal(result.persistenceContext, persistenceContext);
  assert.deepEqual(result.resolvedOptions, {
    handlerOptions: true,
    onSuccess: 'callback-sentinel'
  });
  assert.equal(result.handleVersionPersistenceSuccess, handleVersionPersistenceSuccess);
  assert.equal(factoryOptions.createHandlerOptions, createHandlerOptions);
  assert.equal(factoryOptions.handleVersionPersistenceSuccess, handleVersionPersistenceSuccess);
});

test('createStudioEditorVersionPersistenceSuccessHandlerAdapter uses direct helper without a builder', () => {
  const createHandlerOptions = (options) => ({ handlerOptions: true, ...options });
  let delegatedArgs = null;
  const handleVersionPersistenceSuccess = (persistenceContext, options) => {
    delegatedArgs = { persistenceContext, options };
    return true;
  };
  const adapter = editorPersistenceState.createStudioEditorVersionPersistenceSuccessHandlerAdapter({
    persistenceApi: {
      handleStudioVersionPersistenceSuccess: handleVersionPersistenceSuccess
    },
    createHandlerOptions
  });
  const persistenceContext = { sessionToken: 12 };

  assert.equal(adapter(persistenceContext, { onSuccess: 'callback-sentinel' }), true);
  assert.equal(delegatedArgs.persistenceContext, persistenceContext);
  assert.deepEqual(delegatedArgs.options, {
    handlerOptions: true,
    onSuccess: 'callback-sentinel'
  });
});

test('createStudioEditorVersionPersistenceSuccessHandlerAdapter returns null without a shared handler', () => {
  const adapter = editorPersistenceState.createStudioEditorVersionPersistenceSuccessHandlerAdapter();

  assert.equal(adapter({}, {}), null);
});

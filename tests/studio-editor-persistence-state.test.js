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

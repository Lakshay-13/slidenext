const test = require('node:test');
const assert = require('node:assert/strict');

const deckView = require('../shared/studio-deck-view.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');

test('createStudioDeckViewBuildViewOptionsResolver uses the document and extension hooks', () => {
  const iframeDoc = { id: 'iframe-doc' };
  const calls = [];
  const resolveViewOptions = deckView.createStudioDeckViewBuildViewOptionsResolver({
    createBuildOptions(sourceDoc) {
      calls.push(['build', sourceDoc]);
      return { activeSlideId: 'slide-1' };
    },
    extendViewOptions(viewOptions, sourceDoc) {
      calls.push(['extend', viewOptions, sourceDoc]);
      return { ...viewOptions, sourceDoc };
    },
    getDocument() {
      return iframeDoc;
    }
  });

  assert.deepEqual(resolveViewOptions(), {
    activeSlideId: 'slide-1',
    sourceDoc: iframeDoc
  });
  assert.deepEqual(calls, [
    ['build', iframeDoc],
    ['extend', { activeSlideId: 'slide-1' }, iframeDoc]
  ]);
});

test('createStudioDeckViewCanonicalStateOptions normalizes canonical view callbacks', () => {
  const buildCanonicalDeck = () => ({ slides: [] });
  const resolveLiveActiveSlideId = () => 'slide-1';

  const options = deckView.createStudioDeckViewCanonicalStateOptions({
    buildCanonicalDeck,
    resolveLiveActiveSlideId
  });

  assert.equal(options.buildCanonicalDeck, buildCanonicalDeck);
  assert.equal(options.resolveLiveActiveSlideId, resolveLiveActiveSlideId);
  assert.equal(typeof deckView.createStudioDeckViewCanonicalStateOptions().buildCanonicalDeck, 'function');
  assert.equal(deckView.createStudioDeckViewCanonicalStateOptions().resolveLiveActiveSlideId(), '');
});

test('createStudioDeckViewCanonicalHtmlResolver maps canonical html arguments', () => {
  const calls = [];
  const resolveCanonicalHtml = deckView.createStudioDeckViewCanonicalHtmlResolver({
    buildCanonicalHtml(...args) {
      calls.push(args);
      return '<html>canonical</html>';
    },
    mapCanonicalHtmlArgs(canonicalDeck, deckHtmlOptions) {
      return [canonicalDeck, '/presentations/demo/index.html', deckHtmlOptions];
    }
  });
  const deckHtmlOptions = { renderOptions: { activeSlideId: 'slide-1' } };
  const canonicalDeck = { slides: [] };

  assert.equal(resolveCanonicalHtml(canonicalDeck, deckHtmlOptions), '<html>canonical</html>');
  assert.deepEqual(calls, [[
    canonicalDeck,
    '/presentations/demo/index.html',
    deckHtmlOptions
  ]]);
});

test('createStudioDeckViewHtmlOptions composes injected view and canonical html resolvers', () => {
  const buildViewOptions = () => ({ activeSlideId: 'slide-1' });
  const buildCanonicalHtml = () => '<html>canonical</html>';
  const options = deckView.createStudioDeckViewHtmlOptions({
    buildSharedHtml: () => '<html>shared</html>',
    buildViewOptions,
    extendViewOptions(viewOptions, sourceDoc) {
      return { ...viewOptions, sourceDoc };
    },
    buildCanonicalHtml,
    mapCanonicalHtmlArgs(canonicalDeck, deckHtmlOptions) {
      return [canonicalDeck, deckHtmlOptions];
    },
    transformFallbackHtml: (html) => html
  });

  assert.equal(options.buildSharedHtml(), '<html>shared</html>');
  assert.deepEqual(options.buildViewOptions({ id: 'doc' }), {
    activeSlideId: 'slide-1',
    sourceDoc: { id: 'doc' }
  });
  assert.equal(options.buildCanonicalHtml('deck', { renderOptions: {} }), '<html>canonical</html>');
  assert.equal(options.transformFallbackHtml('<html>fallback</html>'), '<html>fallback</html>');
});

test('scheduleStudioDeckActiveSlideSync cancels a timer handle of zero', () => {
  const clearedTimers = [];
  const scheduled = [];

  const result = deckView.scheduleStudioDeckActiveSlideSync(0, () => {}, {
    clearTimer(timer) {
      clearedTimers.push(timer);
    },
    scheduleTimer(callback, delayMs) {
      scheduled.push([callback, delayMs]);
      return 'next-timer';
    }
  });

  assert.equal(result, 'next-timer');
  assert.deepEqual(clearedTimers, [0]);
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0][1], 0);
});

test('teardownStudioDeckActiveSlideSync clears a timer handle of zero', () => {
  const clearedTimers = [];

  const result = deckView.teardownStudioDeckActiveSlideSync({ timer: 0 }, {
    clearTimer(timer) {
      clearedTimers.push(timer);
    }
  });

  assert.deepEqual(result, {
    observer: null,
    timer: null
  });
  assert.deepEqual(clearedTimers, [0]);
});

test('captureStudioDeckViewBeforeSlideMutation saves history before preserving slide view state', () => {
  const doc = { id: 'editor-doc' };
  const calls = [];

  const result = deckView.captureStudioDeckViewBeforeSlideMutation({
    doc,
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    getActiveSlideId(nextDoc) {
      calls.push(['getActiveSlideId', nextDoc]);
      return 'slide-2';
    },
    getCommittedSelectedElementIds(nextDoc) {
      calls.push(['getCommittedSelectedElementIds', nextDoc]);
      return ['element-1'];
    }
  });

  assert.deepEqual(result, {
    preservedActiveSlideId: 'slide-2',
    preservedSelectionIds: ['element-1']
  });
  assert.deepEqual(calls, [
    ['saveHistoryState'],
    ['getActiveSlideId', doc],
    ['getCommittedSelectedElementIds', doc]
  ]);
});

test('captureStudioDeckViewBeforeSlideMutation records a canonical baseline when available', () => {
  const doc = { id: 'editor-doc' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const calls = [];

  const result = deckView.captureStudioDeckViewBeforeSlideMutation({
    doc,
    buildCanonicalDeck(nextDoc) {
      calls.push(['buildCanonicalDeck', nextDoc]);
      return canonicalDeck;
    },
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
    },
    getActiveSlideId() {
      calls.push(['getActiveSlideId']);
      return 'slide-2';
    },
    getCommittedSelectedElementIds() {
      calls.push(['getCommittedSelectedElementIds']);
      return ['element-1'];
    }
  });

  assert.deepEqual(result, {
    preservedActiveSlideId: 'slide-2',
    preservedSelectionIds: ['element-1']
  });
  assert.deepEqual(calls, [
    ['buildCanonicalDeck', doc],
    ['saveHistoryState', false, null, canonicalDeck],
    ['getActiveSlideId'],
    ['getCommittedSelectedElementIds']
  ]);
});

test('captureStudioDeckViewBeforeSlideMutation falls back when canonical baseline building fails', () => {
  const calls = [];

  deckView.captureStudioDeckViewBeforeSlideMutation({
    buildCanonicalDeck() {
      throw new Error('canonical import failed');
    },
    saveHistoryState(...args) {
      calls.push(args);
    }
  });

  assert.deepEqual(calls, [[]]);
});

test('applyStudioSlideReorderMutation moves a slide node and captures the container markup transaction', () => {
  const draggedNode = { id: 'slide-1' };
  const beforeNode = { id: 'slide-3' };
  const container = {
    innerHTML: '<section data-slide-id="slide-1"></section><section data-slide-id="slide-3"></section>',
    insertBefore(node, before) {
      assert.equal(node, draggedNode);
      assert.equal(before, beforeNode);
      this.innerHTML = '<section data-slide-id="slide-1"></section>';
      return node;
    }
  };

  const result = deckView.applyStudioSlideReorderMutation(
    container,
    draggedNode,
    beforeNode,
    {
      createMarkupTransactionCapture(items, options) {
        return studioTransaction.createStudioMarkupTransactionCapture(items, options);
      }
    }
  );

  assert.equal(result.didApply, true);
  assert.deepEqual(result.transaction, {
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [{
      type: 'markup',
      elementId: 'slides-container',
      before: '<section data-slide-id="slide-1"></section><section data-slide-id="slide-3"></section>',
      after: '<section data-slide-id="slide-1"></section>'
    }]
  });
});

test('slide mutations preserve custom transaction target options', () => {
  const slideNode = { id: 'slide-2' };
  const container = {
    innerHTML: '<section data-slide-id="slide-1"></section>',
    appendChild(node) {
      assert.equal(node, slideNode);
      this.innerHTML = '<section data-slide-id="slide-1"></section><section data-slide-id="slide-2"></section>';
      return node;
    }
  };
  const getElementId = () => 'custom-container-id';
  let captureOptions = null;

  const result = deckView.applyStudioSlideInsertionMutation(container, slideNode, {
    containerElementId: 'deck-slides',
    getElementId,
    createMarkupTransactionCapture(items, options) {
      captureOptions = { items, options };
      return studioTransaction.createStudioMarkupTransactionCapture(items, options);
    }
  });

  assert.equal(result.didApply, true);
  assert.equal(captureOptions.options.getElementId, getElementId);
  assert.deepEqual(result.transaction.operations, [{
    type: 'markup',
    elementId: 'deck-slides',
    before: '<section data-slide-id="slide-1"></section>',
    after: '<section data-slide-id="slide-1"></section><section data-slide-id="slide-2"></section>'
  }]);
});

test('syncStudioDeckActiveThumbnailCardState resolves thumbnail cards from the document', () => {
  const activeCard = { dataset: { slideId: 'slide-2' }, className: '' };
  const inactiveCard = { dataset: { slideId: 'slide-1' }, className: '' };
  const documentRef = {
    querySelectorAll(selector) {
      assert.equal(selector, '#thumbnailsList > div');
      return [activeCard, inactiveCard];
    }
  };

  assert.equal(deckView.syncStudioDeckActiveThumbnailCardState({
    documentRef,
    activeSlideId: 'slide-2'
  }), true);
  assert.match(activeCard.className, /border-\[#7028d0\]/);
  assert.match(inactiveCard.className, /border-white\/5/);
});

test('applyStudioSlideInsertionMutation appends a slide node and captures the container markup transaction', () => {
  const slideNode = { id: 'slide-2' };
  const container = {
    innerHTML: '<section data-slide-id="slide-1"></section>',
    appendChild(node) {
      assert.equal(node, slideNode);
      this.innerHTML = '<section data-slide-id="slide-1"></section><section data-slide-id="slide-2"></section>';
      return node;
    }
  };

  const result = deckView.applyStudioSlideInsertionMutation(container, slideNode, {
    createMarkupTransactionCapture(items, options) {
      return studioTransaction.createStudioMarkupTransactionCapture(items, options);
    }
  });

  assert.equal(result.didApply, true);
  assert.deepEqual(result.transaction, {
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [{
      type: 'markup',
      elementId: 'slides-container',
      before: '<section data-slide-id="slide-1"></section>',
      after: '<section data-slide-id="slide-1"></section><section data-slide-id="slide-2"></section>'
    }]
  });
});

test('applyStudioSlideInsertionMutation inserts before a sibling when requested', () => {
  const slideNode = { id: 'slide-2' };
  const beforeNode = { id: 'slide-3' };
  const container = {
    innerHTML: '<section data-slide-id="slide-1"></section><section data-slide-id="slide-3"></section>',
    insertBefore(node, sibling) {
      assert.equal(node, slideNode);
      assert.equal(sibling, beforeNode);
      this.innerHTML = '<section data-slide-id="slide-1"></section><section data-slide-id="slide-2"></section><section data-slide-id="slide-3"></section>';
      return node;
    }
  };

  const result = deckView.applyStudioSlideInsertionMutation(container, slideNode, {
    beforeNode,
    createMarkupTransactionCapture(items, options) {
      return studioTransaction.createStudioMarkupTransactionCapture(items, options);
    }
  });

  assert.equal(result.didApply, true);
  assert.equal(result.transaction.operations[0].after, '<section data-slide-id="slide-1"></section><section data-slide-id="slide-2"></section><section data-slide-id="slide-3"></section>');
});

test('applyStudioSlideDeletionMutation removes a slide node and captures the container markup transaction', () => {
  const slideNode = {
    remove() {
      container.innerHTML = '';
    }
  };
  const container = {
    innerHTML: '<section data-slide-id="slide-1"></section><section data-slide-id="slide-2"></section>'
  };

  const result = deckView.applyStudioSlideDeletionMutation(container, slideNode, {
    createMarkupTransactionCapture(items, options) {
      return studioTransaction.createStudioMarkupTransactionCapture(items, options);
    }
  });

  assert.equal(result.didApply, true);
  assert.deepEqual(result.transaction, {
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [{
      type: 'markup',
      elementId: 'slides-container',
      before: '<section data-slide-id="slide-1"></section><section data-slide-id="slide-2"></section>',
      after: ''
    }]
  });
});

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

test('createStudioDeckViewSharedOptions composes persisted, canonical, and live slide resolvers for the current editor session', () => {
  const doc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const calls = [];
  const isCanonicalDeck = (deck) => deck === canonicalDeck;

  const options = deckView.createStudioDeckViewSharedOptions(doc, {
    currentSlideIndex: 2,
    getPersistedActiveSlideId() {
      return 'slide-persisted';
    },
    buildCanonicalDeck(nextDoc) {
      calls.push(['buildCanonicalDeck', nextDoc]);
      return canonicalDeck;
    },
    resolveCanonicalDeckOverride(nextCanonicalDeck, overrideOptions = {}) {
      calls.push(['resolveCanonicalDeckOverride', nextCanonicalDeck, overrideOptions.buildCanonicalDeck]);
      return canonicalDeck;
    },
    resolveLiveActiveSlideId(nextDoc) {
      calls.push(['resolveLiveActiveSlideId', nextDoc]);
      return 'slide-live';
    },
    isCanonicalDeck
  });

  assert.equal(options.currentSlideIndex, 2);
  assert.equal(options.getPersistedActiveSlideId(), 'slide-persisted');
  assert.equal(options.resolveCanonicalDeck(doc), canonicalDeck);
  assert.equal(options.resolveCanonicalDeckOverride(canonicalDeck, doc), canonicalDeck);
  assert.equal(options.resolveLiveActiveSlideId(doc), 'slide-live');
  assert.equal(options.isCanonicalDeck, isCanonicalDeck);
  assert.deepEqual(calls, [
    ['buildCanonicalDeck', doc],
    ['resolveCanonicalDeckOverride', canonicalDeck, calls[1][2]],
    ['resolveLiveActiveSlideId', doc]
  ]);
  assert.equal(typeof calls[1][2], 'function');
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

test('syncStudioZoomToolbarActionState resolves and renders zoom controls in one shared operation', () => {
  const controls = {
    zoomOutBtn: { disabled: true },
    zoomSelect: { disabled: true },
    zoomInBtn: { disabled: true }
  };

  assert.equal(deckView.syncStudioZoomToolbarActionState({
    documentRef: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    doc: { activeSlide: {} },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    }
  }), true);
  assert.deepEqual(Object.values(controls).map((control) => control.disabled), [false, false, false]);
});

test('resolveStudioInsertionActionState derives slide insertion readiness from the active slide and slide container resolvers', () => {
  assert.deepEqual(
    deckView.resolveStudioInsertionActionState(null),
    {
      canAddSlide: false,
      canDuplicateSlide: false,
      canInsertElements: false
    }
  );

  assert.deepEqual(
    deckView.resolveStudioInsertionActionState(
      { activeSlide: { id: 'slide-1' }, slideContainer: {} },
      {
        getActiveSlide(doc) {
          return doc && doc.activeSlide ? doc.activeSlide : null;
        },
        getSlideContainer(doc) {
          return doc && doc.slideContainer ? doc.slideContainer : null;
        }
      }
    ),
    {
      canAddSlide: true,
      canDuplicateSlide: true,
      canInsertElements: true
    }
  );
});

test('syncStudioInsertionToolbarActionState resolves and renders insertion controls in one shared operation', () => {
  const controls = {
    addSlideBtn: { disabled: true },
    duplicateSlideBtn: { disabled: true },
    toolbarInsertHeadingBtn: { disabled: true },
    toolbarInsertParagraphBtn: { disabled: true },
    toolbarInsertImageBtn: { disabled: true },
    toolbarInsertShapeBtn: { disabled: true },
    insertHeadingBtn: { disabled: true },
    insertParagraphBtn: { disabled: true },
    insertImageBtn: { disabled: true },
    insertShapeBtn: { disabled: true },
    insertTableBtn: { disabled: true },
    insertCodeBtn: { disabled: true },
    insertEmbedBtn: { disabled: true },
    insertChartBtn: { disabled: true }
  };

  assert.equal(deckView.syncStudioInsertionToolbarActionState({
    documentRef: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    doc: {
      activeSlide: {},
      getElementById(id) {
        return id === 'slidesContainer' ? {} : null;
      }
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getSlideContainer(doc) {
      return doc && typeof doc.getElementById === 'function'
        ? doc.getElementById('slidesContainer')
        : null;
    }
  }), true);
  assert.equal(controls.addSlideBtn.disabled, false);
  assert.equal(controls.duplicateSlideBtn.disabled, false);
  assert.equal(controls.insertCodeBtn.disabled, false);
  assert.equal(controls.insertEmbedBtn.disabled, false);
  assert.equal(controls.insertChartBtn.disabled, false);
});

test('resolveStudioWallpaperActionState derives wallpaper readiness from the active slide resolver', () => {
  assert.deepEqual(
    deckView.resolveStudioWallpaperActionState(null),
    {
      activeSlide: null,
      canUseWallpaperControls: false
    }
  );

  assert.deepEqual(
    deckView.resolveStudioWallpaperActionState(
      { activeSlide: { id: 'slide-1' } },
      {
        getActiveSlide(doc) {
          return doc && doc.activeSlide ? doc.activeSlide : null;
        }
      }
    ),
    {
      activeSlide: { id: 'slide-1' },
      canUseWallpaperControls: true
    }
  );
});

test('syncStudioWallpaperToolbarActionState resolves and renders wallpaper controls in one shared operation', () => {
  const controls = {
    wpTabSolid: { disabled: true },
    wpTabPresets: { disabled: true },
    wpTabCustom: { disabled: true },
    wallpaperCustomColor: { disabled: true },
    cgLinearBtn: { disabled: true },
    cgRadialBtn: { disabled: true },
    cgColor1: { disabled: true },
    cgColor2: { disabled: true },
    cgAngle: { disabled: true },
    applyWallpaperToAllSlidesBtn: { disabled: true },
    wallpaperSolidsList: {
      buttons: [{ disabled: true }],
      querySelectorAll() {
        return this.buttons;
      }
    },
    wallpaperGradientsList: {
      buttons: [{ disabled: true }],
      querySelectorAll() {
        return this.buttons;
      }
    }
  };

  assert.equal(deckView.syncStudioWallpaperToolbarActionState({
    documentRef: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    doc: { activeSlide: {} },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    }
  }), true);
  assert.equal(controls.wpTabSolid.disabled, false);
  assert.equal(controls.cgAngle.disabled, false);
  assert.deepEqual(controls.wallpaperSolidsList.buttons.map((button) => button.disabled), [false]);
  assert.deepEqual(controls.wallpaperGradientsList.buttons.map((button) => button.disabled), [false]);
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

test('buildStudioDeckHtml falls back when canonical deck building throws', () => {
  let fallbackCalls = 0;
  assert.equal(
    deckView.buildStudioDeckHtml({ id: 'legacy-doc' }, {
      buildCanonicalDeck() {
        throw new Error('legacy import failed');
      },
      buildFallbackHtml(doc) {
        assert.deepEqual(doc, { id: 'legacy-doc' });
        fallbackCalls += 1;
        return '<html>legacy fallback</html>';
      }
    }),
    '<html>legacy fallback</html>'
  );
  assert.equal(fallbackCalls, 1);
});

test('buildStudioDeckHtml falls back when canonical rendering throws', () => {
  assert.equal(
    deckView.buildStudioDeckHtml({ id: 'legacy-doc' }, {
      buildCanonicalDeck() {
        return {
          kind: 'slidenext.deck',
          schemaVersion: 1,
          slides: [{ id: 'slide-1', nodes: [] }]
        };
      },
      buildCanonicalHtml() {
        throw new Error('unsupported canonical node');
      },
      buildFallbackHtml() {
        return '<html>legacy renderer fallback</html>';
      }
    }),
    '<html>legacy renderer fallback</html>'
  );
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

test('buildStudioDeckViewHtml forwards deck html options through canonical fallback orchestration', () => {
  const deckHtmlOptions = {
    renderOptions: {
      activeSlideId: 'slide-2'
    }
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-2', nodes: [] }]
  };
  let receivedOptions = null;

  const result = deckView.buildStudioDeckViewHtml(
    { label: 'doc' },
    {
      buildViewOptions() {
        return {
          deckHtmlOptions,
          buildCanonicalDeck() {
            return canonicalDeck;
          }
        };
      },
      buildCanonicalHtml(nextCanonicalDeck, nextDeckHtmlOptions) {
        assert.equal(nextCanonicalDeck, canonicalDeck);
        receivedOptions = nextDeckHtmlOptions;
        return '<html>canonical</html>';
      }
    }
  );

  assert.equal(result, '<html>canonical</html>');
  assert.equal(receivedOptions, deckHtmlOptions);
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

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const canonicalDeckModel = require('../shared/canonical-deck.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const canonicalWallpaper = require('../shared/studio-editor-canonical-wallpaper.js');
const studioWallpaperView = require('../shared/studio-editor-wallpaper-view.js');
const studioWallpaperMutation = require('../shared/studio-editor-wallpaper-mutation.js');
const deckMutation = require('../shared/studio-editor-deck-mutation.js');
const deckView = require('../shared/studio-deck-view.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return `
function getStudioPendingCustomWallpaperVersion() {
  return typeof hasPendingCustomWallpaperVersion !== 'undefined'
    ? !!hasPendingCustomWallpaperVersion
    : false;
}
function setStudioPendingCustomWallpaperVersion(nextValue) {
  hasPendingCustomWallpaperVersion = !!nextValue;
  return hasPendingCustomWallpaperVersion;
}
function clearStudioPendingCustomWallpaperVersion() {
  hasPendingCustomWallpaperVersion = false;
  return hasPendingCustomWallpaperVersion;
}
${fileContent.slice(start, end)}`;
}

function installWallpaperStateAccessors(context) {
  context.setStudioCustomGradientType = (nextValue) => {
    context.customGradientType = nextValue;
    return nextValue;
  };
  context.getStudioCustomGradientType = () => context.customGradientType;
}

function loadFinalizeWallpaperMutation(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function finalizeWallpaperMutation(versionLabel = \'\', transaction = null, canonicalDeck = null) {',
    '\n\n    function applyPresetWallpaper(val, isCustomInput = false) {'
  );
  context.SlideNextStudioEditorDeckMutation = deckMutation;
  vm.runInContext(helperSource, context);
}

function loadApplyEditorWallpaperMutationWithTransaction(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyEditorWallpaperSlidesMutationWithTransaction(slides, background, options = {}) {',
    '\n\n    function applyPresetWallpaper(val, isCustomInput = false) {'
  );
  context.SlideNextStudioEditorWallpaperView = {
    ...studioWallpaperView,
    ...(context.SlideNextStudioEditorWallpaperView || {})
  };
  context.SlideNextStudioEditorWallpaperMutation = studioWallpaperMutation;
  context.SlideNextStudioEditorCanonicalWallpaper = canonicalWallpaper;
  vm.runInContext(helperSource, context);
}

function loadResolveCurrentStudioWallpaperActionState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioWallpaperActionState(doc = getIframeDoc()) {',
    '\n\n    function updateWallpaperActionState(doc = getIframeDoc()) {'
  );
  if (typeof context.SlideNextStudioDeckView === 'undefined') {
    context.SlideNextStudioDeckView = deckView;
  }
  vm.runInContext(helperSource, context);
}

test('finalizeWallpaperMutation refreshes thumbnails and persists wallpaper changes', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    }
  };

  vm.createContext(context);
  loadFinalizeWallpaperMutation(fileContent, context);

  const result = context.finalizeWallpaperMutation('Auto: Changed Background');
  context.finalizeWallpaperMutation('');

  assert.equal(result, 'Auto: Changed Background');
  assert.deepEqual(calls, [
    ['generateThumbnails'],
    ['saveHistoryState'],
    ['triggerAutoSave'],
    ['triggerAutoVersion', 'Auto: Changed Background'],
    ['generateThumbnails'],
    ['saveHistoryState'],
    ['triggerAutoSave']
  ]);
});

test('finalizeWallpaperMutation reuses the shared deck mutation lifecycle when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const transaction = { id: 'wallpaper-tx' };
  let delegated = null;
  const context = {
    finalizeEditorDeckMutation(label, options) {
      delegated = { label, options };
      return 'delegated';
    },
    generateThumbnails() {},
    saveHistoryState() {},
    triggerAutoSave() {},
    triggerAutoVersion() {}
  };

  vm.createContext(context);
  loadFinalizeWallpaperMutation(fileContent, context);

  assert.equal(context.finalizeWallpaperMutation('Auto: Changed Background', transaction), 'delegated');
  assert.equal(delegated.label, 'Auto: Changed Background');
  assert.equal(delegated.options.transaction.id, transaction.id);
});

test('finalizeWallpaperMutation forwards an optional canonical wallpaper sidecar', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const transaction = { id: 'wallpaper-tx-canonical' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  let delegated = null;
  const context = {
    finalizeEditorDeckMutation(label, options) {
      delegated = { label, options };
      return 'delegated';
    },
    generateThumbnails() {},
    saveHistoryState() {},
    triggerAutoSave() {},
    triggerAutoVersion() {}
  };

  vm.createContext(context);
  loadFinalizeWallpaperMutation(fileContent, context);

  assert.equal(context.finalizeWallpaperMutation('Auto: Changed Background', transaction, canonicalDeck), 'delegated');
  assert.deepEqual(JSON.parse(JSON.stringify(delegated)), JSON.parse(JSON.stringify({
    label: 'Auto: Changed Background',
    options: { transaction, canonicalDeck }
  })));
});

test('finalizeWallpaperMutation preserves the canonical sidecar in its legacy fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const transaction = { id: 'wallpaper-tx-legacy' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const calls = [];
  const context = {
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion() {}
  };

  vm.createContext(context);
  loadFinalizeWallpaperMutation(fileContent, context);

  assert.equal(
    context.finalizeWallpaperMutation('Auto: Changed Background', transaction, canonicalDeck),
    'Auto: Changed Background'
  );
  assert.deepEqual(calls, [
    ['generateThumbnails'],
    ['saveHistoryState', false, transaction, canonicalDeck],
    ['triggerAutoSave']
  ]);
});

test('applyEditorWallpaperSlidesMutationWithTransaction returns an immutable canonical background sidecar', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const sourceSlide = {
    style: {
      background: 'white'
    }
  };
  const canonicalDeckBefore = canonicalDeckModel.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      layout: { background: { color: '#ffffff', style: 'white' } }
    }]
  });
  const context = {
    SlideNextCanonicalDeck: canonicalDeckModel,
    buildEditorCanonicalDeck() {
      return canonicalDeckBefore;
    }
  };

  vm.createContext(context);
  loadApplyEditorWallpaperMutationWithTransaction(fileContent, context);

  const mutation = context.applyEditorWallpaperSlidesMutationWithTransaction(
    [sourceSlide],
    'black',
    { getSlideId: () => 'slide-1' }
  );

  assert.equal(mutation.didChange, true);
  assert.equal(sourceSlide.style.background, 'black');
  assert.equal(canonicalDeckBefore.slides[0].layout.background.style, 'white');
  assert.equal(mutation.canonicalDeck.slides[0].layout.background.style, 'black');
});

test('applyEditorWallpaperSlidesMutationWithTransaction rebuilds canonical state from the current document', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const sourceDocument = { id: 'current-editor-document' };
  const canonicalDeckBefore = canonicalDeckModel.createCanonicalDeck({
    slides: [{ id: 'slide-1', layout: { background: { style: 'white' } } }]
  });
  const buildCalls = [];
  const context = {
    SlideNextCanonicalDeck: canonicalDeckModel,
    buildEditorCanonicalDeck(documentRef) {
      buildCalls.push(documentRef);
      return canonicalDeckBefore;
    }
  };

  vm.createContext(context);
  loadApplyEditorWallpaperMutationWithTransaction(fileContent, context);

  const mutation = context.applyEditorWallpaperSlidesMutationWithTransaction(
    [{ style: { background: 'white' } }],
    'black',
    { sourceDocument, getSlideId: () => 'slide-1' }
  );

  assert.equal(mutation.didChange, true);
  assert.equal(buildCalls[0], sourceDocument);
});

test('finalizeWallpaperMutation delegates its lifecycle adapter to shared mutation state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const transaction = { id: 'wallpaper-tx-shared' };
  let delegatedOptions = null;
  const context = {
    SlideNextStudioEditorMutation: {
      finalizeStudioWallpaperMutation(options) {
        delegatedOptions = options;
        return 'shared-wallpaper';
      }
    },
    finalizeEditorDeckMutation() {},
    generateThumbnails() {},
    saveHistoryState() {},
    triggerAutoSave() {},
    triggerAutoVersion() {}
  };

  vm.createContext(context);
  loadFinalizeWallpaperMutation(fileContent, context);

  assert.equal(context.finalizeWallpaperMutation('Auto: Changed Background', transaction), 'shared-wallpaper');
  assert.equal(delegatedOptions.versionLabel, 'Auto: Changed Background');
  assert.equal(delegatedOptions.transaction, transaction);
  assert.equal(delegatedOptions.finalizeMutation, context.finalizeEditorDeckMutation);
  assert.equal(delegatedOptions.generateThumbnails, context.generateThumbnails);
});

test('flushPendingWallpaperVersion commits a custom wallpaper version only when a real custom mutation is pending', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyPresetWallpaperSource = extractFunctionSource(
    fileContent,
    'function applyPresetWallpaper(val, isCustomInput = false) {',
    '\n\n    function setCustomGradientType(type) {'
  );

  const iframeDoc = { id: 'doc' };
  const activeSlide = {
    style: {
      background: ''
    }
  };
  const calls = [];
  const context = {
    hasPendingCustomWallpaperVersion: false,
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getActiveSlide(doc) {
      calls.push(['getActiveSlide', doc]);
      return activeSlide;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    }
  };

  vm.createContext(context);
  loadFinalizeWallpaperMutation(fileContent, context);
  loadResolveCurrentStudioWallpaperActionState(fileContent, context);
  loadApplyEditorWallpaperMutationWithTransaction(fileContent, context);
  vm.runInContext(applyPresetWallpaperSource, context);

  assert.equal(context.flushPendingWallpaperVersion(), false);
  assert.equal(context.applyPresetWallpaper('#ffffff', true), true);
  assert.equal(context.hasPendingCustomWallpaperVersion, true);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getActiveSlide', iframeDoc],
    ['generateThumbnails'],
    ['saveHistoryState'],
    ['triggerAutoSave']
  ]);

  calls.length = 0;
  assert.equal(context.flushPendingWallpaperVersion(), true);
  assert.equal(context.hasPendingCustomWallpaperVersion, false);
  assert.deepEqual(calls, [
    ['triggerAutoVersion', 'Auto: Changed Background']
  ]);

  calls.length = 0;
  assert.equal(context.flushPendingWallpaperVersion(), false);
  assert.deepEqual(calls, []);
});

test('applyPresetWallpaper uses the shared iframe accessor and records a version only for non-custom wallpaper updates', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyPresetWallpaperSource = extractFunctionSource(
    fileContent,
    'function applyPresetWallpaper(val, isCustomInput = false) {',
    '\n\n    function setCustomGradientType(type) {'
  );

  const iframeDoc = { id: 'doc' };
  const activeSlide = {
    style: {
      background: ''
    }
  };
  const calls = [];
  const context = {
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getActiveSlide(doc) {
      calls.push(['getActiveSlide', doc]);
      return activeSlide;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    }
  };

  vm.createContext(context);
  loadFinalizeWallpaperMutation(fileContent, context);
  loadResolveCurrentStudioWallpaperActionState(fileContent, context);
  loadApplyEditorWallpaperMutationWithTransaction(fileContent, context);
  vm.runInContext(applyPresetWallpaperSource, context);

  assert.equal(context.applyPresetWallpaper('linear-gradient(red, blue)'), true);
  assert.equal(activeSlide.style.background, 'linear-gradient(red, blue)');
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getActiveSlide', iframeDoc],
    ['generateThumbnails'],
    ['saveHistoryState'],
    ['triggerAutoSave'],
    ['triggerAutoVersion', 'Auto: Changed Background']
  ]);

  calls.length = 0;
  assert.equal(context.applyPresetWallpaper('#ffffff', true), true);
  assert.equal(activeSlide.style.background, '#ffffff');
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getActiveSlide', iframeDoc],
    ['generateThumbnails'],
    ['saveHistoryState'],
    ['triggerAutoSave']
  ]);
});

test('applyPresetWallpaper records a slide-scoped background style transaction', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyPresetWallpaperSource = extractFunctionSource(
    fileContent,
    'function applyPresetWallpaper(val, isCustomInput = false) {',
    '\n\n    function setCustomGradientType(type) {'
  );

  const iframeDoc = { id: 'doc' };
  const activeSlide = {
    style: {
      background: '#000000'
    }
  };
  let saveArgs = null;
  const context = {
    SlideNextStudioEditorTransaction: studioTransaction,
    generateThumbnails() {},
    getActiveSlide() {
      return activeSlide;
    },
    getEditorSlideId(slide) {
      assert.equal(slide, activeSlide);
      return 'slide-1';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    saveHistoryState(...args) {
      saveArgs = args;
    },
    triggerAutoSave() {},
    triggerAutoVersion() {}
  };

  vm.createContext(context);
  loadFinalizeWallpaperMutation(fileContent, context);
  loadResolveCurrentStudioWallpaperActionState(fileContent, context);
  loadApplyEditorWallpaperMutationWithTransaction(fileContent, context);
  vm.runInContext(applyPresetWallpaperSource, context);

  assert.equal(context.applyPresetWallpaper('#ffffff'), true);
  assert.deepEqual(JSON.parse(JSON.stringify(saveArgs)), [
    false,
    {
      kind: 'slidenext.editor.transaction',
      version: 1,
      operations: [{
        type: 'style',
        elementId: 'slide:slide-1',
        before: { background: '#000000' },
        after: { background: '#ffffff' }
      }]
    }
  ]);
});

test('applyPresetWallpaper delegates the active-slide mutation to the shared wallpaper view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyPresetWallpaperSource = extractFunctionSource(
    fileContent,
    'function applyPresetWallpaper(val, isCustomInput = false) {',
    '\n\n    function setCustomGradientType(type) {'
  );

  const iframeDoc = { id: 'doc' };
  const activeSlide = { style: { background: '' } };
  let delegatedArgs = null;
  let finalizedArgs = null;
  const context = {
    SlideNextStudioEditorWallpaperView: {
      applyStudioWallpaperToSlides(slides, background, options) {
        delegatedArgs = { slides, background, options };
        return { didChange: true, transaction: { type: 'style' } };
      }
    },
    getActiveSlide() {
      return activeSlide;
    },
    getIframeDoc() {
      return iframeDoc;
    },
    resolveCurrentStudioWallpaperActionState() {
      return { canUseWallpaperControls: true, activeSlide };
    },
    finalizeWallpaperMutation(...args) {
      finalizedArgs = args;
    },
    hasPendingCustomWallpaperVersion: false
  };

  vm.createContext(context);
  loadApplyEditorWallpaperMutationWithTransaction(fileContent, context);
  vm.runInContext(applyPresetWallpaperSource, context);

  assert.equal(context.applyPresetWallpaper('#ffffff'), true);
  assert.equal(delegatedArgs.slides[0], activeSlide);
  assert.equal(delegatedArgs.background, '#ffffff');
  assert.equal(typeof delegatedArgs.options.getSlideId, 'function');
  assert.equal(finalizedArgs[0], 'Auto: Changed Background');
  assert.deepEqual(JSON.parse(JSON.stringify(finalizedArgs[1])), { type: 'style' });
});

test('applyPresetWallpaper exits cleanly when the shared iframe accessor has no active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyPresetWallpaperSource = extractFunctionSource(
    fileContent,
    'function applyPresetWallpaper(val, isCustomInput = false) {',
    '\n\n    function setCustomGradientType(type) {'
  );

  const calls = [];
  const context = {
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getActiveSlide(doc) {
      calls.push(['getActiveSlide', doc]);
      return null;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return null;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    }
  };

  vm.createContext(context);
  loadFinalizeWallpaperMutation(fileContent, context);
  loadResolveCurrentStudioWallpaperActionState(fileContent, context);
  loadApplyEditorWallpaperMutationWithTransaction(fileContent, context);
  vm.runInContext(applyPresetWallpaperSource, context);

  assert.equal(context.applyPresetWallpaper('#000000'), false);

  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getActiveSlide', null]
  ]);
});

test('applyPresetWallpaper skips persistence when the active slide already has the requested background', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyPresetWallpaperSource = extractFunctionSource(
    fileContent,
    'function applyPresetWallpaper(val, isCustomInput = false) {',
    '\n\n    function setCustomGradientType(type) {'
  );

  const iframeDoc = { id: 'doc' };
  const activeSlide = {
    style: {
      background: 'linear-gradient(red, blue)'
    }
  };
  const calls = [];
  const context = {
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getActiveSlide(doc) {
      calls.push(['getActiveSlide', doc]);
      return activeSlide;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    }
  };

  vm.createContext(context);
  loadFinalizeWallpaperMutation(fileContent, context);
  loadResolveCurrentStudioWallpaperActionState(fileContent, context);
  loadApplyEditorWallpaperMutationWithTransaction(fileContent, context);
  vm.runInContext(applyPresetWallpaperSource, context);

  assert.equal(context.applyPresetWallpaper('linear-gradient(red, blue)'), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getActiveSlide', iframeDoc]
  ]);
});

test('applyPresetWallpaper compares against canonical active-slide paint', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyPresetWallpaperSource = extractFunctionSource(
    fileContent,
    'function applyPresetWallpaper(val, isCustomInput = false) {',
    '\n\n    function setCustomGradientType(type) {'
  );
  const iframeDoc = { id: 'doc' };
  const activeSlide = { style: { background: '#000000' } };
  const canonicalActiveSlide = {
    id: 'slide-1',
    layout: { background: { style: 'background: linear-gradient(red, blue);' } }
  };
  const context = {
    SlideNextStudioEditorWallpaperView: studioWallpaperView,
    getIframeDoc() {
      return iframeDoc;
    },
    resolveCurrentStudioWallpaperActionState() {
      return {
        activeSlide,
        canonicalActiveSlide,
        canUseWallpaperControls: true
      };
    },
    finalizeWallpaperMutation() {
      throw new Error('canonical no-op should not persist');
    }
  };

  vm.createContext(context);
  vm.runInContext(applyPresetWallpaperSource, context);

  assert.equal(context.applyPresetWallpaper('linear-gradient(red, blue)'), false);
  assert.equal(activeSlide.style.background, '#000000');
});

test('applyWallpaperToAllSlides uses the shared iframe accessor and propagates the active background to every slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyWallpaperToAllSlidesSource = extractFunctionSource(
    fileContent,
    'function applyWallpaperToAllSlides() {',
    '\n\n    // 5. Undo/Redo Engine'
  );

  const iframeDoc = { id: 'doc' };
  const activeSlide = {
    style: {
      background: 'linear-gradient(red, blue)'
    }
  };
  const siblingSlide = {
    style: {
      background: ''
    }
  };
  const calls = [];
  const context = {
    alert(message) {
      calls.push(['alert', message]);
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getActiveSlide(doc) {
      calls.push(['getActiveSlide', doc]);
      return activeSlide;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return [activeSlide, siblingSlide];
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    }
  };

  vm.createContext(context);
  loadFinalizeWallpaperMutation(fileContent, context);
  loadResolveCurrentStudioWallpaperActionState(fileContent, context);
  loadApplyEditorWallpaperMutationWithTransaction(fileContent, context);
  vm.runInContext(applyWallpaperToAllSlidesSource, context);

  assert.equal(context.applyWallpaperToAllSlides(), true);

  assert.equal(activeSlide.style.background, 'linear-gradient(red, blue)');
  assert.equal(siblingSlide.style.background, 'linear-gradient(red, blue)');
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getActiveSlide', iframeDoc],
    ['getSlides', iframeDoc],
    ['generateThumbnails'],
    ['saveHistoryState'],
    ['triggerAutoSave'],
    ['triggerAutoVersion', 'Auto: Applied Background to All Slides'],
    ['alert', 'Successfully applied active background paint to all slides in the deck.']
  ]);
});

test('applyWallpaperToAllSlides delegates slide mutation to the shared wallpaper view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyWallpaperToAllSlidesSource = extractFunctionSource(
    fileContent,
    'function applyWallpaperToAllSlides() {',
    '\n\n    // 5. Undo/Redo Engine'
  );

  const iframeDoc = { id: 'doc' };
  const activeSlide = { style: { background: 'linear-gradient(red, blue)' } };
  const siblingSlide = { style: { background: '' } };
  let delegatedArgs = null;
  let finalizedArgs = null;
  const context = {
    SlideNextStudioEditorWallpaperView: {
      applyStudioWallpaperToSlides(slides, background, options) {
        delegatedArgs = { slides, background, options };
        return { didChange: true, transaction: { type: 'style' } };
      }
    },
    alert() {},
    getIframeDoc() {
      return iframeDoc;
    },
    getSlides() {
      return [activeSlide, siblingSlide];
    },
    resolveCurrentStudioWallpaperActionState() {
      return { canUseWallpaperControls: true, activeSlide };
    },
    finalizeWallpaperMutation(...args) {
      finalizedArgs = args;
    }
  };

  vm.createContext(context);
  loadApplyEditorWallpaperMutationWithTransaction(fileContent, context);
  vm.runInContext(applyWallpaperToAllSlidesSource, context);

  assert.equal(context.applyWallpaperToAllSlides(), true);
  assert.equal(delegatedArgs.background, 'linear-gradient(red, blue)');
  assert.equal(delegatedArgs.slides.length, 2);
  assert.equal(typeof delegatedArgs.options.getSlideId, 'function');
  assert.equal(finalizedArgs[0], 'Auto: Applied Background to All Slides');
  assert.deepEqual(JSON.parse(JSON.stringify(finalizedArgs[1])), { type: 'style' });
});

test('applyWallpaperToAllSlides uses canonical active-slide paint', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyWallpaperToAllSlidesSource = extractFunctionSource(
    fileContent,
    'function applyWallpaperToAllSlides() {',
    '\n\n    // 5. Undo/Redo Engine'
  );
  const iframeDoc = { id: 'doc' };
  const activeSlide = { style: { background: '#000000' } };
  const siblingSlide = { style: { background: '' } };
  let delegatedBackground = '';
  const context = {
    SlideNextStudioEditorWallpaperView: studioWallpaperView,
    getIframeDoc() {
      return iframeDoc;
    },
    getSlides() {
      return [activeSlide, siblingSlide];
    },
    resolveCurrentStudioWallpaperActionState() {
      return {
        activeSlide,
        canonicalActiveSlide: {
          id: 'slide-1',
          layout: { background: { style: 'background: linear-gradient(red, blue);' } }
        },
        canUseWallpaperControls: true
      };
    },
    SlideNextStudioEditorCanonicalWallpaper: canonicalWallpaper,
    SlideNextCanonicalDeck: canonicalDeckModel,
    buildEditorMutationCanonicalDeck() {
      return canonicalDeckModel.createCanonicalDeck({ slides: [] });
    },
    applyEditorWallpaperSlidesMutationWithTransaction(slides, background) {
      delegatedBackground = background;
      return { didChange: true, transaction: null };
    },
    finalizeWallpaperMutation() {},
    alert() {}
  };

  vm.createContext(context);
  vm.runInContext(applyWallpaperToAllSlidesSource, context);

  assert.equal(context.applyWallpaperToAllSlides(), true);
  assert.equal(delegatedBackground, 'linear-gradient(red, blue)');
});

test('applyWallpaperToAllSlides records one style transaction per changed slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyWallpaperToAllSlidesSource = extractFunctionSource(
    fileContent,
    'function applyWallpaperToAllSlides() {',
    '\n\n    // 5. Undo/Redo Engine'
  );

  const iframeDoc = { id: 'doc' };
  const activeSlide = {
    style: {
      background: 'linear-gradient(red, blue)'
    }
  };
  const siblingSlide = {
    style: {
      background: ''
    }
  };
  let saveArgs = null;
  const context = {
    SlideNextStudioEditorTransaction: studioTransaction,
    alert() {},
    generateThumbnails() {},
    getActiveSlide() {
      return activeSlide;
    },
    getEditorSlideId(slide) {
      return slide === activeSlide ? 'slide-1' : 'slide-2';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlides() {
      return [activeSlide, siblingSlide];
    },
    saveHistoryState(...args) {
      saveArgs = args;
    },
    triggerAutoSave() {},
    triggerAutoVersion() {}
  };

  vm.createContext(context);
  loadFinalizeWallpaperMutation(fileContent, context);
  loadResolveCurrentStudioWallpaperActionState(fileContent, context);
  loadApplyEditorWallpaperMutationWithTransaction(fileContent, context);
  vm.runInContext(applyWallpaperToAllSlidesSource, context);

  assert.equal(context.applyWallpaperToAllSlides(), true);
  assert.deepEqual(JSON.parse(JSON.stringify(saveArgs)), [
    false,
    {
      kind: 'slidenext.editor.transaction',
      version: 1,
      operations: [{
        type: 'style',
        elementId: 'slide:slide-2',
        before: { background: '' },
        after: { background: 'linear-gradient(red, blue)' }
      }]
    }
  ]);
});

test('applyWallpaperToAllSlides exits when the shared iframe accessor has no active background', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyWallpaperToAllSlidesSource = extractFunctionSource(
    fileContent,
    'function applyWallpaperToAllSlides() {',
    '\n\n    // 5. Undo/Redo Engine'
  );

  const calls = [];
  const context = {
    alert(message) {
      calls.push(['alert', message]);
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getActiveSlide(doc) {
      calls.push(['getActiveSlide', doc]);
      return {
        style: {
          background: ''
        }
      };
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return null;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return [];
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    }
  };

  vm.createContext(context);
  loadFinalizeWallpaperMutation(fileContent, context);
  loadResolveCurrentStudioWallpaperActionState(fileContent, context);
  loadApplyEditorWallpaperMutationWithTransaction(fileContent, context);
  vm.runInContext(applyWallpaperToAllSlidesSource, context);

  assert.equal(context.applyWallpaperToAllSlides(), false);

  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getActiveSlide', null]
  ]);
});

test('applyWallpaperToAllSlides skips persistence and alerts when every slide already matches the active background', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyWallpaperToAllSlidesSource = extractFunctionSource(
    fileContent,
    'function applyWallpaperToAllSlides() {',
    '\n\n    // 5. Undo/Redo Engine'
  );

  const iframeDoc = { id: 'doc' };
  const activeSlide = {
    style: {
      background: 'linear-gradient(red, blue)'
    }
  };
  const siblingSlide = {
    style: {
      background: 'linear-gradient(red, blue)'
    }
  };
  const calls = [];
  const context = {
    alert(message) {
      calls.push(['alert', message]);
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getActiveSlide(doc) {
      calls.push(['getActiveSlide', doc]);
      return activeSlide;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return [activeSlide, siblingSlide];
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    }
  };

  vm.createContext(context);
  loadFinalizeWallpaperMutation(fileContent, context);
  loadResolveCurrentStudioWallpaperActionState(fileContent, context);
  loadApplyEditorWallpaperMutationWithTransaction(fileContent, context);
  vm.runInContext(applyWallpaperToAllSlidesSource, context);

  assert.equal(context.applyWallpaperToAllSlides(), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getActiveSlide', iframeDoc],
    ['getSlides', iframeDoc]
  ]);
});

test('applyCustomGradient exits cleanly when the custom gradient controls are unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyCustomGradientSource = extractFunctionSource(
    fileContent,
    'function applyCustomGradient() {',
    '\n\n    function applyWallpaperToAllSlides() {'
  );

  const calls = [];
  const context = {
    applyPresetWallpaper() {
      calls.push(['applyPresetWallpaper']);
      return true;
    },
    customGradientType: 'linear',
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'cgColor1' || id === 'cgColor2' || id === 'cgAngle') {
          return null;
        }
        return null;
      }
    },
    resolveCurrentStudioWallpaperActionState() {
      return {
        canUseWallpaperControls: true
      };
    }
  };

  vm.createContext(context);
  vm.runInContext(applyCustomGradientSource, context);

  assert.equal(context.applyCustomGradient(), false);
  assert.deepEqual(calls, [
    ['getElementById', 'cgColor1'],
    ['getElementById', 'cgColor2'],
    ['getElementById', 'cgAngle']
  ]);
});

test('setCustomGradientType exits cleanly when the gradient chrome is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setCustomGradientTypeSource = extractFunctionSource(
    fileContent,
    'function setCustomGradientType(type) {',
    '\n\n    // Build background CSS based on custom stops'
  );

  const calls = [];
  const context = {
    applyCustomGradient() {
      calls.push(['applyCustomGradient']);
      return false;
    },
    customGradientType: 'radial',
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'cgLinearBtn' || id === 'cgRadialBtn' || id === 'cgAngleGroup') {
          return null;
        }
        return null;
      }
    },
    resolveCurrentStudioWallpaperActionState() {
      return {
        canUseWallpaperControls: true
      };
    }
  };
  installWallpaperStateAccessors(context);

  vm.createContext(context);
  vm.runInContext(setCustomGradientTypeSource, context);

  assert.equal(context.setCustomGradientType('linear'), false);
  assert.equal(context.customGradientType, 'radial');
  assert.deepEqual(calls, [
    ['getElementById', 'cgLinearBtn'],
    ['getElementById', 'cgRadialBtn'],
    ['getElementById', 'cgAngleGroup']
  ]);
});

test('setCustomGradientType delegates chrome synchronization to the shared wallpaper view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setCustomGradientTypeSource = extractFunctionSource(
    fileContent,
    'function setCustomGradientType(type) {',
    '\n\n    // Build background CSS based on custom stops'
  );

  let syncOptions = null;
  const context = {
    SlideNextStudioEditorWallpaperView: {
      syncStudioCustomGradientTypeChrome(options) {
        syncOptions = options;
        return true;
      }
    },
    applyCustomGradient() {
      return true;
    },
    customGradientType: 'linear',
    document: {
      getElementById(id) {
        if (id === 'cgAngleGroup') return { classList: {} };
        return { className: '' };
      }
    },
    resolveCurrentStudioWallpaperActionState() {
      return { canUseWallpaperControls: true };
    }
  };
  installWallpaperStateAccessors(context);

  vm.createContext(context);
  vm.runInContext(setCustomGradientTypeSource, context);

  assert.equal(context.setCustomGradientType('radial'), true);
  assert.equal(syncOptions.documentRef, context.document);
  assert.equal(syncOptions.gradientType, 'radial');
  assert.equal(context.customGradientType, 'radial');
});

test('updateCustomGradientAngle exits cleanly when the angle label is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateCustomGradientAngleSource = extractFunctionSource(
    fileContent,
    'function updateCustomGradientAngle(value) {',
    '\n\n    // Build background CSS based on custom stops'
  );

  const calls = [];
  const context = {
    applyCustomGradient() {
      calls.push(['applyCustomGradient']);
      return false;
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'cgAngleVal') {
          return null;
        }
        return null;
      }
    },
    resolveCurrentStudioWallpaperActionState() {
      return {
        canUseWallpaperControls: true
      };
    }
  };

  vm.createContext(context);
  vm.runInContext(updateCustomGradientAngleSource, context);

  assert.equal(context.updateCustomGradientAngle('180'), false);
  assert.deepEqual(calls, [
    ['getElementById', 'cgAngleVal'],
    ['applyCustomGradient']
  ]);
});

test('updateCustomGradientAngle delegates angle chrome to the shared wallpaper view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateCustomGradientAngleSource = extractFunctionSource(
    fileContent,
    'function updateCustomGradientAngle(value) {',
    '\n\n    // Build background CSS based on custom stops'
  );
  let syncOptions = null;
  const context = {
    SlideNextStudioEditorWallpaperView: {
      syncStudioCustomGradientAngleChrome(options) {
        syncOptions = options;
        return true;
      }
    },
    document: { id: 'editor-document' },
    resolveCurrentStudioWallpaperActionState() {
      return { canUseWallpaperControls: true };
    },
    applyCustomGradient() {
      return true;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateCustomGradientAngleSource, context);

  assert.equal(context.updateCustomGradientAngle('210'), true);
  assert.equal(syncOptions.documentRef, context.document);
  assert.equal(syncOptions.angle, '210');
});

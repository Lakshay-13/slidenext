const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const wallpaperView = require('../shared/studio-editor-wallpaper-view.js');
const activeSlideView = require('../shared/studio-editor-active-slide-view.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function ensureSyncStudioChromeActionStateHelpers(context) {
  context.SlideNextStudioEditorWallpaperView ??= wallpaperView;
  context.SlideNextStudioEditorActiveSlideView ??= activeSlideView;
  if (typeof context.updateInsertionActionState !== 'function') {
    context.updateInsertionActionState = () => {};
  }
  if (typeof context.updateZoomActionState !== 'function') {
    context.updateZoomActionState = () => {};
  }
  if (typeof context.updateWallpaperActionState !== 'function') {
    context.updateWallpaperActionState = () => {};
  }
}

test('setActiveSlide delegates requested options to the navigation controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setActiveSlideSource = extractFunctionSource(
    fileContent,
    'function setActiveSlide(index, options = {}) {',
    '\n\n    // Sync presentation\'s internal dots and counter'
  );

  const iframeDoc = { id: 'doc' };
  let capturedCall = null;
  let getIframeDocCalls = 0;
  const context = {
    studioEditorNavigationController: {
      setActiveSlide(index, options) {
        capturedCall = { index, options };
        getIframeDocCalls += 1;
        return true;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(setActiveSlideSource, context);

  context.setActiveSlide(3, { captureHistory: true, preserveSelection: true });

  assert.equal(getIframeDocCalls, 1);
  assert.equal(capturedCall.index, 3);
  assert.equal(capturedCall.options.captureHistory, true);
  assert.equal(capturedCall.options.preserveSelection, true);
});

test('navigateEditorSlide clamps navigation to the live slide list and records history for changes', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const navigateEditorSlideSource = extractFunctionSource(
    fileContent,
    'function navigateEditorSlide(direction = 0) {',
    '\n\n    // Sync presentation\'s internal dots and counter'
  );
  const slides = [{ id: 'slide-1' }, { id: 'slide-2' }, { id: 'slide-3' }];
  const calls = [];
  const context = {
    studioEditorNavigationController: {
      navigate(direction) {
        const currentIndex = calls.length === 0 ? 1 : calls[calls.length - 1].index;
        const nextIndex = Math.max(0, Math.min(slides.length - 1, currentIndex + Math.sign(direction)));
        if (nextIndex === currentIndex || !Number.isFinite(direction) || direction === 0) return false;
        const options = { captureHistory: true };
        calls.push({ index: nextIndex, options });
        return true;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(navigateEditorSlideSource, context);

  assert.equal(context.navigateEditorSlide(-1), true);
  assert.equal(context.navigateEditorSlide(1), true);
  assert.equal(context.navigateEditorSlide(1), true);
  assert.equal(context.navigateEditorSlide(1), false);
  assert.deepEqual(calls.map(({ index, options }) => ({
    index,
    captureHistory: options.captureHistory
  })), [
    { index: 0, captureHistory: true },
    { index: 1, captureHistory: true },
    { index: 2, captureHistory: true }
  ]);
});

test('bindDeckNavigationSync delegates to the navigation controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const bindDeckNavigationSyncSource = extractFunctionSource(
    fileContent,
    'function bindDeckNavigationSync(doc = getIframeDoc()) {',
    '\n\n    function teardownDeckActiveSlideSync() {'
  );

  const iframeDoc = { id: 'doc' };
  let capturedDoc = null;
  const context = {
    studioEditorNavigationController: {
      bind(doc) {
        capturedDoc = doc;
        return true;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(bindDeckNavigationSyncSource, context);

  assert.equal(context.bindDeckNavigationSync(iframeDoc), true);
  assert.equal(capturedDoc, iframeDoc);
});

test('updateIframeNavigationUI delegates to the navigation controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateIframeNavigationUISource = extractFunctionSource(
    fileContent,
    'function updateIframeNavigationUI(doc, slides) {',
    '\n\n    function createEditorSlideMutationPersistenceFinalizer'
  );

  const iframeDoc = { id: 'doc' };
  const slides = [{ id: 'slide-1' }];
  let capturedArgs = null;
  const context = {
    studioEditorNavigationController: {
      updateIframeNavigationUi(...args) {
        capturedArgs = args;
        return true;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(updateIframeNavigationUISource, context);

  assert.equal(context.updateIframeNavigationUI(iframeDoc, slides), true);
  assert.deepEqual(capturedArgs, [iframeDoc, slides]);
});

test('syncStudioChromeToActiveSlide routes active slide index updates through the shared session-state helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncStudioChromeToActiveSlideSource = extractFunctionSource(
    fileContent,
    'function syncStudioChromeToActiveSlide(doc = getIframeDoc(), options = {}) {',
    '\n\n    function bindDeckNavigationSync(doc = getIframeDoc()) {'
  );

  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slideCountLabel');
      return {
        textContent: ''
      };
    }
  };
  const calls = [];
  const context = {
    currentSlideIndex: 1,
    deselectElement() {
      calls.push(['deselectElement']);
      context.updateLayersList();
    },
    document: {
      getElementById(id) {
        if (id === 'slideCountLabel') {
          return {
            textContent: ''
          };
        }
        if (id === 'wallpaperCustomColor') {
          return null;
        }
        return null;
      }
    },
    getEditorSlideId() {
      return 'slide-4';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlides() {
      return [];
    },
    getActiveSlide() {
      return null;
    },
    preserveSelectionOnNextActiveSlideSync: false,
    pruneEditorChromeNodes() {},
    updateInsertionActionState(doc) {
      calls.push(['updateInsertionActionState', doc]);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    },
    updateWallpaperActionState(doc) {
      calls.push(['updateWallpaperActionState', doc]);
    },
    updateZoomActionState(doc) {
      calls.push(['updateZoomActionState', doc]);
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    SlideNextStudioDeckView: {
      syncStudioActiveSlideView(doc, options) {
        calls.push(['syncStudioActiveSlideView', doc]);
        options.setCurrentSlideIndex(4);
        options.setSlideCountLabel('5 / 8');
        return {
          didSync: true
        };
      }
    },
    updateActiveThumbnailCardState() {},
    updateCurrentPresentationSessionState(nextState) {
      calls.push(['updateCurrentPresentationSessionState', nextState]);
      if (Object.prototype.hasOwnProperty.call(nextState, 'slideIndex')) {
        context.currentSlideIndex = nextState.slideIndex;
      }
    },
    updateIframeNavigationUI() {}
  };

  ensureSyncStudioChromeActionStateHelpers(context);
  vm.createContext(context);
  vm.runInContext(syncStudioChromeToActiveSlideSource, context);

  const didSync = context.syncStudioChromeToActiveSlide();

  assert.equal(didSync, true);
  assert.equal(context.currentSlideIndex, 4);
  assert.equal(calls[0][0], 'syncStudioActiveSlideView');
  assert.equal(calls[0][1], iframeDoc);
  assert.equal(calls[1][0], 'updateCurrentPresentationSessionState');
  assert.equal(calls[1][1].slideIndex, 4);
  assert.deepEqual(calls[2], ['updateInsertionActionState', iframeDoc]);
  assert.deepEqual(calls[3], ['updateZoomActionState', iframeDoc]);
  assert.deepEqual(calls[4], ['updateWallpaperActionState', iframeDoc]);
  assert.equal(calls[5][0], 'deselectElement');
  assert.equal(calls[6][0], 'updateLayersList');
});

test('syncStudioChromeToActiveSlide preserves selection by refreshing the layer list when requested', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncStudioChromeToActiveSlideSource = extractFunctionSource(
    fileContent,
    'function syncStudioChromeToActiveSlide(doc = getIframeDoc(), options = {}) {',
    '\n\n    function bindDeckNavigationSync(doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    currentSlideIndex: 0,
    deselectElement() {
      calls.push(['deselectElement']);
    },
    document: {
      getElementById(id) {
        if (id === 'slideCountLabel') {
          return { textContent: '' };
        }
        if (id === 'wallpaperCustomColor') {
          return null;
        }
        return null;
      }
    },
    getEditorSlideId() {
      return 'slide-2';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlides() {
      return [];
    },
    getActiveSlide() {
      return null;
    },
    preserveSelectionOnNextActiveSlideSync: true,
    pruneEditorChromeNodes() {},
    updateInsertionActionState(doc) {
      calls.push(['updateInsertionActionState', doc]);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    },
    updateWallpaperActionState(doc) {
      calls.push(['updateWallpaperActionState', doc]);
    },
    updateZoomActionState(doc) {
      calls.push(['updateZoomActionState', doc]);
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    SlideNextStudioDeckView: {
      syncStudioActiveSlideView(doc, options) {
        calls.push(['syncStudioActiveSlideView', doc]);
        options.setCurrentSlideIndex(1);
        options.setSlideCountLabel('2 / 3');
        return {
          didSync: true
        };
      }
    },
    updateActiveThumbnailCardState(activeSlideId) {
      calls.push(['updateActiveThumbnailCardState', activeSlideId]);
    },
    updateCurrentPresentationSessionState(nextState) {
      calls.push(['updateCurrentPresentationSessionState', nextState]);
      if (Object.prototype.hasOwnProperty.call(nextState, 'slideIndex')) {
        context.currentSlideIndex = nextState.slideIndex;
      }
    },
    updateIframeNavigationUI() {}
  };

  ensureSyncStudioChromeActionStateHelpers(context);
  vm.createContext(context);
  vm.runInContext(syncStudioChromeToActiveSlideSource, context);

  const didSync = context.syncStudioChromeToActiveSlide();

  assert.equal(didSync, true);
  assert.equal(context.currentSlideIndex, 1);
  assert.equal(calls.some(([name]) => name === 'deselectElement'), false);
  assert.equal(calls.some(([name]) => name === 'updateLayersList'), true);
});

test('syncStudioChromeToActiveSlide tolerates a missing slide count label while syncing the live frame', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncStudioChromeToActiveSlideSource = extractFunctionSource(
    fileContent,
    'function syncStudioChromeToActiveSlide(doc = getIframeDoc(), options = {}) {',
    '\n\n    function bindDeckNavigationSync(doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    currentSlideIndex: 1,
    deselectElement() {
      calls.push(['deselectElement']);
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'slideCountLabel') {
          return null;
        }
        return null;
      }
    },
    getEditorSlideId() {
      return 'slide-4';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlides() {
      return [];
    },
    getActiveSlide() {
      return null;
    },
    preserveSelectionOnNextActiveSlideSync: false,
    pruneEditorChromeNodes() {},
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    SlideNextStudioDeckView: {
      syncStudioActiveSlideView(doc, options) {
        calls.push(['syncStudioActiveSlideView', doc]);
        options.setCurrentSlideIndex(4);
        options.setSlideCountLabel('5 / 8');
        return {
          didSync: true
        };
      }
    },
    updateActiveThumbnailCardState() {
      calls.push(['updateActiveThumbnailCardState']);
    },
    updateCurrentPresentationSessionState(nextState) {
      calls.push(['updateCurrentPresentationSessionState', nextState]);
      if (Object.prototype.hasOwnProperty.call(nextState, 'slideIndex')) {
        context.currentSlideIndex = nextState.slideIndex;
      }
    },
    updateIframeNavigationUI() {}
  };

  ensureSyncStudioChromeActionStateHelpers(context);
  vm.createContext(context);
  vm.runInContext(syncStudioChromeToActiveSlideSource, context);

  assert.doesNotThrow(() => context.syncStudioChromeToActiveSlide());
  assert.equal(context.currentSlideIndex, 4);
  assert.ok(calls.some(([name]) => name === 'syncStudioActiveSlideView'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'slideCountLabel'));
  assert.ok(calls.some(([name]) => name === 'updateCurrentPresentationSessionState'));
});

test('syncStudioChromeToActiveSlide syncs the solid wallpaper picker from the active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncStudioChromeToActiveSlideSource = extractFunctionSource(
    fileContent,
    'function syncStudioChromeToActiveSlide(doc = getIframeDoc(), options = {}) {',
    '\n\n    function bindDeckNavigationSync(doc = getIframeDoc()) {'
  );

  const slideCountLabel = { textContent: '' };
  const wallpaperCustomColor = { value: '#000000' };
  const elements = {
    wpTabSolid: { className: 'solid-idle' },
    wpTabPresets: { className: 'presets-idle' },
    wpTabCustom: { className: 'custom-idle' },
    wpPanelSolid: { classList: createClassList(['hidden']) },
    wpPanelPresets: { classList: createClassList(['hidden']) },
    wpPanelCustom: { classList: createClassList([]) }
  };
  const iframeDoc = { label: 'iframe-doc' };
  const activeSlide = {
    style: {
      background: 'rgb(17, 34, 51)',
      backgroundColor: 'rgb(17, 34, 51)',
      backgroundImage: 'none'
    }
  };
  const context = {
    currentSlideIndex: 1,
    deselectElement() {},
    document: {
      getElementById(id) {
        if (id === 'slideCountLabel') {
          return slideCountLabel;
        }
        if (id === 'wallpaperCustomColor') {
          return wallpaperCustomColor;
        }
        return elements[id] || null;
      }
    },
    getActiveSlide(doc) {
      assert.equal(doc, iframeDoc);
      return activeSlide;
    },
    getEditorSlideId() {
      return 'slide-4';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlides() {
      return [];
    },
    wallpaperTab: 'custom',
    preserveSelectionOnNextActiveSlideSync: false,
    pruneEditorChromeNodes() {},
    rgbToHex(value) {
      assert.equal(value, 'rgb(17, 34, 51)');
      return '#112233';
    },
    saveHistoryState() {},
    SlideNextStudioDeckView: {
      syncStudioActiveSlideView(doc, options) {
        assert.equal(doc, iframeDoc);
        options.setCurrentSlideIndex(4);
        options.setSlideCountLabel('5 / 8');
        return {
          didSync: true
        };
      }
    },
    updateActiveThumbnailCardState() {},
    updateCurrentPresentationSessionState(nextState) {
      if (Object.prototype.hasOwnProperty.call(nextState, 'slideIndex')) {
        context.currentSlideIndex = nextState.slideIndex;
      }
    },
    updateIframeNavigationUI() {}
  };

  ensureSyncStudioChromeActionStateHelpers(context);
  vm.createContext(context);
  vm.runInContext(syncStudioChromeToActiveSlideSource, context);

  assert.equal(context.syncStudioChromeToActiveSlide(), true);
  assert.equal(context.wallpaperTab, 'solid');
  assert.equal(wallpaperCustomColor.value, '#112233');
  assert.equal(elements.wpPanelSolid.classList.contains('hidden'), false);
  assert.equal(elements.wpPanelPresets.classList.contains('hidden'), true);
  assert.equal(elements.wpPanelCustom.classList.contains('hidden'), true);
  assert.match(elements.wpTabSolid.className, /bg-white\/5/);
  assert.match(elements.wpTabCustom.className, /text-zinc-400/);
  assert.equal(slideCountLabel.textContent, '5 / 8');
});

test('syncStudioChromeToActiveSlide tolerates a missing solid wallpaper picker while syncing the live frame', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncStudioChromeToActiveSlideSource = extractFunctionSource(
    fileContent,
    'function syncStudioChromeToActiveSlide(doc = getIframeDoc(), options = {}) {',
    '\n\n    function bindDeckNavigationSync(doc = getIframeDoc()) {'
  );

  const slideCountLabel = { textContent: '' };
  const iframeDoc = { label: 'iframe-doc' };
  const activeSlide = {
    style: {
      background: 'rgb(17, 34, 51)',
      backgroundColor: 'rgb(17, 34, 51)',
      backgroundImage: 'none'
    }
  };
  const context = {
    currentSlideIndex: 1,
    deselectElement() {},
    document: {
      getElementById(id) {
        if (id === 'slideCountLabel') {
          return slideCountLabel;
        }
        if (id === 'wallpaperCustomColor') {
          return null;
        }
        return null;
      }
    },
    getActiveSlide(doc) {
      assert.equal(doc, iframeDoc);
      return activeSlide;
    },
    getEditorSlideId() {
      return 'slide-4';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlides() {
      return [];
    },
    preserveSelectionOnNextActiveSlideSync: false,
    pruneEditorChromeNodes() {},
    rgbToHex() {
      throw new Error('rgbToHex should not run when the wallpaper picker is missing');
    },
    saveHistoryState() {},
    SlideNextStudioDeckView: {
      syncStudioActiveSlideView(doc, options) {
        assert.equal(doc, iframeDoc);
        options.setCurrentSlideIndex(4);
        options.setSlideCountLabel('5 / 8');
        return {
          didSync: true
        };
      }
    },
    updateActiveThumbnailCardState() {},
    updateCurrentPresentationSessionState(nextState) {
      if (Object.prototype.hasOwnProperty.call(nextState, 'slideIndex')) {
        context.currentSlideIndex = nextState.slideIndex;
      }
    },
    updateIframeNavigationUI() {}
  };

  ensureSyncStudioChromeActionStateHelpers(context);
  vm.createContext(context);
  vm.runInContext(syncStudioChromeToActiveSlideSource, context);

  assert.doesNotThrow(() => context.syncStudioChromeToActiveSlide());
  assert.equal(context.currentSlideIndex, 4);
  assert.equal(slideCountLabel.textContent, '5 / 8');
});

function createClassList(initialValues = []) {
  const values = new Set(initialValues);
  return {
    add(...nextValues) {
      nextValues.forEach((value) => values.add(value));
    },
    remove(...nextValues) {
      nextValues.forEach((value) => values.delete(value));
    },
    contains(value) {
      return values.has(value);
    }
  };
}

test('syncStudioChromeToActiveSlide syncs custom gradient controls from the active slide background', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncStudioChromeToActiveSlideSource = extractFunctionSource(
    fileContent,
    'function syncStudioChromeToActiveSlide(doc = getIframeDoc(), options = {}) {',
    '\n\n    function bindDeckNavigationSync(doc = getIframeDoc()) {'
  );

  const slideCountLabel = { textContent: '' };
  const wallpaperCustomColor = { value: '#000000' };
  const elements = {
    wpTabSolid: { className: 'stale-solid' },
    wpTabPresets: { className: 'stale-presets' },
    wpTabCustom: { className: 'stale-custom' },
    wpPanelSolid: { classList: createClassList([]) },
    wpPanelPresets: { classList: createClassList(['hidden']) },
    wpPanelCustom: { classList: createClassList(['hidden']) },
    cgLinearBtn: { className: 'linear-idle' },
    cgRadialBtn: { className: 'radial-idle' },
    cgAngleGroup: { classList: createClassList(['hidden']) },
    cgColor1: { value: '#5050e8' },
    cgColor2: { value: '#050505' },
    cgAngle: { value: '135' },
    cgAngleVal: { textContent: '135°' }
  };
  const iframeDoc = { label: 'iframe-doc' };
  const activeSlide = {
    style: {
      background: 'linear-gradient(210deg, rgb(17, 34, 51) 0%, rgb(68, 85, 102) 100%)',
      backgroundColor: '',
      backgroundImage: 'linear-gradient(210deg, rgb(17, 34, 51) 0%, rgb(68, 85, 102) 100%)'
    }
  };
  const rgbToHexCalls = [];
  const context = {
    currentSlideIndex: 1,
    customGradientType: 'radial',
    deselectElement() {},
    document: {
      getElementById(id) {
        if (id === 'slideCountLabel') {
          return slideCountLabel;
        }
        if (id === 'wallpaperCustomColor') {
          return wallpaperCustomColor;
        }
        return elements[id] || null;
      }
    },
    getActiveSlide(doc) {
      assert.equal(doc, iframeDoc);
      return activeSlide;
    },
    getEditorSlideId() {
      return 'slide-4';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlides() {
      return [];
    },
    wallpaperTab: 'solid',
    preserveSelectionOnNextActiveSlideSync: false,
    pruneEditorChromeNodes() {},
    rgbToHex(value) {
      rgbToHexCalls.push(value);
      if (value === 'rgb(17, 34, 51)') {
        return '#112233';
      }
      if (value === 'rgb(68, 85, 102)') {
        return '#445566';
      }
      throw new Error(`Unexpected color: ${value}`);
    },
    saveHistoryState() {},
    SlideNextStudioDeckView: {
      syncStudioActiveSlideView(doc, options) {
        assert.equal(doc, iframeDoc);
        options.setCurrentSlideIndex(4);
        options.setSlideCountLabel('5 / 8');
        return {
          didSync: true
        };
      }
    },
    updateActiveThumbnailCardState() {},
    updateCurrentPresentationSessionState(nextState) {
      if (Object.prototype.hasOwnProperty.call(nextState, 'slideIndex')) {
        context.currentSlideIndex = nextState.slideIndex;
      }
    },
    updateIframeNavigationUI() {}
  };

  ensureSyncStudioChromeActionStateHelpers(context);
  vm.createContext(context);
  vm.runInContext(syncStudioChromeToActiveSlideSource, context);

  assert.equal(context.syncStudioChromeToActiveSlide(), true);
  assert.deepEqual(rgbToHexCalls, ['rgb(17, 34, 51)', 'rgb(68, 85, 102)']);
  assert.equal(context.wallpaperTab, 'custom');
  assert.equal(context.customGradientType, 'linear');
  assert.equal(elements.wpPanelSolid.classList.contains('hidden'), true);
  assert.equal(elements.wpPanelPresets.classList.contains('hidden'), true);
  assert.equal(elements.wpPanelCustom.classList.contains('hidden'), false);
  assert.match(elements.wpTabSolid.className, /text-zinc-400/);
  assert.match(elements.wpTabCustom.className, /bg-white\/5/);
  assert.equal(elements.cgColor1.value, '#112233');
  assert.equal(elements.cgColor2.value, '#445566');
  assert.equal(elements.cgAngle.value, '210');
  assert.equal(elements.cgAngleVal.textContent, '210°');
  assert.equal(elements.cgAngleGroup.classList.contains('hidden'), false);
  assert.match(elements.cgLinearBtn.className, /text-\[#7028d0\]/);
  assert.match(elements.cgRadialBtn.className, /text-zinc-400/);
  assert.equal(wallpaperCustomColor.value, '#000000');
  assert.equal(slideCountLabel.textContent, '5 / 8');
});

test('syncStudioChromeToActiveSlide syncs radial gradient controls from the active slide background', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncStudioChromeToActiveSlideSource = extractFunctionSource(
    fileContent,
    'function syncStudioChromeToActiveSlide(doc = getIframeDoc(), options = {}) {',
    '\n\n    function bindDeckNavigationSync(doc = getIframeDoc()) {'
  );

  const slideCountLabel = { textContent: '' };
  const elements = {
    wpTabSolid: { className: 'stale-solid' },
    wpTabPresets: { className: 'stale-presets' },
    wpTabCustom: { className: 'stale-custom' },
    wpPanelSolid: { classList: createClassList([]) },
    wpPanelPresets: { classList: createClassList(['hidden']) },
    wpPanelCustom: { classList: createClassList(['hidden']) },
    cgLinearBtn: { className: 'linear-idle' },
    cgRadialBtn: { className: 'radial-idle' },
    cgAngleGroup: { classList: createClassList([]) },
    cgColor1: { value: '#5050e8' },
    cgColor2: { value: '#050505' },
    cgAngle: { value: '135' },
    cgAngleVal: { textContent: '135°' }
  };
  const iframeDoc = { label: 'iframe-doc' };
  const activeSlide = {
    style: {
      background: 'radial-gradient(circle, rgb(17, 34, 51) 0%, rgb(68, 85, 102) 85%)',
      backgroundColor: '',
      backgroundImage: 'radial-gradient(circle, rgb(17, 34, 51) 0%, rgb(68, 85, 102) 85%)'
    }
  };
  const rgbToHexCalls = [];
  const context = {
    currentSlideIndex: 1,
    customGradientType: 'linear',
    deselectElement() {},
    document: {
      getElementById(id) {
        if (id === 'slideCountLabel') {
          return slideCountLabel;
        }
        if (id === 'wallpaperCustomColor') {
          return null;
        }
        return elements[id] || null;
      }
    },
    getActiveSlide(doc) {
      assert.equal(doc, iframeDoc);
      return activeSlide;
    },
    getEditorSlideId() {
      return 'slide-4';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlides() {
      return [];
    },
    wallpaperTab: 'solid',
    preserveSelectionOnNextActiveSlideSync: false,
    pruneEditorChromeNodes() {},
    rgbToHex(value) {
      rgbToHexCalls.push(value);
      if (value === 'rgb(17, 34, 51)') {
        return '#112233';
      }
      if (value === 'rgb(68, 85, 102)') {
        return '#445566';
      }
      throw new Error(`Unexpected color: ${value}`);
    },
    saveHistoryState() {},
    SlideNextStudioDeckView: {
      syncStudioActiveSlideView(doc, options) {
        assert.equal(doc, iframeDoc);
        options.setCurrentSlideIndex(4);
        options.setSlideCountLabel('5 / 8');
        return {
          didSync: true
        };
      }
    },
    updateActiveThumbnailCardState() {},
    updateCurrentPresentationSessionState(nextState) {
      if (Object.prototype.hasOwnProperty.call(nextState, 'slideIndex')) {
        context.currentSlideIndex = nextState.slideIndex;
      }
    },
    updateIframeNavigationUI() {}
  };

  ensureSyncStudioChromeActionStateHelpers(context);
  vm.createContext(context);
  vm.runInContext(syncStudioChromeToActiveSlideSource, context);

  assert.equal(context.syncStudioChromeToActiveSlide(), true);
  assert.deepEqual(rgbToHexCalls, ['rgb(17, 34, 51)', 'rgb(68, 85, 102)']);
  assert.equal(context.wallpaperTab, 'custom');
  assert.equal(context.customGradientType, 'radial');
  assert.equal(elements.wpPanelSolid.classList.contains('hidden'), true);
  assert.equal(elements.wpPanelPresets.classList.contains('hidden'), true);
  assert.equal(elements.wpPanelCustom.classList.contains('hidden'), false);
  assert.match(elements.wpTabSolid.className, /text-zinc-400/);
  assert.match(elements.wpTabCustom.className, /bg-white\/5/);
  assert.equal(elements.cgColor1.value, '#112233');
  assert.equal(elements.cgColor2.value, '#445566');
  assert.equal(elements.cgAngle.value, '135');
  assert.equal(elements.cgAngleVal.textContent, '135°');
  assert.equal(elements.cgAngleGroup.classList.contains('hidden'), true);
  assert.match(elements.cgLinearBtn.className, /text-zinc-400/);
  assert.match(elements.cgRadialBtn.className, /text-\[#7028d0\]/);
  assert.equal(slideCountLabel.textContent, '5 / 8');
});

test('syncStudioChromeToActiveSlide routes uneditable gradients to the wallpaper themes tab', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncStudioChromeToActiveSlideSource = extractFunctionSource(
    fileContent,
    'function syncStudioChromeToActiveSlide(doc = getIframeDoc(), options = {}) {',
    '\n\n    function bindDeckNavigationSync(doc = getIframeDoc()) {'
  );

  const slideCountLabel = { textContent: '' };
  const elements = {
    wpTabSolid: { className: 'stale-solid' },
    wpTabPresets: { className: 'stale-presets' },
    wpTabCustom: { className: 'stale-custom' },
    wpPanelSolid: { classList: createClassList([]) },
    wpPanelPresets: { classList: createClassList(['hidden']) },
    wpPanelCustom: { classList: createClassList(['hidden']) },
    cgLinearBtn: { className: 'linear-idle' },
    cgRadialBtn: { className: 'radial-idle' },
    cgAngleGroup: { classList: createClassList(['hidden']) },
    cgColor1: { value: '#5050e8' },
    cgColor2: { value: '#050505' },
    cgAngle: { value: '135' },
    cgAngleVal: { textContent: '135°' }
  };
  const iframeDoc = { label: 'iframe-doc' };
  const activeSlide = {
    style: {
      background: 'linear-gradient(135deg, #0b0f19 0%, #111827 50%, #050505 100%)',
      backgroundColor: '',
      backgroundImage: 'linear-gradient(135deg, #0b0f19 0%, #111827 50%, #050505 100%)'
    }
  };
  const context = {
    currentSlideIndex: 1,
    customGradientType: 'linear',
    deselectElement() {},
    document: {
      getElementById(id) {
        if (id === 'slideCountLabel') {
          return slideCountLabel;
        }
        if (id === 'wallpaperCustomColor') {
          return null;
        }
        return elements[id] || null;
      }
    },
    getActiveSlide(doc) {
      assert.equal(doc, iframeDoc);
      return activeSlide;
    },
    getEditorSlideId() {
      return 'slide-4';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlides() {
      return [];
    },
    wallpaperTab: 'solid',
    preserveSelectionOnNextActiveSlideSync: false,
    pruneEditorChromeNodes() {},
    rgbToHex() {
      throw new Error('rgbToHex should not run for uneditable gradients');
    },
    saveHistoryState() {},
    SlideNextStudioDeckView: {
      syncStudioActiveSlideView(doc, options) {
        assert.equal(doc, iframeDoc);
        options.setCurrentSlideIndex(4);
        options.setSlideCountLabel('5 / 8');
        return {
          didSync: true
        };
      }
    },
    updateActiveThumbnailCardState() {},
    updateCurrentPresentationSessionState(nextState) {
      if (Object.prototype.hasOwnProperty.call(nextState, 'slideIndex')) {
        context.currentSlideIndex = nextState.slideIndex;
      }
    },
    updateIframeNavigationUI() {}
  };

  ensureSyncStudioChromeActionStateHelpers(context);
  vm.createContext(context);
  vm.runInContext(syncStudioChromeToActiveSlideSource, context);

  assert.equal(context.syncStudioChromeToActiveSlide(), true);
  assert.equal(context.wallpaperTab, 'presets');
  assert.equal(elements.wpPanelSolid.classList.contains('hidden'), true);
  assert.equal(elements.wpPanelPresets.classList.contains('hidden'), false);
  assert.equal(elements.wpPanelCustom.classList.contains('hidden'), true);
  assert.match(elements.wpTabSolid.className, /text-zinc-400/);
  assert.match(elements.wpTabPresets.className, /bg-white\/5/);
  assert.match(elements.wpTabCustom.className, /text-zinc-400/);
  assert.equal(elements.cgColor1.value, '#5050e8');
  assert.equal(elements.cgColor2.value, '#050505');
  assert.equal(elements.cgAngle.value, '135');
  assert.equal(elements.cgAngleVal.textContent, '135°');
  assert.equal(slideCountLabel.textContent, '5 / 8');
});

test('syncStudioChromeToActiveSlide tolerates missing custom gradient controls while syncing the live frame', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncStudioChromeToActiveSlideSource = extractFunctionSource(
    fileContent,
    'function syncStudioChromeToActiveSlide(doc = getIframeDoc(), options = {}) {',
    '\n\n    function bindDeckNavigationSync(doc = getIframeDoc()) {'
  );

  const slideCountLabel = { textContent: '' };
  const iframeDoc = { label: 'iframe-doc' };
  const activeSlide = {
    style: {
      background: 'linear-gradient(210deg, #112233 0%, #445566 100%)',
      backgroundColor: '',
      backgroundImage: 'linear-gradient(210deg, #112233 0%, #445566 100%)'
    }
  };
  const context = {
    currentSlideIndex: 1,
    customGradientType: 'radial',
    deselectElement() {},
    document: {
      getElementById(id) {
        if (id === 'slideCountLabel') {
          return slideCountLabel;
        }
        if (id === 'wallpaperCustomColor') {
          return null;
        }
        return null;
      }
    },
    getActiveSlide(doc) {
      assert.equal(doc, iframeDoc);
      return activeSlide;
    },
    getEditorSlideId() {
      return 'slide-4';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlides() {
      return [];
    },
    preserveSelectionOnNextActiveSlideSync: false,
    pruneEditorChromeNodes() {},
    rgbToHex() {
      throw new Error('rgbToHex should not run when custom gradient controls are missing');
    },
    saveHistoryState() {},
    SlideNextStudioDeckView: {
      syncStudioActiveSlideView(doc, options) {
        assert.equal(doc, iframeDoc);
        options.setCurrentSlideIndex(4);
        options.setSlideCountLabel('5 / 8');
        return {
          didSync: true
        };
      }
    },
    updateActiveThumbnailCardState() {},
    updateCurrentPresentationSessionState(nextState) {
      if (Object.prototype.hasOwnProperty.call(nextState, 'slideIndex')) {
        context.currentSlideIndex = nextState.slideIndex;
      }
    },
    updateIframeNavigationUI() {}
  };

  ensureSyncStudioChromeActionStateHelpers(context);
  vm.createContext(context);
  vm.runInContext(syncStudioChromeToActiveSlideSource, context);

  assert.doesNotThrow(() => context.syncStudioChromeToActiveSlide());
  assert.equal(context.currentSlideIndex, 4);
  assert.equal(context.customGradientType, 'radial');
  assert.equal(slideCountLabel.textContent, '5 / 8');
});

test('syncStudioChromeToActiveSlide falls back to canonical snapshot state when the iframe document is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncStudioChromeToActiveSlideSource = extractFunctionSource(
    fileContent,
    'function syncStudioChromeToActiveSlide(doc = getIframeDoc(), options = {}) {',
    '\n\n    function bindDeckNavigationSync(doc = getIframeDoc()) {'
  );

  const slideCountLabel = { textContent: '' };
  const calls = [];
  const context = {
    buildEditorDeckSnapshot(doc) {
      calls.push(['buildEditorDeckSnapshot', doc]);
      return {
        activeSlideId: 'slide-3',
        activeSlideIndex: 2,
        slides: [
          { id: 'slide-1' },
          { id: 'slide-2' },
          { id: 'slide-3' },
          { id: 'slide-4' }
        ]
      };
    },
    currentSlideIndex: 0,
    deselectElement() {
      calls.push(['deselectElement']);
      context.updateLayersList();
    },
    document: {
      getElementById(id) {
        assert.equal(id, 'slideCountLabel');
        return slideCountLabel;
      }
    },
    getIframeDoc() {
      return null;
    },
    preserveSelectionOnNextActiveSlideSync: false,
    updateInsertionActionState(doc) {
      calls.push(['updateInsertionActionState', doc]);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    },
    updateWallpaperActionState(doc) {
      calls.push(['updateWallpaperActionState', doc]);
    },
    updateZoomActionState(doc) {
      calls.push(['updateZoomActionState', doc]);
    },
    saveHistoryState(debounce) {
      calls.push(['saveHistoryState', debounce]);
    },
    SlideNextStudioDeckSnapshot: {
      resolveStudioActiveSlideIndex(deckSnapshot, fallbackIndex) {
        calls.push(['resolveStudioActiveSlideIndex', deckSnapshot, fallbackIndex]);
        return deckSnapshot.activeSlideIndex;
      }
    },
    SlideNextStudioDeckView: {
      syncStudioActiveSlideView() {
        throw new Error('syncStudioActiveSlideView should not run without a live iframe document');
      }
    },
    updateActiveThumbnailCardState(activeSlideId) {
      calls.push(['updateActiveThumbnailCardState', activeSlideId]);
    },
    updateCurrentPresentationSessionState(nextState) {
      calls.push(['updateCurrentPresentationSessionState', nextState]);
      if (Object.prototype.hasOwnProperty.call(nextState, 'slideIndex')) {
        context.currentSlideIndex = nextState.slideIndex;
      }
    }
  };

  ensureSyncStudioChromeActionStateHelpers(context);
  vm.createContext(context);
  vm.runInContext(syncStudioChromeToActiveSlideSource, context);

  const didSync = context.syncStudioChromeToActiveSlide(null, { captureHistory: true });

  assert.equal(didSync, true);
  assert.equal(context.currentSlideIndex, 2);
  assert.equal(slideCountLabel.textContent, '3 / 4');
  assert.equal(calls.length, 10);
  assert.equal(calls[0][0], 'buildEditorDeckSnapshot');
  assert.equal(calls[0][1], null);
  assert.equal(calls[1][0], 'resolveStudioActiveSlideIndex');
  assert.equal(calls[1][1].activeSlideId, 'slide-3');
  assert.equal(calls[1][1].activeSlideIndex, 2);
  assert.equal(calls[1][1].slides.length, 4);
  assert.equal(calls[1][2], 0);
  assert.equal(calls[2][0], 'updateCurrentPresentationSessionState');
  assert.equal(calls[2][1].slideIndex, 2);
  assert.equal(calls[3][0], 'updateActiveThumbnailCardState');
  assert.equal(calls[3][1], 'slide-3');
  assert.deepEqual(calls[4], ['updateInsertionActionState', null]);
  assert.deepEqual(calls[5], ['updateZoomActionState', null]);
  assert.deepEqual(calls[6], ['updateWallpaperActionState', null]);
  assert.equal(calls[7][0], 'deselectElement');
  assert.equal(calls[8][0], 'updateLayersList');
  assert.equal(calls[9][0], 'saveHistoryState');
  assert.equal(calls[9][1], false);
});

test('syncStudioChromeToActiveSlide falls back to canonical snapshot state when the live iframe has no explicit active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncStudioChromeToActiveSlideSource = extractFunctionSource(
    fileContent,
    'function syncStudioChromeToActiveSlide(doc = getIframeDoc(), options = {}) {',
    '\n\n    function bindDeckNavigationSync(doc = getIframeDoc()) {'
  );

  const slideCountLabel = { textContent: '' };
  const iframeDoc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    buildEditorDeckSnapshot(doc) {
      calls.push(['buildEditorDeckSnapshot', doc]);
      return {
        activeSlideId: 'slide-3',
        activeSlideIndex: 2,
        slides: [
          { id: 'slide-1' },
          { id: 'slide-2' },
          { id: 'slide-3' },
          { id: 'slide-4' }
        ]
      };
    },
    currentSlideIndex: 0,
    deselectElement() {
      calls.push(['deselectElement']);
    },
    document: {
      getElementById(id) {
        assert.equal(id, 'slideCountLabel');
        return slideCountLabel;
      }
    },
    getEditorSlideId() {
      return 'slide-4';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlides() {
      return [];
    },
    preserveSelectionOnNextActiveSlideSync: false,
    pruneEditorChromeNodes() {},
    saveHistoryState(debounce) {
      calls.push(['saveHistoryState', debounce]);
    },
    SlideNextStudioDeckSnapshot: {
      resolveStudioActiveSlideIndex(deckSnapshot, fallbackIndex) {
        calls.push(['resolveStudioActiveSlideIndex', deckSnapshot, fallbackIndex]);
        return deckSnapshot.activeSlideIndex;
      }
    },
    SlideNextStudioDeckView: {
      syncStudioActiveSlideView(doc, options) {
        calls.push(['syncStudioActiveSlideView', doc, options]);
        return {
          didSync: false
        };
      }
    },
    updateActiveThumbnailCardState(activeSlideId) {
      calls.push(['updateActiveThumbnailCardState', activeSlideId]);
    },
    updateCurrentPresentationSessionState(nextState) {
      calls.push(['updateCurrentPresentationSessionState', nextState]);
      if (Object.prototype.hasOwnProperty.call(nextState, 'slideIndex')) {
        context.currentSlideIndex = nextState.slideIndex;
      }
    },
    updateIframeNavigationUI() {}
  };

  ensureSyncStudioChromeActionStateHelpers(context);
  vm.createContext(context);
  vm.runInContext(syncStudioChromeToActiveSlideSource, context);

  const didSync = context.syncStudioChromeToActiveSlide(iframeDoc, { captureHistory: true });

  assert.equal(didSync, true);
  assert.equal(context.currentSlideIndex, 2);
  assert.equal(slideCountLabel.textContent, '3 / 4');
  assert.equal(calls[0][0], 'syncStudioActiveSlideView');
  assert.equal(calls[0][1], iframeDoc);
  assert.equal(calls[1][0], 'buildEditorDeckSnapshot');
  assert.equal(calls[1][1], iframeDoc);
  assert.equal(calls[2][0], 'resolveStudioActiveSlideIndex');
  assert.equal(calls[2][1].activeSlideId, 'slide-3');
  assert.equal(calls[2][2], 0);
  assert.equal(calls[3][0], 'updateCurrentPresentationSessionState');
  assert.equal(calls[3][1].slideIndex, 2);
  assert.equal(calls[4][0], 'updateActiveThumbnailCardState');
  assert.equal(calls[4][1], 'slide-3');
  assert.equal(calls[5][0], 'deselectElement');
  assert.equal(calls[6][0], 'saveHistoryState');
  assert.equal(calls[6][1], false);
});

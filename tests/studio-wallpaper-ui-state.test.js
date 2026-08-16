const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const wallpaperView = require('../shared/studio-editor-wallpaper-view.js');
const wallpaperAccessors = require('../shared/studio-editor-wallpaper-accessors.js');
const wallpaperGradientActions = require('../shared/studio-editor-wallpaper-gradient-actions.js');
const wallpaperTransactionActions = require('../shared/studio-editor-wallpaper-transaction-actions.js');
const deckView = require('../shared/studio-deck-view.js');
const wallpaperToolbarState = require('../shared/studio-editor-wallpaper-toolbar-state.js');
const wallpaperToolbarStateRuntimeAccessors = require('../shared/studio-editor-wallpaper-toolbar-state-runtime-accessors.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const canonicalSlide = require('../shared/studio-editor-canonical-slide.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const effectiveEndMarker = endMarker === '\n\n    function setCustomGradientType(type) {'
    ? '\n\n    function applyThemeTokenPreset(presetId) {'
    : endMarker;
  const end = fileContent.indexOf(effectiveEndMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${effectiveEndMarker}`);
  return fileContent.slice(start, end);
}

function installWallpaperStateAccessors(context) {
  context.setStudioWallpaperTab = (nextValue) => {
    context.wallpaperTab = nextValue;
    return nextValue;
  };
  context.setStudioCustomGradientType = (nextValue) => {
    context.customGradientType = nextValue;
    return nextValue;
  };
  context.getStudioCustomGradientType = () => context.customGradientType;
}

function createWallpaperGradientActions(context) {
  return wallpaperGradientActions.createStudioEditorWallpaperGradientActions({
    resolveActionState: context.resolveCurrentStudioWallpaperActionState,
    getDocument: () => context.document,
    getWallpaperView: () => context.SlideNextStudioEditorWallpaperView,
    getCustomGradientType: () => context.customGradientType,
    setCustomGradientType: (nextValue) => {
      context.customGradientType = nextValue;
      return nextValue;
    },
    applyPresetWallpaper: (...args) => context.applyPresetWallpaper(...args)
  });
}

function loadWallpaperRollbackHelper(fileContent, context) {
  const actions = wallpaperTransactionActions.createStudioEditorWallpaperTransactionActions({
    transactionApi: context.SlideNextStudioEditorTransaction,
    getIframeDocument: context.getIframeDoc,
    getSlideById: context.getSlideById,
    getElementByEditorId: context.getElementByEditorId
  });
  context.rollbackEditorWallpaperMutation = actions.rollbackEditorWallpaperMutation;
}

function createControls() {
  return {
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
      buttons: [{ disabled: true }, { disabled: true }],
      querySelectorAll(selector) {
        return selector === 'button' ? this.buttons : [];
      }
    },
    wallpaperGradientsList: {
      buttons: [{ disabled: true }, { disabled: true }],
      querySelectorAll(selector) {
        return selector === 'button' ? this.buttons : [];
      }
    }
  };
}

function getWallpaperStates(controls) {
  return {
    wpTabSolid: controls.wpTabSolid.disabled,
    wpTabPresets: controls.wpTabPresets.disabled,
    wpTabCustom: controls.wpTabCustom.disabled,
    wallpaperCustomColor: controls.wallpaperCustomColor.disabled,
    cgLinearBtn: controls.cgLinearBtn.disabled,
    cgRadialBtn: controls.cgRadialBtn.disabled,
    cgColor1: controls.cgColor1.disabled,
    cgColor2: controls.cgColor2.disabled,
    cgAngle: controls.cgAngle.disabled,
    applyWallpaperToAllSlidesBtn: controls.applyWallpaperToAllSlidesBtn.disabled,
    solidButtons: controls.wallpaperSolidsList.buttons.map((button) => button.disabled),
    gradientButtons: controls.wallpaperGradientsList.buttons.map((button) => button.disabled)
  };
}

function loadResolveCurrentStudioWallpaperActionState(fileContent, context) {
  context.SlideNextStudioEditorCanonicalSlide ??= canonicalSlide;
  const canonicalUiSource = fs.readFileSync(
    path.join(__dirname, '..', 'shared', 'studio-editor-canonical-ui.js'),
    'utf8'
  );
  const canonicalUiResolverSource = extractFunctionSource(
    fileContent,
    'function resolveEditorUiCanonicalDeck(doc = getIframeDoc()) {',
    '\n\n    function buildEditorMutationCanonicalDeck'
  );
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioWallpaperActionState(doc = getIframeDoc()) {',
    '\n\n    function updateWallpaperActionState(doc = getIframeDoc()) {'
  );
  if (typeof context.SlideNextStudioDeckView === 'undefined') {
    context.SlideNextStudioDeckView = deckView;
  }
  vm.runInContext(`${canonicalUiSource}\n${canonicalUiResolverSource}\n${helperSource}`, context);
}

test('resolveCurrentStudioWallpaperActionState reports wallpaper readiness from the live active slide state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  loadResolveCurrentStudioWallpaperActionState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveCurrentStudioWallpaperActionState(null))),
    {
      activeSlide: null,
      canUseWallpaperControls: false
    }
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveCurrentStudioWallpaperActionState({
      activeSlide: { id: 'slide-1' }
    }))),
    {
      activeSlide: { id: 'slide-1' },
      canUseWallpaperControls: true
    }
  );
});

test('renderWallpaperPresets binds generated preset actions through the shared wallpaper view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const applyPresetWallpaper = () => {};
  const context = {
    SlideNextStudioEditorWallpaperView: {
      renderStudioWallpaperPresets(options) {
        calls.push(['render', options]);
        return true;
      },
      bindStudioWallpaperPresetActions(options) {
        calls.push(['bind', options]);
        return true;
      }
    },
    document: {},
    wallpaperPresetsData: {},
    applyPresetWallpaper
  };
  const source = extractFunctionSource(
    fileContent,
    'function renderWallpaperPresets() {',
    '\n\n    function renderThemeTokenPresets() {'
  );
  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.renderWallpaperPresets(), true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], 'render');
  assert.equal(calls[1][0], 'bind');
  assert.equal(calls[1][1].applyPresetWallpaper, applyPresetWallpaper);
});

test('wallpaper accessors gate tab changes and persist state after the view applies them', () => {
  const calls = [];
  const documentRef = { id: 'editor-document' };
  const accessors = wallpaperAccessors.createStudioEditorWallpaperAccessors({
    resolveActionState() {
      calls.push(['state']);
      return { canUseWallpaperControls: true };
    },
    getDocument() {
      return documentRef;
    },
    getWallpaperView() {
      return {
        setStudioWallpaperTab(options) {
          calls.push(['view', options]);
          return true;
        }
      };
    },
    setWallpaperTabState(tab) {
      calls.push(['persist', tab]);
    }
  });

  assert.equal(accessors.setWallpaperTab('custom'), true);
  assert.deepEqual(calls, [
    ['state'],
    ['view', { documentRef, tab: 'custom' }],
    ['persist', 'custom']
  ]);
});

test('wallpaper accessors do not touch the view when wallpaper controls are unavailable', () => {
  let viewCalls = 0;
  const accessors = wallpaperAccessors.createStudioEditorWallpaperAccessors({
    resolveActionState: () => ({ canUseWallpaperControls: false }),
    getWallpaperView() {
      viewCalls += 1;
      return null;
    }
  });

  assert.equal(accessors.setWallpaperTab('custom'), false);
  assert.equal(viewCalls, 0);
});

test('wallpaper accessors render presets and bind the shared preset action', () => {
  const calls = [];
  const documentRef = { id: 'editor-document' };
  const applyPresetWallpaper = () => {};
  const presetData = { solids: ['#fff'], gradients: [] };
  const accessors = wallpaperAccessors.createStudioEditorWallpaperAccessors({
    getDocument: () => documentRef,
    getWallpaperView: () => ({
      renderStudioWallpaperPresets(options) {
        calls.push(['render', options]);
        return true;
      },
      bindStudioWallpaperPresetActions(options) {
        calls.push(['bind', options]);
      }
    }),
    getWallpaperPresetData: () => presetData,
    getApplyPresetWallpaper: () => applyPresetWallpaper
  });

  assert.equal(accessors.renderWallpaperPresets(), true);
  assert.deepEqual(calls, [
    ['render', { documentRef, presetData }],
    ['bind', { documentRef, applyPresetWallpaper }]
  ]);
});

test('wallpaper accessors delegate active-slide mutation orchestration to the shared controller', () => {
  const calls = [];
  const controllerResult = 'delegated-active-slide';
  const accessors = wallpaperAccessors.createStudioEditorWallpaperAccessors({
    getWallpaperController: () => ({
      applyStudioPresetWallpaper(options) {
        calls.push(options);
        return controllerResult;
      }
    }),
    getWallpaperView: () => ({ id: 'wallpaper-view' }),
    getIframeDocument: () => ({ id: 'iframe-document' }),
    applyMutation: () => {},
    getSlideId: () => 'slide-1',
    setPendingCustomWallpaperVersion: () => {},
    finalizeMutation: () => true,
    rollbackMutation: () => {}
  });

  assert.equal(accessors.applyPresetWallpaper('#fff', true), controllerResult);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].background, '#fff');
  assert.equal(calls[0].isCustomInput, true);
  assert.equal(calls[0].getIframeDocument().id, 'iframe-document');
  assert.equal(calls[0].wallpaperView.id, 'wallpaper-view');
});

test('wallpaper accessors return undefined when the shared mutation controller is unavailable', () => {
  const accessors = wallpaperAccessors.createStudioEditorWallpaperAccessors();

  assert.equal(accessors.applyPresetWallpaper('#fff'), undefined);
  assert.equal(accessors.applyWallpaperToAllSlides(), undefined);
});

test('resolveCurrentStudioWallpaperActionState reuses the shared deck-view wallpaper helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const doc = {
    activeSlide: { id: 'slide-1' }
  };
  const calls = [];
  const context = {
    SlideNextStudioDeckView: {
      resolveStudioWallpaperActionState(sourceDoc, options = {}) {
        calls.push({
          sourceDoc,
          hasGetActiveSlide: typeof options.getActiveSlide === 'function',
          activeSlideId: options.getActiveSlide(sourceDoc)?.id || ''
        });
        return {
          activeSlide: { id: 'slide-1' },
          canUseWallpaperControls: true
        };
      }
    },
    getActiveSlide(sourceDoc) {
      return sourceDoc && sourceDoc.activeSlide ? sourceDoc.activeSlide : null;
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  loadResolveCurrentStudioWallpaperActionState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveCurrentStudioWallpaperActionState(doc))),
    {
      activeSlide: { id: 'slide-1' },
      canUseWallpaperControls: true
    }
  );
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    sourceDoc: {
      activeSlide: { id: 'slide-1' }
    },
    hasGetActiveSlide: true,
    activeSlideId: 'slide-1'
  }]);
});

test('resolveCurrentStudioWallpaperActionState attaches the canonical active slide when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const doc = {
    activeSlide: { dataset: { slideId: 'slide-1' } }
  };
  const canonicalActiveSlide = {
    id: 'slide-1',
    layout: { background: { style: 'background: #112233;' } }
  };
  const context = {
    SlideNextStudioDeckView: deckView,
    getActiveSlide(sourceDoc) {
      return sourceDoc && sourceDoc.activeSlide ? sourceDoc.activeSlide : null;
    },
    getEditorSlideId(slide) {
      return slide && slide.dataset ? slide.dataset.slideId : '';
    },
    buildEditorCanonicalDeck(sourceDoc) {
      assert.equal(sourceDoc, doc);
      return { slides: [canonicalActiveSlide] };
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  loadResolveCurrentStudioWallpaperActionState(fileContent, context);

  const result = context.resolveCurrentStudioWallpaperActionState(doc);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    activeSlide: doc.activeSlide,
    canUseWallpaperControls: true,
    canonicalActiveSlide: canonicalSlide.findStudioCanonicalSlideById(
      { slides: [canonicalActiveSlide] },
      canonicalActiveSlide.id
    )
  });
});

test('resolveCurrentStudioWallpaperActionState prefers the live canonical deck before rebuilding the frame', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const doc = {
    activeSlide: { dataset: { slideId: 'slide-1' } }
  };
  const liveCanonicalActiveSlide = {
    id: 'slide-1',
    layout: { background: { style: 'background: #445566;' } }
  };
  let buildCalls = 0;
  const context = {
    SlideNextStudioDeckView: deckView,
    getActiveSlide(sourceDoc) {
      return sourceDoc && sourceDoc.activeSlide ? sourceDoc.activeSlide : null;
    },
    getEditorSlideId(slide) {
      return slide && slide.dataset ? slide.dataset.slideId : '';
    },
    getStudioEditorSessionToken() {
      return 43;
    },
    resolveEditorLiveCanonicalDeck(sourceDoc, sessionToken) {
      assert.equal(sourceDoc, doc);
      assert.equal(sessionToken, 43);
      return { slides: [liveCanonicalActiveSlide] };
    },
    buildEditorCanonicalDeck() {
      buildCalls += 1;
      throw new Error('DOM rebuild should not run when live wallpaper metadata is available');
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  loadResolveCurrentStudioWallpaperActionState(fileContent, context);

  const result = context.resolveCurrentStudioWallpaperActionState(doc);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    activeSlide: doc.activeSlide,
    canUseWallpaperControls: true,
    canonicalActiveSlide: canonicalSlide.findStudioCanonicalSlideById(
      { slides: [liveCanonicalActiveSlide] },
      liveCanonicalActiveSlide.id
    )
  });
  assert.equal(buildCalls, 0);
});

test('updateWallpaperActionState enables wallpaper controls only when the iframe has a live active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateWallpaperActionStateSource = extractFunctionSource(
    fileContent,
    'function updateWallpaperActionState(doc = getIframeDoc()) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const controls = createControls();
  const context = {
    document: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      return null;
    }
  };

  context.SlideNextStudioEditorWallpaperToolbarState = wallpaperToolbarState;
  context.SlideNextStudioEditorWallpaperToolbarStateRuntimeAccessors = wallpaperToolbarStateRuntimeAccessors;
  vm.createContext(context);
  loadResolveCurrentStudioWallpaperActionState(fileContent, context);
  vm.runInContext(updateWallpaperActionStateSource, context);

  context.updateWallpaperActionState(null);
  assert.deepEqual(getWallpaperStates(controls), {
    wpTabSolid: true,
    wpTabPresets: true,
    wpTabCustom: true,
    wallpaperCustomColor: true,
    cgLinearBtn: true,
    cgRadialBtn: true,
    cgColor1: true,
    cgColor2: true,
    cgAngle: true,
    applyWallpaperToAllSlidesBtn: true,
    solidButtons: [true, true],
    gradientButtons: [true, true]
  });

  context.updateWallpaperActionState({
    activeSlide: {},
    getElementById() {
      return null;
    }
  });
  assert.deepEqual(getWallpaperStates(controls), {
    wpTabSolid: false,
    wpTabPresets: false,
    wpTabCustom: false,
    wallpaperCustomColor: false,
    cgLinearBtn: false,
    cgRadialBtn: false,
    cgColor1: false,
    cgColor2: false,
    cgAngle: false,
    applyWallpaperToAllSlidesBtn: false,
    solidButtons: [false, false],
    gradientButtons: [false, false]
  });
});

test('updateWallpaperActionState caches the shared wallpaper toolbar synchronizer when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateWallpaperActionStateSource = extractFunctionSource(
    fileContent,
    'function updateWallpaperActionState(doc = getIframeDoc()) {',
    '\n\n    function updateThemeTokenActionState(doc = getIframeDoc()) {'
  );
  const doc = { id: 'active-doc' };
  const calls = [];
  const context = {
    SlideNextStudioDeckView: {
      resolveStudioWallpaperActionState() {
        return {
          activeSlide: {},
          canUseWallpaperControls: true
        };
      },
      syncStudioWallpaperToolbarActionState() {
        throw new Error('direct wallpaper sync should not run');
      },
      createStudioWallpaperToolbarActionStateSync(options) {
        calls.push(['factory', options]);
        return (currentDoc) => {
          calls.push(['sync', currentDoc]);
          return options.getActionState(currentDoc).canUseWallpaperControls;
        };
      }
    },
    document: {},
    getIframeDoc() {
      return doc;
    },
    getActiveSlide() {
      return {};
    }
  };

  context.SlideNextStudioEditorWallpaperToolbarState = wallpaperToolbarState;
  context.SlideNextStudioEditorWallpaperToolbarStateRuntimeAccessors = wallpaperToolbarStateRuntimeAccessors;
  vm.createContext(context);
  loadResolveCurrentStudioWallpaperActionState(fileContent, context);
  vm.runInContext(updateWallpaperActionStateSource, context);

  assert.equal(context.updateWallpaperActionState(doc), true);
  assert.equal(context.updateWallpaperActionState(doc), true);
  assert.equal(calls.filter(([name]) => name === 'factory').length, 1);
  assert.deepEqual(calls.filter(([name]) => name === 'sync').map(([, currentDoc]) => currentDoc), [doc, doc]);
});

test('updateWallpaperActionState delegates toolbar rendering to the shared deck view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateWallpaperActionStateSource = extractFunctionSource(
    fileContent,
    'function updateWallpaperActionState(doc = getIframeDoc()) {',
    '\n\n    function resolveCurrentStudioDeckReadyActionState(doc = getIframeDoc()) {'
  );
  const doc = { activeSlide: {} };
  const calls = [];
  const context = {
    getActiveSlide(currentDoc) {
      assert.equal(currentDoc, doc);
      return currentDoc.activeSlide;
    },
    SlideNextStudioDeckView: {
      syncStudioWallpaperToolbarActionState(options) {
        calls.push(options);
        assert.equal(options.doc, doc);
        assert.equal(options.getActiveSlide(doc), doc.activeSlide);
        return 'delegated';
      }
    },
    document: {},
    getIframeDoc() {
      return doc;
    }
  };

  context.SlideNextStudioEditorWallpaperToolbarState = wallpaperToolbarState;
  context.SlideNextStudioEditorWallpaperToolbarStateRuntimeAccessors = wallpaperToolbarStateRuntimeAccessors;
  vm.createContext(context);
  vm.runInContext(updateWallpaperActionStateSource, context);

  assert.equal(context.updateWallpaperActionState(doc), 'delegated');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, context.document);
  assert.equal(calls[0].doc, doc);
  assert.equal(calls[0].getActiveSlide, context.getActiveSlide);
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

test('setWallpaperTab returns false without mutating chrome when wallpaper readiness is disabled', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setWallpaperTabSource = extractFunctionSource(
    fileContent,
    'function setWallpaperTab(tab) {',
    '\n\n    // Render preset solid & gradient options'
  );

  const elements = {
    wpTabSolid: { disabled: false, className: 'solid-idle' },
    wpTabPresets: { disabled: false, className: 'presets-idle' },
    wpTabCustom: { disabled: false, className: 'custom-idle' },
    wpPanelSolid: { classList: createClassList([]) },
    wpPanelPresets: { classList: createClassList(['hidden']) },
    wpPanelCustom: { classList: createClassList(['hidden']) }
  };
  const context = {
    SlideNextStudioEditorWallpaperView: wallpaperView,
    resolveCurrentStudioWallpaperActionState() {
      return {
        canUseWallpaperControls: false
      };
    },
    wallpaperTab: 'solid',
    document: {
      getElementById(id) {
        return elements[id] || null;
      }
    }
  };
  installWallpaperStateAccessors(context);

  vm.createContext(context);
  vm.runInContext(setWallpaperTabSource, context);

  assert.equal(context.setWallpaperTab('custom'), false);
  assert.equal(context.wallpaperTab, 'solid');
  assert.equal(elements.wpTabSolid.className, 'solid-idle');
  assert.equal(elements.wpTabPresets.className, 'presets-idle');
  assert.equal(elements.wpTabCustom.className, 'custom-idle');
  assert.equal(elements.wpPanelSolid.classList.contains('hidden'), false);
  assert.equal(elements.wpPanelPresets.classList.contains('hidden'), true);
  assert.equal(elements.wpPanelCustom.classList.contains('hidden'), true);
});

test('setWallpaperTab keeps disabled-aware idle classes on inactive wallpaper tabs', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setWallpaperTabSource = extractFunctionSource(
    fileContent,
    'function setWallpaperTab(tab) {',
    '\n\n    // Render preset solid & gradient options'
  );

  const elements = {
    wpTabSolid: { disabled: false, className: 'solid-idle' },
    wpTabPresets: { disabled: false, className: 'presets-idle' },
    wpTabCustom: { disabled: false, className: 'custom-idle' },
    wpPanelSolid: { classList: createClassList([]) },
    wpPanelPresets: { classList: createClassList(['hidden']) },
    wpPanelCustom: { classList: createClassList(['hidden']) }
  };
  const context = {
    SlideNextStudioEditorWallpaperView: wallpaperView,
    resolveCurrentStudioWallpaperActionState() {
      return {
        canUseWallpaperControls: true
      };
    },
    wallpaperTab: 'solid',
    document: {
      getElementById(id) {
        return elements[id] || null;
      }
    }
  };
  installWallpaperStateAccessors(context);

  vm.createContext(context);
  vm.runInContext(setWallpaperTabSource, context);

  assert.equal(context.setWallpaperTab('custom'), true);
  assert.equal(context.wallpaperTab, 'custom');
  assert.match(elements.wpTabSolid.className, /disabled:opacity-40/);
  assert.match(elements.wpTabSolid.className, /disabled:hover:text-zinc-400/);
  assert.match(elements.wpTabPresets.className, /disabled:opacity-40/);
  assert.match(elements.wpTabPresets.className, /disabled:hover:text-zinc-400/);
  assert.match(elements.wpTabCustom.className, /bg-white\/5/);
  assert.equal(elements.wpPanelSolid.classList.contains('hidden'), true);
  assert.equal(elements.wpPanelPresets.classList.contains('hidden'), true);
  assert.equal(elements.wpPanelCustom.classList.contains('hidden'), false);
});

test('wallpaper mutation helpers no-op when wallpaper readiness or required controls are disabled', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyPresetWallpaperSource = extractFunctionSource(
    fileContent,
    'function applyPresetWallpaper(val, isCustomInput = false) {',
    '\n\n    function setCustomGradientType(type) {'
  );
  const applyWallpaperToAllSlidesSource = extractFunctionSource(
    fileContent,
    'function applyWallpaperToAllSlides() {',
    '\n\n    // 5. Undo/Redo Engine'
  );

  const activeSlide = { style: { background: 'black' } };
  const siblingSlide = { style: { background: 'white' } };
  const elements = {
    wpTabSolid: { disabled: true },
    cgLinearBtn: { disabled: true, className: 'linear-idle' },
    cgRadialBtn: { disabled: true, className: 'radial-idle' },
    cgAngleGroup: { classList: createClassList([]) },
    cgAngle: { disabled: true, value: '135' },
    cgAngleVal: { textContent: '135°' },
    cgColor1: { disabled: true, value: '#5050e8' },
    cgColor2: { disabled: true, value: '#050505' },
    applyWallpaperToAllSlidesBtn: { disabled: true }
  };
  let finalizeCalls = 0;
  let alertCalls = 0;
  const iframeDoc = {
    activeSlide,
    slides: [activeSlide, siblingSlide]
  };
  const context = {
    customGradientType: 'linear',
    document: {
      getElementById(id) {
        return elements[id] || null;
      }
    },
    resolveCurrentStudioWallpaperActionState() {
      return {
        canUseWallpaperControls: false
      };
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getSlides(doc) {
      return doc && Array.isArray(doc.slides) ? doc.slides : [];
    },
    finalizeWallpaperMutation() {
      finalizeCalls += 1;
    },
    alert() {
      alertCalls += 1;
    }
  };
  installWallpaperStateAccessors(context);

  vm.createContext(context);
  vm.runInContext(
    [
      applyPresetWallpaperSource,
      applyWallpaperToAllSlidesSource
    ].join('\n\n'),
    context
  );
  const gradientActions = createWallpaperGradientActions(context);

  assert.equal(context.applyPresetWallpaper('#ffffff'), false);
  assert.equal(activeSlide.style.background, 'black');
  assert.equal(gradientActions.setCustomGradientType('radial'), false);
  assert.equal(context.customGradientType, 'linear');
  assert.equal(elements.cgLinearBtn.className, 'linear-idle');
  assert.equal(elements.cgRadialBtn.className, 'radial-idle');
  assert.equal(gradientActions.updateCustomGradientAngle('180'), false);
  assert.equal(elements.cgAngleVal.textContent, '135°');
  assert.equal(gradientActions.applyCustomGradient(), false);
  assert.equal(context.applyWallpaperToAllSlides(), false);
  assert.equal(siblingSlide.style.background, 'white');
  assert.equal(finalizeCalls, 0);
  assert.equal(alertCalls, 0);
});

test('rollbackEditorWallpaperMutation reverses a rejected slide background transaction', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const documentRef = { id: 'iframe-doc' };
  const target = {
    style: { background: 'black' }
  };
  const context = {
    SlideNextStudioEditorTransaction: studioTransaction,
    getIframeDoc() {
      return documentRef;
    },
    getSlideById(slideId, sourceDoc) {
      return slideId === 'slide-1' && sourceDoc === documentRef ? target : null;
    }
  };

  vm.createContext(context);
  loadWallpaperRollbackHelper(fileContent, context);
  const mutation = studioTransaction.createStudioStyleTransaction([{
    elementId: 'slide:slide-1',
    before: { background: 'white' },
    after: { background: 'black' }
  }]);

  assert.equal(context.rollbackEditorWallpaperMutation(mutation, documentRef), true);
  assert.equal(target.style.background, 'white');
});

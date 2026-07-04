const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
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
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioWallpaperActionState(doc = getIframeDoc()) {',
    '\n\n    function updateWallpaperActionState(doc = getIframeDoc()) {'
  );
  vm.runInContext(helperSource, context);
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

test('setWallpaperTab returns false without mutating chrome when the target tab is disabled', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setWallpaperTabSource = extractFunctionSource(
    fileContent,
    'function setWallpaperTab(tab) {',
    '\n\n    // Render preset solid & gradient options'
  );

  const elements = {
    wpTabSolid: { disabled: false, className: 'solid-idle' },
    wpTabPresets: { disabled: false, className: 'presets-idle' },
    wpTabCustom: { disabled: true, className: 'custom-idle' },
    wpPanelSolid: { classList: createClassList([]) },
    wpPanelPresets: { classList: createClassList(['hidden']) },
    wpPanelCustom: { classList: createClassList(['hidden']) }
  };
  const context = {
    wallpaperTab: 'solid',
    document: {
      getElementById(id) {
        return elements[id] || null;
      }
    }
  };

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
    wallpaperTab: 'solid',
    document: {
      getElementById(id) {
        return elements[id] || null;
      }
    }
  };

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
  const setCustomGradientTypeSource = extractFunctionSource(
    fileContent,
    'function setCustomGradientType(type) {',
    '\n\n    function updateCustomGradientAngle(value) {'
  );
  const updateCustomGradientAngleSource = extractFunctionSource(
    fileContent,
    'function updateCustomGradientAngle(value) {',
    '\n\n    // Build background CSS based on custom stops'
  );
  const applyCustomGradientSource = extractFunctionSource(
    fileContent,
    'function applyCustomGradient() {',
    '\n\n    function applyWallpaperToAllSlides() {'
  );
  const applyWallpaperToAllSlidesSource = extractFunctionSource(
    fileContent,
    'function applyWallpaperToAllSlides() {',
    '\n\n    // 4. Zoom Engine (Center workspace stage)'
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

  vm.createContext(context);
  vm.runInContext(
    [
      applyPresetWallpaperSource,
      setCustomGradientTypeSource,
      updateCustomGradientAngleSource,
      applyCustomGradientSource,
      applyWallpaperToAllSlidesSource
    ].join('\n\n'),
    context
  );

  assert.equal(context.applyPresetWallpaper('#ffffff'), false);
  assert.equal(activeSlide.style.background, 'black');
  assert.equal(context.setCustomGradientType('radial'), false);
  assert.equal(context.customGradientType, 'linear');
  assert.equal(elements.cgLinearBtn.className, 'linear-idle');
  assert.equal(elements.cgRadialBtn.className, 'radial-idle');
  assert.equal(context.updateCustomGradientAngle('180'), false);
  assert.equal(elements.cgAngleVal.textContent, '135°');
  assert.equal(context.applyCustomGradient(), false);
  assert.equal(context.applyWallpaperToAllSlides(), false);
  assert.equal(siblingSlide.style.background, 'white');
  assert.equal(finalizeCalls, 0);
  assert.equal(alertCalls, 0);
});

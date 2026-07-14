const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const studioTransaction = require('../shared/studio-editor-transaction.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadFinalizeWallpaperMutation(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function finalizeWallpaperMutation(versionLabel = \'\', transaction = null) {',
    '\n\n    function applyPresetWallpaper(val, isCustomInput = false) {'
  );
  vm.runInContext(helperSource, context);
}

function loadResolveCurrentStudioWallpaperActionState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioWallpaperActionState(doc = getIframeDoc()) {',
    '\n\n    function updateWallpaperActionState(doc = getIframeDoc()) {'
  );
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
  vm.runInContext(applyPresetWallpaperSource, context);

  assert.equal(context.applyPresetWallpaper('linear-gradient(red, blue)'), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getActiveSlide', iframeDoc]
  ]);
});

test('applyWallpaperToAllSlides uses the shared iframe accessor and propagates the active background to every slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyWallpaperToAllSlidesSource = extractFunctionSource(
    fileContent,
    'function applyWallpaperToAllSlides() {',
    '\n\n    // 4. Zoom Engine (Center workspace stage)'
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

test('applyWallpaperToAllSlides records one style transaction per changed slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyWallpaperToAllSlidesSource = extractFunctionSource(
    fileContent,
    'function applyWallpaperToAllSlides() {',
    '\n\n    // 4. Zoom Engine (Center workspace stage)'
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
    '\n\n    // 4. Zoom Engine (Center workspace stage)'
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
    '\n\n    // 4. Zoom Engine (Center workspace stage)'
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
    ['getElementById', 'cgAngle'],
    ['getElementById', 'cgAngleVal'],
    ['applyCustomGradient']
  ]);
});

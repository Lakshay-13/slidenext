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

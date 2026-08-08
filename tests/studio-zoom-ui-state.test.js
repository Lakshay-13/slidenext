const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const zoomView = require('../shared/studio-editor-zoom.js');
const deckView = require('../shared/studio-deck-view.js');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('shared zoom view owns an isolated ordered zoom scale list', () => {
  const options = zoomView.getStudioZoomOptions();
  assert.equal(options.length, 26);
  assert.deepEqual(options.slice(0, 3), [0.25, 0.3, 0.35]);
  assert.deepEqual(options.slice(-3), [1.4, 1.45, 1.5]);
  options[0] = 99;
  assert.equal(zoomView.getStudioZoomOptions()[0], 0.25);
});

test('shared zoom view resolves fit, unknown, and boundary steps deterministically', () => {
  assert.equal(zoomView.resolveStudioZoomStep({
    currentValue: 'fit',
    direction: 'in',
    zoomFactor: 1
  }), 1.05);
  assert.equal(zoomView.resolveStudioZoomStep({
    currentValue: 'fit',
    direction: 'out',
    zoomFactor: 1
  }), 0.95);
  assert.equal(zoomView.resolveStudioZoomStep({
    currentValue: 'not-a-scale',
    direction: 'in'
  }), 1);
  assert.equal(zoomView.resolveStudioZoomStep({
    currentValue: '1.5',
    direction: 'in'
  }), 1.5);
  assert.equal(zoomView.resolveStudioZoomStep({
    currentValue: '0.25',
    direction: 'out'
  }), 0.25);
});

test('shared zoom view resolves a control step from the document select', () => {
  const select = { value: '1.0' };
  const documentRef = {
    getElementById(id) {
      return id === 'zoomSelect' ? select : null;
    }
  };

  assert.equal(zoomView.resolveStudioZoomControlStep({
    documentRef,
    direction: 'in',
    zoomFactor: 1
  }), 1.05);
  assert.equal(zoomView.resolveStudioZoomControlStep(), null);
});

test('applyZoom tolerates a missing zoom select while fitting the canvas', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyZoomSource = extractFunctionSource(
    fileContent,
    'function applyZoom(scaleVal) {',
    '\n\n    function zoomIn() {'
  );

  const stage = {
    clientWidth: 1400,
    clientHeight: 900
  };
  const scroller = {
    style: {}
  };
  const wrapper = {
    style: {}
  };
  const calls = [];
  const context = {
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        switch (id) {
          case 'canvasStage':
            return stage;
          case 'canvasScrollContainer':
            return scroller;
          case 'canvasWrapper':
            return wrapper;
          case 'zoomSelect':
            return null;
          default:
            return null;
        }
      }
    },
    localStorage: {
      setItem(key, value) {
        calls.push(['localStorage.setItem', key, value]);
      }
    },
    SlideNextStudioEditorZoom: require('../shared/studio-editor-zoom.js'),
    zoomFactor: 1
  };

  vm.createContext(context);
  vm.runInContext(applyZoomSource, context);

  assert.doesNotThrow(() => context.applyZoom('fit'));
  assert.ok(Number.isFinite(context.zoomFactor));
  assert.ok(context.zoomFactor >= 0.15 && context.zoomFactor <= 1.5);
  assert.equal(typeof scroller.style.width, 'string');
  assert.equal(typeof scroller.style.height, 'string');
  assert.match(wrapper.style.transform, /scale\(/);
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'zoomSelect'));
  assert.ok(calls.some(([name, key, value]) => name === 'localStorage.setItem' && key === 'presentationZoom' && value === 'fit'));
});

function createZoomControls() {
  return {
    zoomOutBtn: { disabled: true },
    zoomSelect: { disabled: true, value: '1.0' },
    zoomInBtn: { disabled: true }
  };
}

function loadResolveCurrentStudioZoomActionState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioZoomActionState(doc = getIframeDoc()) {',
    '\n\n    function updateZoomActionState(doc = getIframeDoc()) {'
  );
  if (typeof context.SlideNextStudioDeckView === 'undefined') {
    context.SlideNextStudioDeckView = deckView;
  }
  vm.runInContext(helperSource, context);
}

test('resolveCurrentStudioZoomActionState reports zoom readiness from the live active slide state', () => {
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
  loadResolveCurrentStudioZoomActionState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveCurrentStudioZoomActionState(null))),
    {
      canUseZoomControls: false
    }
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveCurrentStudioZoomActionState({
      activeSlide: { id: 'slide-1' }
    }))),
    {
      canUseZoomControls: true
    }
  );
});

test('resolveCurrentStudioZoomActionState reuses the shared deck-view zoom helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const doc = {
    activeSlide: { id: 'slide-1' }
  };
  const calls = [];
  const context = {
    SlideNextStudioDeckView: {
      resolveStudioZoomActionState(sourceDoc, options = {}) {
        calls.push({
          sourceDoc,
          hasGetActiveSlide: typeof options.getActiveSlide === 'function',
          activeSlideId: options.getActiveSlide(sourceDoc)?.id || ''
        });
        return {
          canUseZoomControls: true
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
  loadResolveCurrentStudioZoomActionState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveCurrentStudioZoomActionState(doc))),
    {
      canUseZoomControls: true
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

test('updateZoomActionState enables zoom controls only when the iframe has a live active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateZoomActionStateSource = extractFunctionSource(
    fileContent,
    'function updateZoomActionState(doc = getIframeDoc()) {',
    '\n\n    function updateWallpaperActionState(doc = getIframeDoc()) {'
  );

  const controls = createZoomControls();
  const inactiveDoc = { activeSlide: null };
  const activeDoc = { activeSlide: { id: 'slide-1' } };
  let currentDoc = inactiveDoc;
  const context = {
    document: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    getIframeDoc() {
      return currentDoc;
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    }
  };

  vm.createContext(context);
  loadResolveCurrentStudioZoomActionState(fileContent, context);
  vm.runInContext(updateZoomActionStateSource, context);

  context.updateZoomActionState();
  assert.deepEqual(
    [controls.zoomOutBtn.disabled, controls.zoomSelect.disabled, controls.zoomInBtn.disabled],
    [true, true, true]
  );

  currentDoc = activeDoc;
  context.updateZoomActionState();
  assert.deepEqual(
    [controls.zoomOutBtn.disabled, controls.zoomSelect.disabled, controls.zoomInBtn.disabled],
    [false, false, false]
  );
});

test('updateZoomActionState delegates toolbar rendering to the shared deck view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateZoomActionStateSource = extractFunctionSource(
    fileContent,
    'function updateZoomActionState(doc = getIframeDoc()) {',
    '\n\n    function updateWallpaperActionState(doc = getIframeDoc()) {'
  );
  const doc = { activeSlide: {} };
  const calls = [];
  const context = {
    getActiveSlide(currentDoc) {
      assert.equal(currentDoc, doc);
      return currentDoc.activeSlide;
    },
    SlideNextStudioDeckView: {
      syncStudioZoomToolbarActionState(options) {
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

  vm.createContext(context);
  vm.runInContext(updateZoomActionStateSource, context);

  assert.equal(context.updateZoomActionState(doc), 'delegated');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, context.document);
  assert.equal(calls[0].doc, doc);
  assert.equal(calls[0].getActiveSlide, context.getActiveSlide);
});

test('zoom helpers no-op safely when zoom readiness is disabled and still tolerate a missing zoom select', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const zoomInSource = extractFunctionSource(
    fileContent,
    'function zoomIn() {',
    '\n\n    function zoomOut() {'
  );
  const zoomOutSource = extractFunctionSource(
    fileContent,
    'function zoomOut() {',
    '\n\n    function zoomSelectChange(val) {'
  );
  const zoomSelectChangeSource = extractFunctionSource(
    fileContent,
    'function zoomSelectChange(val) {',
    '\n\n    // 5. Undo/Redo Engine'
  );

  let zoomSelect = null;
  let applyZoomCalls = 0;
  let canUseZoomControls = false;
  const context = {
    document: {
      getElementById(id) {
        assert.equal(id, 'zoomSelect');
        return zoomSelect;
      }
    },
    applyZoom() {
      applyZoomCalls += 1;
    },
    resolveCurrentStudioZoomActionState() {
      return {
        canUseZoomControls
      };
    },
    zoomFactor: 1
  };

  vm.createContext(context);
  vm.runInContext(zoomInSource, context);
  vm.runInContext(zoomOutSource, context);
  vm.runInContext(zoomSelectChangeSource, context);

  assert.equal(context.zoomIn(), false);
  assert.equal(context.zoomOut(), false);
  assert.equal(context.zoomSelectChange('1.2'), false);

  canUseZoomControls = true;
  assert.equal(context.zoomSelectChange('1.2'), true);

  zoomSelect = { disabled: true, value: '1.0' };
  assert.equal(context.zoomIn(), true);
  assert.equal(context.zoomOut(), true);
  assert.equal(context.zoomSelectChange('1.2'), true);
  assert.equal(applyZoomCalls, 4);
});

test('zoomIn and zoomOut delegate step resolution to the shared zoom view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const zoomInSource = extractFunctionSource(
    fileContent,
    'function zoomIn() {',
    '\n\n    function zoomOut() {'
  );
  const zoomOutSource = extractFunctionSource(
    fileContent,
    'function zoomOut() {',
    '\n\n    function zoomSelectChange(val) {'
  );
  const select = { value: '1.0' };
  const applied = [];
  const context = {
    document: {
      getElementById(id) {
        return id === 'zoomSelect' ? select : null;
      }
    },
    SlideNextStudioEditorZoom: {
      resolveStudioZoomControlStep(options) {
        return options.direction === 'in' ? 1.05 : 0.95;
      }
    },
    resolveCurrentStudioZoomActionState() {
      return { canUseZoomControls: true };
    },
    applyZoom(value) {
      applied.push(value);
    },
    zoomFactor: 1
  };

  vm.createContext(context);
  vm.runInContext(zoomInSource, context);
  vm.runInContext(zoomOutSource, context);

  assert.equal(context.zoomIn(), true);
  assert.equal(context.zoomOut(), true);
  assert.deepEqual(applied, ['1.05', '0.95']);
});

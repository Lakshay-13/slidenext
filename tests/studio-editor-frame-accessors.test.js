const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const accessorsApi = require('../shared/studio-editor-frame-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const ACCESSORS_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-frame-accessors.js');

test('frame accessors resolve the frame, iframe document, and window', () => {
  const iframeDocument = { id: 'iframe-document' };
  const iframeWindow = { document: iframeDocument };
  const frame = { contentDocument: iframeDocument, contentWindow: iframeWindow };
  const documentRef = {
    getElementById(id) {
      return id === 'studioFrame' ? frame : null;
    }
  };
  const accessors = accessorsApi.createStudioEditorFrameAccessors({ documentRef });

  assert.equal(accessors.getFrame(), frame);
  assert.equal(accessors.getDocument(), iframeDocument);
  assert.equal(accessors.getWindow(), iframeWindow);
});

test('frame accessors fail closed when the frame or content document is unavailable', () => {
  const accessors = accessorsApi.createStudioEditorFrameAccessors({
    documentRef: {
      getElementById() {
        return { contentWindow: null };
      }
    }
  });

  assert.equal(accessors.getDocument(), null);
  assert.equal(accessors.getWindow(), null);

  const missingFrameAccessors = accessorsApi.createStudioEditorFrameAccessors();
  assert.equal(missingFrameAccessors.getFrame(), null);
  assert.equal(missingFrameAccessors.getDocument(), null);
  assert.equal(missingFrameAccessors.getWindow(), null);
});

test('frame accessors merge DOM and overlay option overrides without mutating defaults', () => {
  const inlineTextTags = new Set(['span']);
  const accessors = accessorsApi.createStudioEditorFrameAccessors({
    domOptions: {
      slideSelector: '.slide',
      inlineTextTags
    },
    overlayOptions: {
      visibleClassName: 'visible'
    }
  });

  const domOptions = accessors.getDomOptions({ slideSelector: '.custom-slide' });
  const overlayOptions = accessors.getOverlayOptions({ visibleClassName: 'is-visible' });

  assert.equal(domOptions.slideSelector, '.custom-slide');
  assert.equal(domOptions.inlineTextTags, inlineTextTags);
  assert.equal(overlayOptions.visibleClassName, 'is-visible');
  assert.equal(accessors.getDomOptions().slideSelector, '.slide');
  assert.equal(accessors.getOverlayOptions().visibleClassName, 'visible');
});

test('frame global api preserves the editor shell function names', () => {
  const frame = { id: 'frame' };
  const iframeDocument = { id: 'document' };
  const iframeWindow = { id: 'window' };
  const accessors = {
    getFrame: () => frame,
    getDocument: () => iframeDocument,
    getWindow: () => iframeWindow,
    getDomOptions: (overrides) => ({ kind: 'dom', ...overrides }),
    getOverlayOptions: (overrides) => ({ kind: 'overlay', ...overrides })
  };
  const globalApi = accessorsApi.createStudioEditorFrameGlobalApi({ accessors });

  assert.equal(globalApi.getStudioFrame(), frame);
  assert.equal(globalApi.getIframeDoc(), iframeDocument);
  assert.equal(globalApi.getIframeWindow(), iframeWindow);
  assert.deepEqual(globalApi.getEditorDomOptions({ value: 1 }), { kind: 'dom', value: 1 });
  assert.deepEqual(globalApi.getEditorOverlayOptions({ value: 2 }), {
    kind: 'overlay',
    value: 2
  });
});

test('frame accessors publish the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(ACCESSORS_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorFrameAccessors, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorFrameAccessors
      .createStudioEditorFrameAccessors,
    'function'
  );
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorFrameAccessors
      .createStudioEditorFrameGlobalApi,
    'function'
  );
});

test('editor loads and consumes the frame accessor module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-frame-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /createStudioEditorFrameAccessors\(/);
  assert.match(fileContent, /studioEditorFrameAccessors/);
  assert.match(fileContent, /studioEditorFrameGlobalApi/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorFrameGlobalApi\)/);
  assert.doesNotMatch(fileContent, /function getStudioFrame\(\)/);
  assert.doesNotMatch(fileContent, /function getIframeDoc\(\)/);
  assert.doesNotMatch(fileContent, /function getEditorDomOptions\(options = \{\}\)/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controller = require('../shared/studio-editor-wallpaper-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('wallpaper controller applies a changed active-slide paint and finalizes its transaction', () => {
  const calls = [];
  const activeSlide = { id: 'slide-1', style: { background: '#111111' } };
  const canonicalActiveSlide = { layout: { background: { style: 'background: #111111;' } } };
  const mutation = { didChange: true, transaction: { id: 'tx-1' }, canonicalDeck: { slides: [] } };
  const result = controller.applyStudioPresetWallpaper({
    background: '#ffffff',
    resolveActionState(documentRef) {
      calls.push(['ready', documentRef]);
      return { canUseWallpaperControls: true, activeSlide, canonicalActiveSlide };
    },
    getIframeDocument() {
      return { id: 'iframe-doc' };
    },
    wallpaperView: {
      resolveStudioActiveSlideBackgroundPaint(slide) {
        return slide === canonicalActiveSlide ? '#111111' : '';
      }
    },
    applyMutation(slide, background, options) {
      calls.push(['mutation', slide, background, options.getSlideId()]);
      return mutation;
    },
    getSlideId() {
      return 'slide-1';
    },
    setPendingCustomWallpaperVersion(value) {
      calls.push(['pending', value]);
    },
    finalizeMutation(...args) {
      calls.push(['finalize', ...args]);
    }
  });

  assert.equal(result, true);
  assert.equal(calls[0][0], 'ready');
  assert.deepEqual(calls.slice(1).map(([name]) => name), ['mutation', 'finalize', 'pending']);
  assert.deepEqual(calls[1].slice(1), [activeSlide, '#ffffff', 'slide-1']);
  assert.deepEqual(calls[2].slice(1), ['Auto: Changed Background', mutation.transaction, mutation.canonicalDeck]);
  assert.deepEqual(calls[3].slice(1), [false]);
});

test('wallpaper controller fails closed before mutating without a finalizer', () => {
  let mutationCalls = 0;
  assert.equal(controller.applyStudioPresetWallpaper({
    background: '#ffffff',
    resolveActionState: () => ({
      canUseWallpaperControls: true,
      activeSlide: { style: { background: '#111111' } }
    }),
    applyMutation() {
      mutationCalls += 1;
      return { didChange: true };
    }
  }), false);
  assert.equal(mutationCalls, 0);
});

test('wallpaper controller rolls back thrown active-slide persistence before setting pending version state', () => {
  const calls = [];
  const transaction = { id: 'tx-rejected' };
  const documentRef = { id: 'iframe-doc' };
  const result = controller.applyStudioPresetWallpaper({
    background: '#ffffff',
    resolveActionState: () => ({
      canUseWallpaperControls: true,
      activeSlide: { style: { background: '#111111' } }
    }),
    getIframeDocument: () => documentRef,
    applyMutation: () => ({ didChange: true, transaction }),
    finalizeMutation: () => {
      throw new Error('active wallpaper finalization failed');
    },
    rollbackMutation: (...args) => calls.push(args),
    setPendingCustomWallpaperVersion: () => calls.push(['pending'])
  });

  assert.equal(result, false);
  assert.deepEqual(calls, [[transaction, documentRef]]);
});

test('wallpaper controller skips unchanged paints and unavailable decks', () => {
  let mutationCalls = 0;
  const baseOptions = {
    background: '#111111',
    getIframeDocument() {
      return {};
    },
    applyMutation() {
      mutationCalls += 1;
      return { didChange: true };
    }
  };

  assert.equal(controller.applyStudioPresetWallpaper({
    ...baseOptions,
    resolveActionState() {
      return {
        canUseWallpaperControls: true,
        activeSlide: { style: { background: '#111111' } }
      };
    }
  }), false);
  assert.equal(controller.applyStudioPresetWallpaper({
    ...baseOptions,
    resolveActionState() {
      return { canUseWallpaperControls: false, activeSlide: null };
    }
  }), false);
  assert.equal(mutationCalls, 0);
});

test('wallpaper controller applies the active paint to all slides and alerts after finalization', () => {
  const calls = [];
  const slides = [{ id: 'slide-1' }, { id: 'slide-2' }];
  const mutation = { didChange: true, transaction: { id: 'tx-all' } };
  const result = controller.applyStudioWallpaperToAllSlides({
    resolveActionState() {
      return {
        canUseWallpaperControls: true,
        activeSlide: { style: { background: '#111111' } }
      };
    },
    getIframeDocument() {
      return { id: 'iframe-doc' };
    },
    wallpaperView: {
      resolveStudioActiveSlideBackgroundPaint() {
        return '#111111';
      }
    },
    getSlides(documentRef) {
      calls.push(['slides', documentRef]);
      return slides;
    },
    applyMutation(nextSlides, background, options) {
      calls.push(['mutation', nextSlides, background, options.sourceDocument, options.getSlideId(slides[0])]);
      return mutation;
    },
    getSlideId(slide) {
      return slide.id;
    },
    finalizeMutation(...args) {
      calls.push(['finalize', ...args]);
    },
    alertRef(message) {
      calls.push(['alert', message]);
    }
  });

  assert.equal(result, true);
  assert.deepEqual(calls.map(([name]) => name), ['slides', 'mutation', 'finalize', 'alert']);
  assert.equal(calls[1][2], '#111111');
  assert.deepEqual(calls[2].slice(1), ['Auto: Applied Background to All Slides', mutation.transaction]);
  assert.match(calls[3][1], /all slides/);
});

test('wallpaper controller rolls back rejected all-slide persistence before alerting', () => {
  const transaction = { id: 'tx-all-rejected' };
  const documentRef = { id: 'iframe-doc' };
  const calls = [];
  const result = controller.applyStudioWallpaperToAllSlides({
    resolveActionState: () => ({
      canUseWallpaperControls: true,
      activeSlide: { style: { background: '#111111' } }
    }),
    getIframeDocument: () => documentRef,
    wallpaperView: {
      resolveStudioActiveSlideBackgroundPaint: () => '#111111'
    },
    getSlides: () => [{ id: 'slide-1' }],
    applyMutation: () => ({ didChange: true, transaction }),
    finalizeMutation: () => false,
    rollbackMutation: (...args) => calls.push(args),
    alertRef: () => calls.push(['alert'])
  });

  assert.equal(result, false);
  assert.deepEqual(calls, [[transaction, documentRef]]);
});

test('index routes normal preset wallpaper actions through the shared controller seam', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(source, /src="\/shared\/studio-editor-wallpaper-controller\.js"/);
  assert.match(source, /src="\/shared\/studio-editor-wallpaper-transaction-actions\.js"/);
  assert.match(source, /wallpaperController\.applyStudioPresetWallpaper/);
  assert.match(source, /wallpaperController\.applyStudioWallpaperToAllSlides/);
  assert.match(source, /Object\.assign\(globalThis, studioEditorWallpaperTransactionGlobalApi\);/);
  assert.match(source, /rollbackMutation: rollbackEditorWallpaperMutation/);
});

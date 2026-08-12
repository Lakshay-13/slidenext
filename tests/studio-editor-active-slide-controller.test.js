const test = require('node:test');
const assert = require('node:assert/strict');
const activeSlideController = require('../shared/studio-editor-active-slide-controller.js');

test('active-slide controller composes shared chrome dependencies and preserves sync options', () => {
  const calls = [];
  const documentRef = {
    getElementById(id) {
      assert.equal(id, 'slideCountLabel');
      return { textContent: '' };
    }
  };
  const activeSlideView = {
    syncStudioActiveSlideChrome(doc, options) {
      calls.push(['sync', doc, options]);
      options.syncStudioActiveSlideView(doc, {
        setCurrentSlideIndex: (index) => options.updateCurrentPresentationSessionState({ slideIndex: index }),
        setSlideCountLabel: (label) => options.setSlideCountLabel(label)
      });
      options.refreshActionStateChrome(doc);
      options.syncSelectionChrome(true);
      return true;
    }
  };
  let currentSlideIndex = 0;
  let currentSlideId = '';
  let preserveSelection = false;
  const controller = activeSlideController.createStudioEditorActiveSlideController({
    activeSlideView,
    deckViewApi: {
      syncStudioActiveSlideView(doc, options) {
        options.setCurrentSlideIndex(2);
        options.setSlideCountLabel('3 / 4');
        return { didSync: true };
      }
    },
    documentRef,
    getCurrentSlideIndex: () => currentSlideIndex,
    getPreserveSelection: () => preserveSelection,
    setPreserveSelection: (value) => {
      preserveSelection = value;
    },
    updateCurrentPresentationSessionState(nextState) {
      currentSlideIndex = nextState.slideIndex;
    },
    setCurrentSlideId(nextValue) {
      currentSlideId = nextValue;
    },
    updateInsertionActionState: (doc) => calls.push(['insert', doc]),
    updateZoomActionState: (doc) => calls.push(['zoom', doc]),
    updateWallpaperActionState: (doc) => calls.push(['wallpaper', doc]),
    updateLayersList: (doc) => calls.push(['layers', doc]),
    getWallpaperTab: () => 'solid',
    setWallpaperTab: () => {}
  });
  const iframeDoc = { id: 'iframe-document' };

  assert.equal(controller.sync(iframeDoc, { captureHistory: true }), true);
  assert.equal(calls[0][0], 'sync');
  assert.equal(calls[0][1], iframeDoc);
  assert.equal(calls[0][2].captureHistory, true);
  assert.equal(currentSlideIndex, 2);
  assert.equal(currentSlideId, '');
  assert.equal(calls[1][0], 'insert');
  assert.equal(calls[2][0], 'zoom');
  assert.equal(calls[3][0], 'wallpaper');
  assert.equal(calls[4][0], 'layers');
  assert.equal(calls[4][1], iframeDoc);
});

test('active-slide controller synchronizes wallpaper state and fails closed without a view', () => {
  let wallpaperTab = 'solid';
  let gradientType = 'linear';
  let wallpaperCalls = 0;
  const controller = activeSlideController.createStudioEditorActiveSlideController({
    activeSlideView: {
      syncStudioActiveSlideChrome(doc, options) {
        const activeSlide = { id: 'slide-1' };
        assert.equal(options.syncCustomGradientControls(activeSlide), true);
        assert.equal(options.syncWallpaperTabChrome(activeSlide, {
          didSyncCustomGradientControls: true
        }), true);
        assert.deepEqual(options.syncSolidWallpaperControl(activeSlide), { didApply: true });
        return true;
      }
    },
    wallpaperView: {
      syncStudioCustomGradientControls() {
        wallpaperCalls += 1;
        return { didApply: true, gradientType: 'radial' };
      },
      syncStudioWallpaperTabChrome(options) {
        wallpaperCalls += 1;
        assert.equal(options.wallpaperTab, 'solid');
        return { didApply: true, wallpaperTab: 'custom' };
      },
      syncStudioSolidWallpaperControl() {
        wallpaperCalls += 1;
        return { didApply: true };
      }
    },
    getWallpaperTab: () => wallpaperTab,
    setWallpaperTab: (value) => {
      wallpaperTab = value;
    },
    setCustomGradientType: (value) => {
      gradientType = value;
    }
  });

  assert.equal(controller.sync({ id: 'iframe-document' }), true);
  assert.equal(wallpaperCalls, 3);
  assert.equal(wallpaperTab, 'custom');
  assert.equal(gradientType, 'radial');

  const unavailable = activeSlideController.createStudioEditorActiveSlideController();
  assert.equal(unavailable.sync(null), false);
});

test('active-slide controller prefers canonical active slide for wallpaper readers', () => {
  const canonicalSlide = {
    id: 'slide-1',
    layout: { background: { style: 'background: #112233;' } }
  };
  const wallpaperSlides = [];
  const lookupCalls = [];
  const controller = activeSlideController.createStudioEditorActiveSlideController({
    activeSlideView: {
      syncStudioActiveSlideChrome(doc, options) {
        const domSlide = { id: 'slide-1' };
        options.syncCustomGradientControls(domSlide);
        options.syncWallpaperTabChrome(domSlide);
        options.syncSolidWallpaperControl(domSlide);
        return true;
      }
    },
    wallpaperView: {
      syncStudioCustomGradientControls(options) {
        wallpaperSlides.push(options.activeSlide);
        return { didApply: false };
      },
      syncStudioWallpaperTabChrome(options) {
        wallpaperSlides.push(options.activeSlide);
        return { didApply: false };
      },
      syncStudioSolidWallpaperControl(options) {
        wallpaperSlides.push(options.activeSlide);
        return { didApply: false };
      }
    },
    buildEditorCanonicalDeck() {
      return { slides: [canonicalSlide] };
    },
    canonicalDeckApi: {
      findCanonicalSlideById(deck, slideId) {
        lookupCalls.push([deck, slideId]);
        return canonicalSlide;
      }
    },
    getSlideId(slide) {
      return slide.id;
    }
  });

  assert.equal(controller.sync({ id: 'iframe-document' }), true);
  assert.deepEqual(wallpaperSlides, [canonicalSlide, canonicalSlide, canonicalSlide]);
  assert.deepEqual(lookupCalls, [[
    { slides: [canonicalSlide] },
    'slide-1'
  ]]);
});

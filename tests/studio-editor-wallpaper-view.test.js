const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const wallpaperView = require('../shared/studio-editor-wallpaper-view.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('resolveStudioActiveSlideSolidWallpaperColor handles solid and gradient backgrounds', () => {
  assert.equal(
    wallpaperView.resolveStudioActiveSlideSolidWallpaperColor({
      style: {
        backgroundColor: 'rgb(17, 34, 51)'
      }
    }),
    'rgb(17, 34, 51)'
  );
  assert.equal(
    wallpaperView.resolveStudioActiveSlideSolidWallpaperColor({
      style: {
        background: 'linear-gradient(red, blue)'
      }
    }),
    ''
  );
});

test('wallpaper readers accept canonical slide background metadata', () => {
  const canonicalSolidSlide = {
    layout: {
      background: {
        color: '#112233',
        style: 'background: #112233;'
      }
    }
  };
  const canonicalGradientSlide = {
    layout: {
      background: {
        style: 'background: linear-gradient(210deg, #112233 0%, #445566 100%);'
      }
    }
  };

  assert.equal(
    wallpaperView.resolveStudioActiveSlideSolidWallpaperColor(canonicalSolidSlide),
    '#112233'
  );
  assert.deepEqual(
    wallpaperView.resolveStudioActiveSlideGradientControls(canonicalGradientSlide),
    {
      gradientType: 'linear',
      color1Value: '#112233',
      color2Value: '#445566',
      angleValue: '210'
    }
  );
});

test('resolveStudioActiveSlideBackgroundPaint prefers canonical paint and supports DOM fallback', () => {
  assert.equal(
    wallpaperView.resolveStudioActiveSlideBackgroundPaint({
      layout: {
        background: {
          style: 'background: linear-gradient(red, blue);'
        }
      },
      style: {
        background: '#000000'
      }
    }),
    'linear-gradient(red, blue)'
  );
  assert.equal(
    wallpaperView.resolveStudioActiveSlideBackgroundPaint({
      style: {
        background: '#112233'
      }
    }),
    '#112233'
  );
});

test('resolveStudioActiveSlideGradientControls parses editable linear and radial gradients', () => {
  assert.deepEqual(
    wallpaperView.resolveStudioActiveSlideGradientControls({
      style: {
        background: 'linear-gradient(210deg, rgb(17, 34, 51) 0%, rgb(68, 85, 102) 100%)'
      }
    }),
    {
      gradientType: 'linear',
      color1Value: '#112233',
      color2Value: '#445566',
      angleValue: '210'
    }
  );
  assert.deepEqual(
    wallpaperView.resolveStudioActiveSlideGradientControls({
      style: {
        backgroundImage: 'radial-gradient(circle, #112233 0%, #445566 85%)'
      }
    }),
    {
      gradientType: 'radial',
      color1Value: '#112233',
      color2Value: '#445566',
      angleValue: ''
    }
  );
});

test('resolveStudioActiveSlideGradientControls rejects unsupported gradient layouts', () => {
  assert.equal(
    wallpaperView.resolveStudioActiveSlideGradientControls({
      style: {
        background: 'linear-gradient(135deg, #0b0f19 0%, #111827 50%, #050505 100%)'
      }
    }),
    null
  );
});

test('syncStudioSolidWallpaperControl updates the picker through the provided color converter', () => {
  const colorInput = { value: '#000000' };
  const activeSlide = {
    style: {
      backgroundColor: 'rgb(17, 34, 51)'
    }
  };
  const calls = [];

  assert.equal(wallpaperView.syncStudioSolidWallpaperControl({
    documentRef: {
      getElementById(id) {
        return id === 'wallpaperCustomColor' ? colorInput : null;
      }
    },
    activeSlide,
    rgbToHex(value) {
      calls.push(value);
      return '#112233';
    }
  }), true);
  assert.deepEqual(calls, ['rgb(17, 34, 51)']);
  assert.equal(colorInput.value, '#112233');
});

test('renderStudioWallpaperPresets renders both preset collections into their containers', () => {
  const elements = {
    wallpaperSolidsList: { innerHTML: '' },
    wallpaperGradientsList: { innerHTML: '' }
  };

  assert.equal(wallpaperView.renderStudioWallpaperPresets({
    documentRef: {
      getElementById(id) {
        return elements[id] || null;
      }
    },
    presetData: {
      solid: [{ name: 'Obsidian', value: '#050505' }],
      gradient: [{ name: 'Deep Sea', value: 'linear-gradient(135deg, #0a1128 0%, #000000 100%)' }]
    }
  }), true);
  assert.match(elements.wallpaperSolidsList.innerHTML, /applyPresetWallpaper\('#050505'\)/);
  assert.match(elements.wallpaperSolidsList.innerHTML, /title="Obsidian"/);
  assert.match(elements.wallpaperGradientsList.innerHTML, /Deep Sea/);
  assert.match(elements.wallpaperGradientsList.innerHTML, /linear-gradient/);
});

test('renderStudioWallpaperPresets tolerates missing wallpaper containers', () => {
  assert.equal(wallpaperView.renderStudioWallpaperPresets({ documentRef: null }), false);
});

test('syncStudioCustomGradientAngleChrome updates the angle label', () => {
  const angleLabel = { textContent: '135°' };
  const documentRef = {
    getElementById(id) {
      return id === 'cgAngleVal' ? angleLabel : null;
    }
  };

  assert.equal(wallpaperView.syncStudioCustomGradientAngleChrome({
    documentRef,
    angle: '210'
  }), true);
  assert.equal(angleLabel.textContent, '210°');
});

test('syncStudioCustomGradientAngleChrome tolerates missing angle chrome', () => {
  assert.equal(wallpaperView.syncStudioCustomGradientAngleChrome(), false);
});

test('applyStudioWallpaperToSlides updates changed slides and builds a style transaction', () => {
  const activeSlide = { style: { background: 'black' } };
  const siblingSlide = { style: { background: '' } };
  let transactionItems = null;
  const result = wallpaperView.applyStudioWallpaperToSlides(
    [activeSlide, siblingSlide],
    'linear-gradient(red, blue)',
    {
      getSlideId(slide) {
        return slide === activeSlide ? 'slide-1' : 'slide-2';
      },
      createStyleTransaction(items) {
        transactionItems = items;
        return { type: 'style', items };
      }
    }
  );

  assert.equal(result.didChange, true);
  assert.equal(result.changedCount, 2);
  assert.equal(activeSlide.style.background, 'linear-gradient(red, blue)');
  assert.equal(siblingSlide.style.background, 'linear-gradient(red, blue)');
  assert.deepEqual(transactionItems.map((item) => item.elementId), ['slide:slide-1', 'slide:slide-2']);
  assert.deepEqual(result.transaction, { type: 'style', items: transactionItems });
});

test('applyStudioWallpaperToSlides restores backgrounds when transaction creation fails', () => {
  const activeSlide = { style: { background: 'black' } };
  const siblingSlide = { style: { background: 'white' } };

  const result = wallpaperView.applyStudioWallpaperToSlides(
    [activeSlide, siblingSlide],
    'linear-gradient(red, blue)',
    {
      createStyleTransaction() {
        throw new Error('history transaction failed');
      }
    }
  );

  assert.deepEqual(result, { didChange: false, changedCount: 0, transaction: null });
  assert.equal(activeSlide.style.background, 'black');
  assert.equal(siblingSlide.style.background, 'white');
});

test('applyStudioWallpaperToSlides reports no change when every slide matches', () => {
  const slides = [{ style: { background: 'black' } }];
  assert.deepEqual(
    wallpaperView.applyStudioWallpaperToSlides(slides, 'black'),
    { didChange: false, changedCount: 0, transaction: null }
  );
});

test('setStudioWallpaperTab applies the requested tab and panel chrome', () => {
  const createClassList = (initialValues = []) => {
    const values = new Set(initialValues);
    return {
      add(value) {
        values.add(value);
      },
      remove(value) {
        values.delete(value);
      },
      contains(value) {
        return values.has(value);
      }
    };
  };
  const elements = {
    wpTabSolid: { className: '' },
    wpTabPresets: { className: '' },
    wpTabCustom: { className: '' },
    wpPanelSolid: { classList: createClassList() },
    wpPanelPresets: { classList: createClassList(['hidden']) },
    wpPanelCustom: { classList: createClassList(['hidden']) }
  };

  assert.equal(wallpaperView.setStudioWallpaperTab({
    documentRef: {
      getElementById(id) {
        return elements[id] || null;
      }
    },
    tab: 'custom'
  }), true);
  assert.match(elements.wpTabCustom.className, /bg-white\/5/);
  assert.equal(elements.wpPanelSolid.classList.contains('hidden'), true);
  assert.equal(elements.wpPanelPresets.classList.contains('hidden'), true);
  assert.equal(elements.wpPanelCustom.classList.contains('hidden'), false);
});

test('syncStudioWallpaperTabChrome selects the matching wallpaper panel', () => {
  const classList = () => ({
    values: new Set(),
    add(value) {
      this.values.add(value);
    },
    remove(value) {
      this.values.delete(value);
    },
    contains(value) {
      return this.values.has(value);
    }
  });
  const elements = {
    wpTabSolid: { className: '' },
    wpTabPresets: { className: '' },
    wpTabCustom: { className: '' },
    wpPanelSolid: { classList: classList() },
    wpPanelPresets: { classList: classList() },
    wpPanelCustom: { classList: classList() }
  };
  const result = wallpaperView.syncStudioWallpaperTabChrome({
    documentRef: {
      getElementById(id) {
        return elements[id] || null;
      }
    },
    activeSlide: {
      style: {
        background: 'linear-gradient(135deg, #112233 0%, #445566 100%)'
      }
    },
    didSyncCustomGradientControls: false
  });

  assert.equal(result.didApply, true);
  assert.equal(result.wallpaperTab, 'presets');
  assert.equal(elements.wpPanelSolid.classList.contains('hidden'), true);
  assert.equal(elements.wpPanelPresets.classList.contains('hidden'), false);
  assert.equal(elements.wpPanelCustom.classList.contains('hidden'), true);
});

test('syncStudioCustomGradientControls updates linear gradient inputs and chrome', () => {
  const classList = () => ({
    values: new Set(),
    add(value) {
      this.values.add(value);
    },
    remove(value) {
      this.values.delete(value);
    },
    contains(value) {
      return this.values.has(value);
    }
  });
  const elements = {
    cgLinearBtn: { className: '' },
    cgRadialBtn: { className: '' },
    cgAngleGroup: { classList: classList() },
    cgColor1: { value: '' },
    cgColor2: { value: '' },
    cgAngle: { value: '' },
    cgAngleVal: { textContent: '' }
  };
  const result = wallpaperView.syncStudioCustomGradientControls({
    documentRef: {
      getElementById(id) {
        return elements[id] || null;
      }
    },
    activeSlide: {
      style: {
        background: 'linear-gradient(210deg, #112233 0%, #445566 100%)'
      }
    }
  });

  assert.deepEqual(result, { didApply: true, gradientType: 'linear' });
  assert.equal(elements.cgColor1.value, '#112233');
  assert.equal(elements.cgColor2.value, '#445566');
  assert.equal(elements.cgAngle.value, '210');
  assert.equal(elements.cgAngleVal.textContent, '210°');
  assert.equal(elements.cgAngleGroup.classList.contains('hidden'), false);
});

test('bindStudioWallpaperTabControls wires the three wallpaper tabs', () => {
  const controls = Object.fromEntries([
    ['wpTabSolid', 'solid'],
    ['wpTabPresets', 'presets'],
    ['wpTabCustom', 'custom']
  ].map(([id]) => [id, {
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    }
  }]));
  const calls = [];

  assert.deepEqual(
    wallpaperView.bindStudioWallpaperTabControls({
      documentRef: {
        getElementById(id) {
          return controls[id] || null;
        }
      },
      setWallpaperTab(tab) {
        calls.push(tab);
      }
    }),
    { wpTabSolid: true, wpTabPresets: true, wpTabCustom: true }
  );
  controls.wpTabSolid.listeners.click();
  controls.wpTabPresets.listeners.click();
  controls.wpTabCustom.listeners.click();
  assert.deepEqual(calls, ['solid', 'presets', 'custom']);
});

test('index keeps wallpaper tab navigation free of inline handlers', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.doesNotMatch(fileContent, /id="wpTabSolid"[^>]*onclick=/);
  assert.doesNotMatch(fileContent, /id="wpTabPresets"[^>]*onclick=/);
  assert.doesNotMatch(fileContent, /id="wpTabCustom"[^>]*onclick=/);
});

test('bindStudioCustomGradientTypeControls wires linear and radial actions', () => {
  const controls = {
    cgLinearBtn: { listeners: {}, addEventListener(type, handler) {
      this.listeners[type] = handler;
    } },
    cgRadialBtn: { listeners: {}, addEventListener(type, handler) {
      this.listeners[type] = handler;
    } }
  };
  const calls = [];

  assert.deepEqual(
    wallpaperView.bindStudioCustomGradientTypeControls({
      documentRef: {
        getElementById(id) {
          return controls[id] || null;
        }
      },
      setCustomGradientType(type) {
        calls.push(type);
      }
    }),
    { cgLinearBtn: true, cgRadialBtn: true }
  );
  controls.cgLinearBtn.listeners.click();
  controls.cgRadialBtn.listeners.click();
  assert.deepEqual(calls, ['linear', 'radial']);
});

test('index keeps custom gradient type controls free of inline handlers', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.doesNotMatch(fileContent, /id="cgLinearBtn"[^>]*onclick=/);
  assert.doesNotMatch(fileContent, /id="cgRadialBtn"[^>]*onclick=/);
});

test('bindStudioWallpaperSolidColorControl preserves picker apply and flush events', () => {
  const input = {
    value: '#123456',
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    }
  };
  const calls = [];

  assert.deepEqual(
    wallpaperView.bindStudioWallpaperSolidColorControl({
      documentRef: {
        getElementById(id) {
          return id === 'wallpaperCustomColor' ? input : null;
        }
      },
      applyPresetWallpaper(value, isCustomInput) {
        calls.push(['apply', value, isCustomInput]);
      },
      flushPendingWallpaperVersion() {
        calls.push(['flush']);
      }
    }),
    { wallpaperCustomColor: true }
  );
  input.listeners.input({ currentTarget: input });
  input.listeners.change();
  assert.deepEqual(calls, [['apply', '#123456', true], ['flush']]);
});

test('index keeps the solid wallpaper color picker free of inline handlers', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.doesNotMatch(fileContent, /id="wallpaperCustomColor"[^>]*oninput=/);
  assert.doesNotMatch(fileContent, /id="wallpaperCustomColor"[^>]*onchange=/);
});

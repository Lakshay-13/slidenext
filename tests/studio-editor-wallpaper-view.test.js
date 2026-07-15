const test = require('node:test');
const assert = require('node:assert/strict');

const wallpaperView = require('../shared/studio-editor-wallpaper-view.js');

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

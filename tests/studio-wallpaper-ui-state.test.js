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

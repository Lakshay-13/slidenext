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

test('resetStudioDeckUiState clears stale sidebar chrome and disables stale inspector controls for loading and idle states', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resetStudioDeckUiStateSource = extractFunctionSource(
    fileContent,
    'function resetStudioDeckUiState(options = {}) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const elements = {
    slideCountLabel: { textContent: '5 / 12' },
    thumbnailsList: { innerHTML: '<div>Old thumbnails</div>' },
    slideLayersList: { innerHTML: '<div>Old layers</div>' },
    inspectorTargetLabel: { innerHTML: '<span>Editing div</span>' },
    slideInspectorPanel: { classList: createClassList(['hidden']) },
    elementInspectorPanel: { classList: createClassList([]) },
    toggleLockSelectionIcon: { textContent: 'lock_open' },
    toggleLockSelectionLabel: { textContent: 'Unlock Selected' },
    toggleVisibilitySelectionIcon: { textContent: 'visibility' },
    toggleVisibilitySelectionLabel: { textContent: 'Show Selected' },
    addSlideBtn: { disabled: false },
    insertHeadingBtn: { disabled: false },
    insertParagraphBtn: { disabled: false },
    insertImageBtn: { disabled: false },
    insertShapeBtn: { disabled: false },
    insertTableBtn: { disabled: false },
    insertCodeBtn: { disabled: false },
    wpTabSolid: { disabled: false },
    wpTabPresets: { disabled: false },
    wpTabCustom: { disabled: false },
    wallpaperCustomColor: { disabled: false },
    cgLinearBtn: { disabled: false },
    cgRadialBtn: { disabled: false },
    cgColor1: { disabled: false },
    cgColor2: { disabled: false },
    cgAngle: { disabled: false },
    applyWallpaperToAllSlidesBtn: { disabled: false },
    wallpaperSolidsList: {
      buttons: [{ disabled: false }, { disabled: false }],
      querySelectorAll(selector) {
        return selector === 'button' ? this.buttons : [];
      }
    },
    wallpaperGradientsList: {
      buttons: [{ disabled: false }, { disabled: false }],
      querySelectorAll(selector) {
        return selector === 'button' ? this.buttons : [];
      }
    },
    slidePasteClipboardBtn: { disabled: false },
    copySelectionBtn: { disabled: false },
    pasteClipboardBtn: { disabled: false },
    toggleLockSelectionBtn: { disabled: false },
    toggleVisibilitySelectionBtn: { disabled: false },
    removeSelectionBtn: { disabled: false },
    nudgeSelectionUpBtn: { disabled: false },
    nudgeSelectionLeftBtn: { disabled: false },
    nudgeSelectionRightBtn: { disabled: false },
    nudgeSelectionDownBtn: { disabled: false },
    arrangeLayerFrontBtn: { disabled: false },
    arrangeLayerBackBtn: { disabled: false },
    arrangeLayerForwardBtn: { disabled: false },
    arrangeLayerBackwardBtn: { disabled: false },
    elZIndex: { disabled: false },
    elTextContent: { disabled: false },
    elImageSrc: { disabled: false },
    elFontSize: { disabled: false },
    elFontFamily: { disabled: false },
    elFontWeight: { disabled: false },
    alignLeftBtn: { disabled: false },
    alignCenterBtn: { disabled: false },
    alignRightBtn: { disabled: false },
    alignJustifyBtn: { disabled: false },
    elTextColor: { disabled: false },
    elOpacity: { disabled: false },
    elBorderStyle: { disabled: false },
    elBorderWidth: { disabled: false },
    elBorderRadius: { disabled: false },
    elBorderColor: { disabled: false }
  };

  const documentStub = {
    getElementById(id) {
      return elements[id] || null;
    }
  };

  const context = {
    document: documentStub
  };

  vm.createContext(context);
  vm.runInContext(resetStudioDeckUiStateSource, context);

  context.resetStudioDeckUiState({ isLoading: true });
  assert.equal(elements.slideCountLabel.textContent, '0 / 0');
  assert.match(elements.thumbnailsList.innerHTML, /Loading slides\.\.\./);
  assert.match(elements.slideLayersList.innerHTML, /Loading layers\.\.\./);
  assert.match(elements.inspectorTargetLabel.innerHTML, /No selection active/);
  assert.equal(elements.slideInspectorPanel.classList.contains('hidden'), false);
  assert.equal(elements.elementInspectorPanel.classList.contains('hidden'), true);
  assert.equal(elements.toggleLockSelectionIcon.textContent, 'lock');
  assert.equal(elements.toggleLockSelectionLabel.textContent, 'Lock Selected');
  assert.equal(elements.toggleVisibilitySelectionIcon.textContent, 'visibility_off');
  assert.equal(elements.toggleVisibilitySelectionLabel.textContent, 'Hide Selected');
  [
    'addSlideBtn',
    'insertHeadingBtn',
    'insertParagraphBtn',
    'insertImageBtn',
    'insertShapeBtn',
    'insertTableBtn',
    'insertCodeBtn',
    'wpTabSolid',
    'wpTabPresets',
    'wpTabCustom',
    'wallpaperCustomColor',
    'cgLinearBtn',
    'cgRadialBtn',
    'cgColor1',
    'cgColor2',
    'cgAngle',
    'applyWallpaperToAllSlidesBtn',
    'slidePasteClipboardBtn',
    'copySelectionBtn',
    'pasteClipboardBtn',
    'toggleLockSelectionBtn',
    'toggleVisibilitySelectionBtn',
    'removeSelectionBtn',
    'nudgeSelectionUpBtn',
    'nudgeSelectionLeftBtn',
    'nudgeSelectionRightBtn',
    'nudgeSelectionDownBtn',
    'arrangeLayerFrontBtn',
    'arrangeLayerBackBtn',
    'arrangeLayerForwardBtn',
    'arrangeLayerBackwardBtn',
    'elZIndex',
    'elTextContent',
    'elImageSrc',
    'elFontSize',
    'elFontFamily',
    'elFontWeight',
    'alignLeftBtn',
    'alignCenterBtn',
    'alignRightBtn',
    'alignJustifyBtn',
    'elTextColor',
    'elOpacity',
    'elBorderStyle',
    'elBorderWidth',
    'elBorderRadius',
    'elBorderColor'
  ].forEach((id) => {
    assert.equal(elements[id].disabled, true, `${id} should be disabled`);
  });
  assert.deepEqual(elements.wallpaperSolidsList.buttons.map((button) => button.disabled), [true, true]);
  assert.deepEqual(elements.wallpaperGradientsList.buttons.map((button) => button.disabled), [true, true]);

  context.resetStudioDeckUiState();
  assert.equal(elements.slideCountLabel.textContent, '0 / 0');
  assert.match(elements.thumbnailsList.innerHTML, /No slides loaded/);
  assert.match(elements.slideLayersList.innerHTML, /No active slide/);
});

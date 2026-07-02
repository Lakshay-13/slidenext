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
    inspectorTextContentGroup: { classList: createClassList(['hidden']) },
    inspectorImageGroup: { classList: createClassList([]) },
    inspectorBorderGroup: { classList: createClassList([]) },
    wpPanelSolid: { classList: createClassList(['hidden']) },
    wpPanelPresets: { classList: createClassList([]) },
    wpPanelCustom: { classList: createClassList([]) },
    toggleLockSelectionIcon: { textContent: 'lock_open' },
    toggleLockSelectionLabel: { textContent: 'Unlock Selected' },
    toggleVisibilitySelectionIcon: { textContent: 'visibility' },
    toggleVisibilitySelectionLabel: { textContent: 'Show Selected' },
    launchPreviewBtn: { disabled: false },
    studioSaveBtn: { disabled: false },
    studioVersionBtn: { disabled: false },
    addSlideBtn: { disabled: false },
    zoomOutBtn: { disabled: false },
    zoomSelect: { disabled: false },
    zoomInBtn: { disabled: false },
    toolbarInsertHeadingBtn: { disabled: false },
    toolbarInsertParagraphBtn: { disabled: false },
    toolbarInsertImageBtn: { disabled: false },
    toolbarInsertShapeBtn: { disabled: false },
    insertHeadingBtn: { disabled: false },
    insertParagraphBtn: { disabled: false },
    insertImageBtn: { disabled: false },
    insertShapeBtn: { disabled: false },
    insertTableBtn: { disabled: false },
    insertCodeBtn: { disabled: false },
    wpTabSolid: { disabled: false, className: 'stale-solid' },
    wpTabPresets: { disabled: false, className: 'stale-presets' },
    wpTabCustom: { disabled: false, className: 'stale-custom' },
    wallpaperCustomColor: { disabled: false },
    cgLinearBtn: { disabled: false },
    cgRadialBtn: { disabled: false },
    cgColor1: { disabled: false },
    cgColor2: { disabled: false },
    cgAngle: { disabled: false },
    applyWallpaperToAllSlidesBtn: { disabled: false },
    studioUndoBtn: { disabled: false },
    studioRedoBtn: { disabled: false },
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
    elZIndex: { disabled: false, value: '9' },
    elTextContent: { disabled: false, value: 'Stale copy' },
    elImageSrc: { disabled: false, value: 'https://example.com/stale.png' },
    elFontSize: { disabled: false, value: '42' },
    fontSizeVal: { textContent: '42px' },
    elFontFamily: { disabled: false, value: 'Georgia, serif' },
    elFontWeight: { disabled: false, value: '700' },
    alignLeftBtn: { disabled: false },
    alignCenterBtn: { disabled: false },
    alignRightBtn: { disabled: false },
    alignJustifyBtn: { disabled: false },
    elTextColor: { disabled: false, value: '#123456' },
    elOpacity: { disabled: false, value: '27' },
    opacityVal: { textContent: '27%' },
    elBorderStyle: { disabled: false, value: 'dashed' },
    elBorderWidth: { disabled: false, value: '7' },
    borderWidthVal: { textContent: '7px' },
    elBorderRadius: { disabled: false, value: '13' },
    borderRadiusVal: { textContent: '13px' },
    elBorderColor: { disabled: false, value: '#abcdef' }
  };

  const documentStub = {
    getElementById(id) {
      return elements[id] || null;
    }
  };

  const context = {
    document: documentStub,
    hasPendingCustomWallpaperVersion: true,
    wallpaperTab: 'custom'
  };

  vm.createContext(context);
  vm.runInContext(resetStudioDeckUiStateSource, context);

  context.resetStudioDeckUiState({ isLoading: true });
  assert.equal(context.hasPendingCustomWallpaperVersion, false);
  assert.equal(context.wallpaperTab, 'solid');
  assert.equal(elements.slideCountLabel.textContent, '0 / 0');
  assert.match(elements.thumbnailsList.innerHTML, /Loading slides\.\.\./);
  assert.match(elements.slideLayersList.innerHTML, /Loading layers\.\.\./);
  assert.match(elements.inspectorTargetLabel.innerHTML, /No selection active/);
  assert.equal(elements.slideInspectorPanel.classList.contains('hidden'), false);
  assert.equal(elements.elementInspectorPanel.classList.contains('hidden'), true);
  assert.equal(elements.inspectorTextContentGroup.classList.contains('hidden'), false);
  assert.equal(elements.inspectorImageGroup.classList.contains('hidden'), true);
  assert.equal(elements.inspectorBorderGroup.classList.contains('hidden'), true);
  assert.equal(elements.wpPanelSolid.classList.contains('hidden'), false);
  assert.equal(elements.wpPanelPresets.classList.contains('hidden'), true);
  assert.equal(elements.wpPanelCustom.classList.contains('hidden'), true);
  assert.match(elements.wpTabSolid.className, /bg-white\/5/);
  assert.equal(elements.wpTabPresets.className, 'py-1 text-center text-[10px] font-mono rounded text-zinc-400 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-zinc-400');
  assert.equal(elements.wpTabCustom.className, 'py-1 text-center text-[10px] font-mono rounded text-zinc-400 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-zinc-400');
  assert.equal(elements.toggleLockSelectionIcon.textContent, 'lock');
  assert.equal(elements.toggleLockSelectionLabel.textContent, 'Lock Selected');
  assert.equal(elements.toggleVisibilitySelectionIcon.textContent, 'visibility_off');
  assert.equal(elements.toggleVisibilitySelectionLabel.textContent, 'Hide Selected');
  assert.equal(elements.elTextContent.value, '');
  assert.equal(elements.elImageSrc.value, '');
  assert.equal(elements.elFontSize.value, '16');
  assert.equal(elements.fontSizeVal.textContent, '16px');
  assert.equal(elements.elFontFamily.value, "'Geist', sans-serif");
  assert.equal(elements.elFontWeight.value, '400');
  assert.equal(elements.elTextColor.value, '#ffffff');
  assert.equal(elements.elZIndex.value, '0');
  assert.equal(elements.elOpacity.value, '100');
  assert.equal(elements.opacityVal.textContent, '100%');
  assert.equal(elements.elBorderStyle.value, 'none');
  assert.equal(elements.elBorderWidth.value, '0');
  assert.equal(elements.borderWidthVal.textContent, '0px');
  assert.equal(elements.elBorderRadius.value, '0');
  assert.equal(elements.borderRadiusVal.textContent, '0px');
  assert.equal(elements.elBorderColor.value, '#ffffff');
  [
    'launchPreviewBtn',
    'studioSaveBtn',
    'studioVersionBtn',
    'addSlideBtn',
    'zoomOutBtn',
    'zoomSelect',
    'zoomInBtn',
    'toolbarInsertHeadingBtn',
    'toolbarInsertParagraphBtn',
    'toolbarInsertImageBtn',
    'toolbarInsertShapeBtn',
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
    'studioUndoBtn',
    'studioRedoBtn',
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

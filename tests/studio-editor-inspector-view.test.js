const test = require('node:test');
const assert = require('node:assert/strict');

const inspectorView = require('../shared/studio-editor-inspector-view.js');

function createClassList() {
  const values = new Set();
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
}

test('renderStudioInspectorSelectionSummary shows slide inspector for an empty selection', () => {
  const nodes = {
    inspectorTargetLabel: { innerHTML: '' },
    slideInspectorPanel: { classList: createClassList() },
    elementInspectorPanel: { classList: createClassList() }
  };

  const result = inspectorView.renderStudioInspectorSelectionSummary({
    documentRef: {
      getElementById(id) {
        return nodes[id] || null;
      }
    },
    selectionState: { hasSelection: false }
  });

  assert.deepEqual(result, {
    hasSelection: false,
    isMulti: false,
    primaryElement: null
  });
  assert.match(nodes.inspectorTargetLabel.innerHTML, /No selection active/);
  assert.equal(nodes.slideInspectorPanel.classList.contains('hidden'), false);
  assert.equal(nodes.elementInspectorPanel.classList.contains('hidden'), true);
});

test('renderStudioInspectorSelectionSummary shows element inspector and selection label', () => {
  const primaryElement = { tagName: 'DIV' };
  const nodes = {
    inspectorTargetLabel: { innerHTML: '' },
    slideInspectorPanel: { classList: createClassList() },
    elementInspectorPanel: { classList: createClassList() }
  };

  const result = inspectorView.renderStudioInspectorSelectionSummary({
    documentRef: {
      getElementById(id) {
        return nodes[id] || null;
      }
    },
    selectionState: {
      hasSelection: true,
      count: 2,
      primaryElement
    }
  });

  assert.equal(result.hasSelection, true);
  assert.equal(result.isMulti, true);
  assert.equal(result.primaryElement, primaryElement);
  assert.match(nodes.inspectorTargetLabel.innerHTML, /Editing 2 elements/);
  assert.equal(nodes.slideInspectorPanel.classList.contains('hidden'), true);
  assert.equal(nodes.elementInspectorPanel.classList.contains('hidden'), false);
});

test('renderStudioInspectorAlignmentState highlights only the selected alignment control', () => {
  const nodes = {
    alignLeftBtn: { className: '' },
    alignCenterBtn: { className: '' },
    alignRightBtn: { className: '' },
    alignJustifyBtn: { className: '' }
  };

  assert.equal(inspectorView.renderStudioInspectorAlignmentState({
    documentRef: {
      getElementById(id) {
        return nodes[id] || null;
      }
    },
    align: 'center'
  }), true);
  assert.match(nodes.alignCenterBtn.className, /bg-\[#7028d0\]/);
  assert.match(nodes.alignLeftBtn.className, /hover:bg-white\/5/);
  assert.match(nodes.alignRightBtn.className, /hover:bg-white\/5/);
  assert.match(nodes.alignJustifyBtn.className, /hover:bg-white\/5/);
});

test('resetStudioInspectorUiState clears stale alignment chrome', () => {
  const inactiveClass = /hover:bg-white\/5/;
  const nodes = {
    inspectorTargetLabel: { innerHTML: '' },
    slideInspectorPanel: { classList: createClassList() },
    elementInspectorPanel: { classList: createClassList() },
    alignLeftBtn: { className: 'active' },
    alignCenterBtn: { className: 'active' },
    alignRightBtn: { className: 'active' },
    alignJustifyBtn: { className: 'active' }
  };

  assert.equal(inspectorView.resetStudioInspectorUiState({
    documentRef: {
      getElementById(id) {
        return nodes[id] || null;
      }
    }
  }), true);
  assert.match(nodes.alignLeftBtn.className, inactiveClass);
  assert.match(nodes.alignCenterBtn.className, inactiveClass);
  assert.match(nodes.alignRightBtn.className, inactiveClass);
  assert.match(nodes.alignJustifyBtn.className, inactiveClass);
});

test('syncStudioInspectorContentControls switches between image and text controls', () => {
  const classLists = {
    imageGroup: createClassList(),
    textGroup: createClassList()
  };
  const nodes = {
    elTextContent: { value: '' },
    inspectorImageGroup: { classList: classLists.imageGroup },
    elImageSrc: { value: '' },
    elImageFit: { value: '', disabled: true },
    elImagePosition: { value: '', disabled: true },
    inspectorTextContentGroup: { classList: classLists.textGroup }
  };
  const image = {
    tagName: 'IMG',
    innerText: '',
    textContent: 'Caption',
    src: '/image.png'
  };

  assert.equal(inspectorView.syncStudioInspectorContentControls({
    documentRef: {
      getElementById(id) {
        return nodes[id] || null;
      }
    },
    primaryElement: image,
    isMulti: false,
    computedStyles: { objectFit: 'cover', objectPosition: 'right bottom' }
  }), true);
  assert.equal(nodes.elTextContent.value, 'Caption');
  assert.equal(nodes.elImageSrc.value, '/image.png');
  assert.equal(nodes.elImageFit.value, 'cover');
  assert.equal(nodes.elImageFit.disabled, false);
  assert.equal(nodes.elImagePosition.value, 'right bottom');
  assert.equal(nodes.elImagePosition.disabled, false);
  assert.equal(classLists.imageGroup.contains('hidden'), false);
  assert.equal(classLists.textGroup.contains('hidden'), true);
});

test('syncStudioInspectorContentControls disables crop position when image fit is not crop', () => {
  const nodes = {
    inspectorImageGroup: { classList: createClassList() },
    elImageSrc: { value: '' },
    elImageFit: { value: '', disabled: true },
    elImagePosition: { value: '', disabled: true },
    inspectorTextContentGroup: { classList: createClassList() }
  };

  inspectorView.syncStudioInspectorContentControls({
    documentRef: {
      getElementById(id) {
        return nodes[id] || null;
      }
    },
    primaryElement: { tagName: 'IMG', style: {}, src: '/image.png' },
    isMulti: false,
    computedStyles: { objectFit: 'contain', objectPosition: 'right bottom' }
  });

  assert.equal(nodes.elImageFit.value, 'contain');
  assert.equal(nodes.elImagePosition.value, 'right bottom');
  assert.equal(nodes.elImagePosition.disabled, true);
});

test('syncStudioInspectorTypographyControls applies font, color, alignment, z-index, and opacity values', () => {
  const nodes = {
    elFontSize: { value: '' },
    fontSizeVal: { textContent: '' },
    elFontFamily: { value: '', options: [{ value: "'Geist', sans-serif" }] },
    elFontWeight: { value: '' },
    elTextColor: { value: '' },
    elZIndex: { value: '' },
    elOpacity: { value: '' },
    opacityVal: { textContent: '' }
  };
  const alignment = [];
  const element = { style: { zIndex: '4' } };

  assert.equal(inspectorView.syncStudioInspectorTypographyControls({
    documentRef: {
      getElementById(id) {
        return nodes[id] || null;
      }
    },
    primaryElement: element,
    computedStyles: {
      fontSize: '22px',
      fontFamily: "'Geist', sans-serif",
      fontWeight: '600',
      color: 'rgb(1, 2, 3)',
      textAlign: 'right',
      opacity: '0.65'
    },
    rgbToHex() {
      return '#010203';
    },
    highlightAlignButton(value) {
      alignment.push(value);
    }
  }), true);
  assert.equal(nodes.elFontSize.value, 22);
  assert.equal(nodes.fontSizeVal.textContent, '22px');
  assert.equal(nodes.elFontWeight.value, '600');
  assert.equal(nodes.elTextColor.value, '#010203');
  assert.equal(nodes.elZIndex.value, '4');
  assert.equal(nodes.elOpacity.value, 65);
  assert.equal(nodes.opacityVal.textContent, '65%');
  assert.deepEqual(alignment, ['right']);
});

test('syncStudioInspectorTypographyControls prefers canonical z-index data', () => {
  const zIndexInput = { value: '' };

  assert.equal(inspectorView.syncStudioInspectorTypographyControls({
    documentRef: {
      getElementById(id) {
        return id === 'elZIndex' ? zIndexInput : null;
      }
    },
    primaryElement: { style: { zIndex: '12' } },
    canonicalNode: { layout: { zIndex: 7 } },
    computedStyles: {
      fontFamily: 'sans-serif',
      color: '#fff'
    }
  }), true);
  assert.equal(zIndexInput.value, '7');
});

test('syncStudioInspectorTypographyControls prefers canonical opacity data', () => {
  const opacityInput = { value: '' };
  const opacityLabel = { textContent: '' };

  assert.equal(inspectorView.syncStudioInspectorTypographyControls({
    documentRef: {
      getElementById(id) {
        if (id === 'elOpacity') return opacityInput;
        if (id === 'opacityVal') return opacityLabel;
        return null;
      }
    },
    primaryElement: { style: { opacity: '0.12' } },
    canonicalNode: { style: 'opacity: 0.42; color: #fff;' },
    computedStyles: {
      fontFamily: 'sans-serif',
      color: '#fff',
      opacity: '0.9'
    }
  }), true);
  assert.equal(opacityInput.value, 42);
  assert.equal(opacityLabel.textContent, '42%');
});

test('syncStudioInspectorTypographyControls prefers canonical font-size data', () => {
  const fontSizeInput = { value: '' };
  const fontSizeLabel = { textContent: '' };

  assert.equal(inspectorView.syncStudioInspectorTypographyControls({
    documentRef: {
      getElementById(id) {
        if (id === 'elFontSize') return fontSizeInput;
        if (id === 'fontSizeVal') return fontSizeLabel;
        return null;
      }
    },
    primaryElement: { style: { fontSize: '12px' } },
    canonicalNode: { style: 'font-size: 28px;' },
    computedStyles: {
      fontSize: '14px',
      fontFamily: 'sans-serif',
      color: '#fff'
    }
  }), true);
  assert.equal(fontSizeInput.value, 28);
  assert.equal(fontSizeLabel.textContent, '28px');
});

test('syncStudioInspectorTypographyControls prefers canonical font-weight data', () => {
  const fontWeightInput = { value: '' };

  assert.equal(inspectorView.syncStudioInspectorTypographyControls({
    documentRef: {
      getElementById(id) {
        return id === 'elFontWeight' ? fontWeightInput : null;
      }
    },
    primaryElement: { style: { fontWeight: '400' } },
    canonicalNode: { style: 'font-weight: 700;' },
    computedStyles: {
      fontFamily: 'sans-serif',
      color: '#fff',
      fontWeight: '400'
    }
  }), true);
  assert.equal(fontWeightInput.value, '700');
});

test('syncStudioInspectorTypographyControls prefers canonical font-family data', () => {
  const familySelect = {
    value: '',
    options: [
      { value: "'Geist', sans-serif" },
      { value: "'Source Sans 3', sans-serif" }
    ]
  };

  assert.equal(inspectorView.syncStudioInspectorTypographyControls({
    documentRef: {
      getElementById(id) {
        return id === 'elFontFamily' ? familySelect : null;
      }
    },
    primaryElement: { style: { fontFamily: 'Geist' } },
    canonicalNode: { style: "font-family: 'Source Sans 3', sans-serif;" },
    computedStyles: {
      fontFamily: "'Geist', sans-serif",
      color: '#fff'
    }
  }), true);
  assert.equal(familySelect.value, "'Source Sans 3', sans-serif");
});

test('syncStudioInspectorTypographyControls prefers canonical text color data', () => {
  const textColorInput = { value: '' };

  assert.equal(inspectorView.syncStudioInspectorTypographyControls({
    documentRef: {
      getElementById(id) {
        return id === 'elTextColor' ? textColorInput : null;
      }
    },
    primaryElement: { style: { color: 'rgb(1, 2, 3)' } },
    canonicalNode: { style: 'color: #112233;' },
    computedStyles: {
      fontFamily: 'sans-serif',
      color: 'rgb(255, 255, 255)'
    },
    rgbToHex(value) {
      return value;
    }
  }), true);
  assert.equal(textColorInput.value, '#112233');
});

test('syncStudioInspectorTypographyControls prefers canonical text alignment data', () => {
  const alignments = [];

  assert.equal(inspectorView.syncStudioInspectorTypographyControls({
    documentRef: {
      getElementById() {
        return null;
      }
    },
    primaryElement: { style: { textAlign: 'left' } },
    canonicalNode: { style: 'text-align: right;' },
    computedStyles: {
      fontFamily: 'sans-serif',
      color: '#fff',
      textAlign: 'left'
    },
    highlightAlignButton(value) {
      alignments.push(value);
    }
  }), true);
  assert.deepEqual(alignments, ['right']);
});

test('syncStudioInspectorBorderControls prefers canonical border-style data', () => {
  const classList = createClassList();
  classList.add('editor-shape');
  const borderStyleInput = { value: '' };

  assert.equal(inspectorView.syncStudioInspectorBorderControls({
    documentRef: {
      getElementById(id) {
        return id === 'elBorderStyle' ? borderStyleInput : null;
      }
    },
    selection: [{ tagName: 'DIV', classList }],
    canonicalNode: { style: 'border-style: dashed;' },
    computedStyles: {
      borderStyle: 'solid',
      borderWidth: '1px',
      borderRadius: '2px',
      borderColor: '#fff'
    },
    rgbToHex(value) {
      return value;
    }
  }), true);
  assert.equal(borderStyleInput.value, 'dashed');
});

test('syncStudioInspectorBorderControls prefers canonical border-width data', () => {
  const classList = createClassList();
  classList.add('editor-shape');
  const borderWidthInput = { value: '' };
  const borderWidthLabel = { textContent: '' };

  assert.equal(inspectorView.syncStudioInspectorBorderControls({
    documentRef: {
      getElementById(id) {
        if (id === 'elBorderWidth') return borderWidthInput;
        if (id === 'borderWidthVal') return borderWidthLabel;
        return null;
      }
    },
    selection: [{ tagName: 'DIV', classList }],
    canonicalNode: { style: 'border-width: 5px;' },
    computedStyles: {
      borderStyle: 'solid',
      borderWidth: '1px',
      borderRadius: '2px',
      borderColor: '#fff'
    },
    rgbToHex(value) {
      return value;
    }
  }), true);
  assert.equal(borderWidthInput.value, 5);
  assert.equal(borderWidthLabel.textContent, '5px');
});

test('syncStudioInspectorBorderControls applies border values for shape-like selections', () => {
  const classList = createClassList();
  classList.add('editor-shape');
  const nodes = {
    inspectorBorderGroup: { classList },
    elBorderStyle: { value: '' },
    elBorderWidth: { value: '' },
    borderWidthVal: { textContent: '' },
    elBorderRadius: { value: '' },
    borderRadiusVal: { textContent: '' },
    elBorderColor: { value: '' }
  };

  assert.equal(inspectorView.syncStudioInspectorBorderControls({
    documentRef: {
      getElementById(id) {
        return nodes[id] || null;
      }
    },
    selection: [{ tagName: 'DIV', classList }],
    computedStyles: {
      borderStyle: 'solid',
      borderWidth: '3px',
      borderRadius: '9px',
      borderColor: 'rgb(1, 2, 3)'
    },
    rgbToHex() {
      return '#010203';
    }
  }), true);
  assert.equal(nodes.elBorderStyle.value, 'solid');
  assert.equal(nodes.elBorderWidth.value, 3);
  assert.equal(nodes.borderWidthVal.textContent, '3px');
  assert.equal(nodes.elBorderRadius.value, 9);
  assert.equal(nodes.borderRadiusVal.textContent, '9px');
  assert.equal(nodes.elBorderColor.value, '#010203');
  assert.equal(classList.contains('hidden'), false);
});

test('syncStudioInspectorSelection coordinates summary, computed styles, and inspector controls', () => {
  const calls = [];
  const primaryElement = {
    tagName: 'DIV',
    innerText: 'Title',
    style: { zIndex: '3' },
    ownerDocument: {
      defaultView: {
        getComputedStyle(element) {
          calls.push(['getComputedStyle', element]);
          return {
            fontSize: '20px',
            fontFamily: "'Geist', sans-serif",
            fontWeight: '700',
            color: 'rgb(1, 2, 3)',
            textAlign: 'center',
            opacity: '0.8',
            borderStyle: 'solid',
            borderWidth: '1px',
            borderRadius: '4px',
            borderColor: 'rgb(1, 2, 3)'
          };
        }
      }
    },
    classList: {
      contains() {
        return true;
      }
    }
  };
  const selectionState = {
    hasSelection: true,
    count: 1,
    primaryElement,
    selection: [primaryElement]
  };
  const documentRef = {
    getElementById() {
      return null;
    }
  };

  assert.equal(inspectorView.syncStudioInspectorSelection({
    documentRef,
    selectionState,
    rgbToHex(value) {
      calls.push(['rgbToHex', value]);
      return '#010203';
    },
    highlightAlignButton(value) {
      calls.push(['highlightAlignButton', value]);
    }
  }), true);
  assert.deepEqual(calls, [
    ['getComputedStyle', primaryElement],
    ['highlightAlignButton', 'center']
  ]);
});

test('syncStudioInspectorSelection forwards canonical node data to typography controls', () => {
  const zIndexInput = { value: '' };
  const primaryElement = {
    tagName: 'DIV',
    innerText: 'Title',
    style: { zIndex: '3' },
    ownerDocument: {
      defaultView: {
        getComputedStyle() {
          return {
            fontSize: '20px',
            fontFamily: 'sans-serif',
            fontWeight: '700',
            color: '#fff',
            textAlign: 'center',
            opacity: '1'
          };
        }
      }
    },
    classList: {
      contains() {
        return false;
      }
    }
  };

  assert.equal(inspectorView.syncStudioInspectorSelection({
    documentRef: {
      getElementById(id) {
        return id === 'elZIndex' ? zIndexInput : null;
      }
    },
    selectionState: {
      hasSelection: true,
      count: 1,
      primaryElement,
      selection: [primaryElement]
    },
    canonicalNode: { layout: { zIndex: 11 } }
  }), true);
  assert.equal(zIndexInput.value, '11');
});

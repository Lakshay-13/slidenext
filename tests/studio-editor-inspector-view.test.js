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

test('syncStudioInspectorContentControls switches between image and text controls', () => {
  const classLists = {
    imageGroup: createClassList(),
    textGroup: createClassList()
  };
  const nodes = {
    elTextContent: { value: '' },
    inspectorImageGroup: { classList: classLists.imageGroup },
    elImageSrc: { value: '' },
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
    isMulti: false
  }), true);
  assert.equal(nodes.elTextContent.value, 'Caption');
  assert.equal(nodes.elImageSrc.value, '/image.png');
  assert.equal(classLists.imageGroup.contains('hidden'), false);
  assert.equal(classLists.textGroup.contains('hidden'), true);
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

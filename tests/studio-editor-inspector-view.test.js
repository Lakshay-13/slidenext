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

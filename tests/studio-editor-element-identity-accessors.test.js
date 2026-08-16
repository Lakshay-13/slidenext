const test = require('node:test');
const assert = require('node:assert/strict');

const elementIdentityAccessors = require('../shared/studio-editor-element-identity-accessors.js');

test('element identity accessors resolve adapter, DOM, document, and options consistently', () => {
  const doc = { id: 'iframe-doc' };
  const domApi = { name: 'dom-api' };
  const calls = [];
  const accessors = elementIdentityAccessors.createStudioEditorElementIdentityAccessors({
    elementIdentityAdapter: {
      isStudioEditorElementEligible(element, options) {
        calls.push(['eligible', element, options]);
        return true;
      },
      assignStudioEditorElementId(element, options) {
        calls.push(['assign', element, options]);
        return 'element-1';
      },
      getStudioEditorElementById(editorId, docValue, options) {
        calls.push(['lookup', editorId, docValue, options]);
        return { id: editorId };
      }
    },
    domApi,
    getDocument: () => doc,
    getDomOptions: (overrides = {}) => ({
      editorElementIdAttr: 'data-editor-id',
      ...overrides
    })
  });
  const element = { id: 'node-1' };

  assert.equal(accessors.isElementEligible(element, { selectable: true }), true);
  assert.equal(accessors.assignElementId(element, { source: 'test' }), 'element-1');
  assert.deepEqual(accessors.getElementById('element-2'), { id: 'element-2' });
  assert.deepEqual(calls, [
    ['eligible', element, {
      domApi,
      domOptions: { editorElementIdAttr: 'data-editor-id', selectable: true }
    }],
    ['assign', element, {
      domApi,
      domOptions: { editorElementIdAttr: 'data-editor-id', source: 'test' }
    }],
    ['lookup', 'element-2', doc, {
      domApi,
      domOptions: { editorElementIdAttr: 'data-editor-id' }
    }]
  ]);
});

test('element identity accessors fail closed when the adapter is unavailable', () => {
  const accessors = elementIdentityAccessors.createStudioEditorElementIdentityAccessors({
    elementIdentityAdapter: null
  });

  assert.equal(accessors.isElementEligible({}), false);
  assert.equal(accessors.assignElementId({}), '');
  assert.equal(accessors.getElementById('element-1'), null);
});

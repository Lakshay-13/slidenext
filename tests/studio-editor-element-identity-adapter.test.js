const test = require('node:test');
const assert = require('node:assert/strict');

const elementIdentityAdapter = require('../shared/studio-editor-element-identity-adapter.js');

test('isStudioEditorElementEligible delegates the element and options', () => {
  const element = { id: 'element-1' };
  const domOptions = { blockedIds: ['editor-overlay'] };
  let delegated = null;

  const result = elementIdentityAdapter.isStudioEditorElementEligible(element, {
    domApi: {
      isEligibleEditableElement(elementValue, optionsValue) {
        delegated = { elementValue, optionsValue };
        return true;
      }
    },
    domOptions
  });

  assert.equal(result, true);
  assert.equal(delegated.elementValue, element);
  assert.equal(delegated.optionsValue, domOptions);
});

test('assignStudioEditorElementId delegates the element and options', () => {
  const element = { id: 'element-node' };
  const domOptions = { elementAttrName: 'data-editor-id' };
  let delegated = null;

  const result = elementIdentityAdapter.assignStudioEditorElementId(element, {
    domApi: {
      assignStudioElementId(elementValue, optionsValue) {
        delegated = { elementValue, optionsValue };
        return 'element-1';
      }
    },
    domOptions
  });

  assert.equal(result, 'element-1');
  assert.equal(delegated.elementValue, element);
  assert.equal(delegated.optionsValue, domOptions);
});

test('getStudioEditorElementById delegates the ID, document, and options', () => {
  const doc = { id: 'iframe-doc' };
  const element = { id: 'element-node' };
  const domOptions = { elementAttrName: 'data-editor-id' };
  let delegated = null;

  const result = elementIdentityAdapter.getStudioEditorElementById('element-1', doc, {
    domApi: {
      getElementByEditorId(editorId, docValue, optionsValue) {
        delegated = { editorId, docValue, optionsValue };
        return element;
      }
    },
    domOptions
  });

  assert.equal(result, element);
  assert.equal(delegated.editorId, 'element-1');
  assert.equal(delegated.docValue, doc);
  assert.equal(delegated.optionsValue, domOptions);
});

test('element identity adapter prefers explicit readers', () => {
  const options = {
    domApi: {
      isEligibleEditableElement() {
        throw new Error('DOM eligibility fallback should not run');
      },
      assignStudioElementId() {
        throw new Error('DOM assignment fallback should not run');
      },
      getElementByEditorId() {
        throw new Error('DOM element lookup fallback should not run');
      }
    },
    eligibilityReader: () => true,
    elementIdAssigner: () => 'explicit-element',
    elementByIdReader: () => ({ id: 'explicit-element' }),
    domOptions: {}
  };

  assert.equal(elementIdentityAdapter.isStudioEditorElementEligible({}, options), true);
  assert.equal(elementIdentityAdapter.assignStudioEditorElementId({}, options), 'explicit-element');
  assert.deepEqual(
    elementIdentityAdapter.getStudioEditorElementById('id', {}, options),
    { id: 'explicit-element' }
  );
});

test('element identity adapter fails closed without the requested operation', () => {
  assert.equal(elementIdentityAdapter.isStudioEditorElementEligible({}), false);
  assert.equal(elementIdentityAdapter.assignStudioEditorElementId({}), '');
  assert.equal(elementIdentityAdapter.getStudioEditorElementById('id', {}), null);
});

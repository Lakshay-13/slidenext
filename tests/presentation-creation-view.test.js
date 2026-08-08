const test = require('node:test');
const assert = require('node:assert/strict');

const presentationCreationView = require('../shared/presentation-creation-view.js');

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

function createDocumentStub() {
  const elements = {
    createPresentationModal: {
      classList: createClassList(['hidden', 'opacity-0'])
    },
    createPresentationModalContent: {
      classList: createClassList(['scale-95'])
    },
    createPresentationTitle: {
      focusCount: 0,
      focus() {
        this.focusCount += 1;
      }
    },
    createPresentationError: {
      classList: createClassList(['hidden']),
      textContent: 'old error'
    },
    createPresentationSubmitBtn: {
      disabled: false
    },
    createPresentationSubmitLabel: {
      textContent: 'Create Deck'
    }
  };

  return {
    elements,
    getElementById(id) {
      return elements[id] || null;
    }
  };
}

test('open and close presentation creation modal update visibility and focus', () => {
  const documentRef = createDocumentStub();
  const { elements } = documentRef;

  assert.equal(
    presentationCreationView.openPresentationCreationModal({ documentRef }),
    true
  );
  assert.equal(elements.createPresentationModal.classList.contains('hidden'), false);
  assert.equal(elements.createPresentationModal.classList.contains('opacity-0'), false);
  assert.equal(elements.createPresentationModalContent.classList.contains('scale-95'), false);
  assert.equal(elements.createPresentationTitle.focusCount, 1);

  assert.equal(
    presentationCreationView.closePresentationCreationModal({ documentRef }),
    true
  );
  assert.equal(elements.createPresentationModal.classList.contains('hidden'), true);
  assert.equal(elements.createPresentationModalContent.classList.contains('scale-95'), true);
});

test('presentation creation view exposes error and busy states', () => {
  const documentRef = createDocumentStub();
  const { elements } = documentRef;

  presentationCreationView.setPresentationCreationError({
    documentRef,
    message: 'A deck already exists.'
  });
  assert.equal(elements.createPresentationError.textContent, 'A deck already exists.');
  assert.equal(elements.createPresentationError.classList.contains('hidden'), false);

  presentationCreationView.setPresentationCreationBusyState({
    documentRef,
    isBusy: true
  });
  assert.equal(elements.createPresentationSubmitBtn.disabled, true);
  assert.equal(elements.createPresentationSubmitLabel.textContent, 'Creating...');

  presentationCreationView.setPresentationCreationError({ documentRef, message: '' });
  presentationCreationView.setPresentationCreationBusyState({
    documentRef,
    isBusy: false
  });
  assert.equal(elements.createPresentationError.classList.contains('hidden'), true);
  assert.equal(elements.createPresentationSubmitBtn.disabled, false);
  assert.equal(elements.createPresentationSubmitLabel.textContent, 'Create Deck');
});

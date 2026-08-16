const test = require('node:test');
const assert = require('node:assert/strict');

const conversionView = require('../shared/studio-editor-layout-conversion-view.js');

test('syncStudioLayoutConversionControl enables the command only for a valid plan', () => {
  const button = { disabled: true, title: '', dataset: {} };
  const status = { textContent: '' };
  const documentRef = {
    getElementById(id) {
      return id === 'convertFlowToFreeformBtn' ? button : status;
    }
  };

  assert.equal(conversionView.syncStudioLayoutConversionControl({
    documentRef,
    plan: { canConvert: true }
  }), true);
  assert.equal(button.disabled, false);
  assert.equal(button.dataset.canConvert, 'true');
  assert.match(button.title, /freeform canvas/);
  assert.equal(status.textContent, button.title);
});

test('syncStudioLayoutConversionControl explains why a conversion is unavailable', () => {
  const button = { disabled: false, title: '', dataset: {} };
  const status = { textContent: '' };
  const documentRef = {
    getElementById(id) {
      return id === 'convertFlowToFreeformBtn' ? button : status;
    }
  };

  conversionView.syncStudioLayoutConversionControl({
    documentRef,
    plan: { canConvert: false, reason: 'locked-selection' }
  });
  assert.equal(button.disabled, true);
  assert.equal(button.dataset.canConvert, 'false');
  assert.equal(button.title, 'Unlock the selection before converting it.');
  assert.equal(status.textContent, button.title);
});

test('getStudioLayoutConversionMessage uses a safe fallback for unknown planner reasons', () => {
  assert.equal(
    conversionView.getStudioLayoutConversionMessage('unknown', false),
    'This selection cannot be converted yet.'
  );
});

test('bindStudioEditorLayoutConversionControl wires conversion to the command button', () => {
  const button = { listeners: {}, addEventListener(type, handler) {
    this.listeners[type] = handler;
  } };
  const calls = [];

  assert.deepEqual(
    conversionView.bindStudioEditorLayoutConversionControl({
      documentRef: {
        getElementById(id) {
          return id === 'convertFlowToFreeformBtn' ? button : null;
        }
      },
      convertSelectedElementsToFreeform() {
        calls.push('convert');
      }
    }),
    { convertFlowToFreeformBtn: true }
  );
  button.listeners.click();
  assert.deepEqual(calls, ['convert']);
});

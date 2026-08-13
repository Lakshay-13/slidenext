const test = require('node:test');
const assert = require('node:assert/strict');

const bridgeApi = require('../shared/studio-editor-layout-ui-bridge.js');

test('layout UI bridge resolves the default document for mode sync', () => {
  const defaultDocument = { id: 'default-document' };
  const calls = [];
  const bridge = bridgeApi.createStudioEditorLayoutUiBridge({
    layoutModeController: {
      sync(documentRef) {
        calls.push(documentRef);
        return 'mode-result';
      }
    },
    getDocument: () => defaultDocument
  });

  assert.equal(bridge.syncLayoutModeControl(), 'mode-result');
  assert.deepEqual(calls, [defaultDocument]);
});

test('layout UI bridge forwards conversion plans to the shared view', () => {
  const sourceDocument = { id: 'source-document' };
  const editorDocument = { id: 'editor-document' };
  const plan = { canConvert: true, reason: '' };
  let buildDocument = null;
  let viewOptions = null;
  const bridge = bridgeApi.createStudioEditorLayoutUiBridge({
    layoutConversionController: {
      buildPlan(documentRef) {
        buildDocument = documentRef;
        return plan;
      }
    },
    layoutConversionViewApi: {
      syncStudioLayoutConversionControl(options) {
        viewOptions = options;
        return 'conversion-result';
      }
    },
    documentRef: editorDocument,
    getDocument: () => ({ id: 'fallback-document' })
  });

  assert.equal(bridge.syncLayoutConversionControl(sourceDocument), 'conversion-result');
  assert.equal(buildDocument, sourceDocument);
  assert.deepEqual(viewOptions, { documentRef: editorDocument, plan });
});

test('layout UI bridge fails closed when a controller or view throws', () => {
  const bridge = bridgeApi.createStudioEditorLayoutUiBridge({
    layoutModeController: {
      sync() {
        throw new Error('mode failure');
      }
    },
    layoutConversionController: {
      buildPlan() {
        throw new Error('plan failure');
      }
    },
    layoutConversionViewApi: {
      syncStudioLayoutConversionControl() {
        throw new Error('view failure');
      }
    },
    getDocument: () => ({})
  });

  assert.equal(bridge.syncLayoutModeControl(), false);
  assert.equal(bridge.syncLayoutConversionControl(), false);
});

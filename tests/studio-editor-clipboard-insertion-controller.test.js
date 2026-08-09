const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const insertionController = require('../shared/studio-editor-clipboard-insertion-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('clipboard insertion controller plans insertion and forwards its transaction', () => {
  const documentRef = { id: 'editor-document' };
  const slide = {
    id: 'slide-1',
    contains() {
      return true;
    }
  };
  const items = [{ id: 'item-1' }];
  const plans = [{ id: 'plan-1' }];
  const inserted = [{ id: 'inserted-1' }];
  const calls = [];
  const clipboardApi = {
    buildStudioClipboardInsertionPlan(currentItems, offsetMultiplier, options) {
      calls.push(['plan', currentItems, offsetMultiplier, options]);
      return plans;
    }
  };
  const controller = insertionController.createStudioEditorClipboardInsertionController({
    clipboardApi,
    mutationApi: {
      applyStudioClipboardInsertionWithTransaction(currentPlans, currentSlide, options) {
        calls.push(['mutate', currentPlans, currentSlide, options]);
        return { inserted, transaction: { id: 'tx-1' } };
      }
    },
    getIframeDoc: () => documentRef,
    getActiveSlide: (currentDocument) => {
      assert.equal(currentDocument, documentRef);
      return slide;
    },
    getSlideMetrics: () => ({ logicalWidth: 1280, logicalHeight: 720 }),
    getOffsetPx: () => 24,
    getElementId: (element) => element.id
  });

  let transaction = null;
  assert.deepEqual(controller.insert(items, 2, {
    onTransaction(value) {
      transaction = value;
    }
  }), inserted);
  assert.deepEqual(calls[0].slice(0, 3), ['plan', items, 2]);
  assert.equal(calls[0][3].slide, slide);
  assert.equal(calls[0][3].offsetPx, 24);
  assert.equal(calls[0][3].slideWidth, 1280);
  assert.equal(calls[0][3].slideHeight, 720);
  assert.equal(calls[1][0], 'mutate');
  assert.equal(calls[1][1], plans);
  assert.equal(calls[1][2], slide);
  assert.equal(calls[1][3].clipboardApi, clipboardApi);
  assert.equal(calls[1][3].transactionApi, null);
  assert.equal(calls[1][3].getElementId({ id: 'node-1' }), 'node-1');
  assert.deepEqual(transaction, { id: 'tx-1' });
});

test('clipboard insertion controller fails closed when insertion dependencies are unavailable', () => {
  const controller = insertionController.createStudioEditorClipboardInsertionController({
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' })
  });

  assert.deepEqual(controller.insert([{ id: 'item-1' }]), []);
});

test('editor routes clipboard insertion through the shared controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /SlideNextStudioEditorClipboardInsertionController/);
  assert.match(source, /studioEditorClipboardInsertionController\.insert\(items, offsetMultiplier, options\)/);
});

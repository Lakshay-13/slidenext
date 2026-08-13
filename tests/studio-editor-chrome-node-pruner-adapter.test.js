const test = require('node:test');
const assert = require('node:assert/strict');

const chromeNodePrunerAdapter = require('../shared/studio-editor-chrome-node-pruner-adapter.js');

test('pruneStudioEditorChromeNodes delegates the document and options', () => {
  const doc = { id: 'iframe-doc' };
  const chromeOptions = {
    activeSlide: { id: 'slide-1' },
    chromeNodeIds: ['editor-chrome']
  };
  let delegated = null;

  const result = chromeNodePrunerAdapter.pruneStudioEditorChromeNodes(doc, {
    domApi: {
      pruneStudioChromeNodes(docValue, optionsValue) {
        delegated = { docValue, optionsValue };
        return true;
      }
    },
    chromeOptions
  });

  assert.equal(result, true);
  assert.equal(delegated.docValue, doc);
  assert.equal(delegated.optionsValue, chromeOptions);
});

test('pruneStudioEditorChromeNodes prefers an explicit pruner', () => {
  assert.equal(
    chromeNodePrunerAdapter.pruneStudioEditorChromeNodes({}, {
      domApi: {
        pruneStudioChromeNodes() {
          throw new Error('DOM API fallback should not run');
        }
      },
      chromeNodePruner: () => false,
      chromeOptions: {}
    }),
    false
  );
});

test('pruneStudioEditorChromeNodes fails closed without a pruner', () => {
  assert.equal(
    chromeNodePrunerAdapter.pruneStudioEditorChromeNodes({}),
    null
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');

const pptxExport = require('../shared/studio-pptx-export.js');

test('exportStudioPptx posts the canonical deck and downloads the response', async () => {
  const calls = [];
  const anchor = {
    click() {
      calls.push(['click']);
    },
    remove() {
      calls.push(['remove']);
    }
  };
  const result = await pptxExport.exportStudioPptx({
    canonicalDeck: { kind: 'slidenext.deck', slides: [] },
    sourcePath: '/presentations/demo/index.html',
    filename: 'Demo deck.pptx',
    fetchImpl(endpoint, options) {
      calls.push(['fetch', endpoint, options]);
      return Promise.resolve({
        ok: true,
        headers: {
          get(name) {
            return name === 'Content-Disposition'
              ? 'attachment; filename="Demo_deck.pptx"'
              : '2';
          }
        },
        blob() {
          return Promise.resolve({ type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
        }
      });
    },
    documentRef: {
      createElement(tagName) {
        assert.equal(tagName, 'a');
        return anchor;
      },
      body: {
        appendChild(node) {
          calls.push(['appendChild', node]);
        }
      }
    },
    urlApi: {
      createObjectURL(blob) {
        calls.push(['createObjectURL', blob]);
        return 'blob:slidenext';
      },
      revokeObjectURL(url) {
        calls.push(['revokeObjectURL', url]);
      }
    }
  });

  assert.equal(result.success, true);
  assert.equal(result.filename, 'Demo_deck.pptx');
  assert.equal(result.warningCount, 2);
  assert.equal(calls[0][0], 'fetch');
  assert.equal(calls[0][1], '/api/export/pptx');
  assert.deepEqual(JSON.parse(calls[0][2].body), {
    canonicalDeck: { kind: 'slidenext.deck', slides: [] },
    sourcePath: '/presentations/demo/index.html',
    filename: 'Demo deck.pptx'
  });
  assert.deepEqual(calls.slice(-3), [
    ['click'],
    ['remove'],
    ['revokeObjectURL', 'blob:slidenext']
  ]);
});

test('exportStudioPptx reports unavailable dependencies and failed responses', async () => {
  assert.deepEqual(await pptxExport.exportStudioPptx({}), {
    success: false,
    error: 'PPTX browser export dependencies are unavailable'
  });

  const result = await pptxExport.exportStudioPptx({
    fetchImpl: async () => ({ ok: false }),
    documentRef: { body: {}, createElement() {} },
    urlApi: {
      createObjectURL() {},
      revokeObjectURL() {}
    }
  });
  assert.equal(result.success, false);
  assert.equal(result.error, 'PPTX export request failed');
});

test('normalizeDownloadFilename keeps downloads safe and ends with pptx', () => {
  assert.equal(pptxExport.normalizeDownloadFilename('/tmp/Demo deck.pptx'), 'Demo_deck.pptx');
  assert.equal(pptxExport.normalizeDownloadFilename(''), 'slidenext-presentation.pptx');
});

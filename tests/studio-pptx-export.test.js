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

  let fetchCalls = 0;
  const missingDeck = await pptxExport.exportStudioPptx({
    fetchImpl: async () => {
      fetchCalls += 1;
      return { ok: false };
    },
    documentRef: { body: {}, createElement() {} },
    urlApi: {
      createObjectURL() {},
      revokeObjectURL() {}
    }
  });
  assert.deepEqual(missingDeck, {
    success: false,
    error: 'PPTX canonical deck is unavailable'
  });
  assert.equal(fetchCalls, 0);

  const result = await pptxExport.exportStudioPptx({
    canonicalDeck: { kind: 'slidenext.deck', slides: [] },
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

test('exportStudioPptx converts request and download exceptions into failed results', async () => {
  const revokedUrls = [];
  const baseOptions = {
    canonicalDeck: { kind: 'slidenext.deck', slides: [] },
    documentRef: {
      body: {},
      createElement() {
        return { click() {} };
      }
    },
    urlApi: {
      createObjectURL() {
        return 'blob:slidenext';
      },
      revokeObjectURL(url) {
        revokedUrls.push(url);
      }
    }
  };

  assert.deepEqual(await pptxExport.exportStudioPptx({
    ...baseOptions,
    fetchImpl: async () => {
      throw new Error('offline');
    }
  }), {
    success: false,
    error: 'offline'
  });

  const downloadError = await pptxExport.exportStudioPptx({
    ...baseOptions,
    fetchImpl: async () => ({
      ok: true,
      headers: { get: () => '' },
      blob: async () => ({})
    }),
    documentRef: {
      body: { appendChild() {} },
      createElement() {
        return {
          click() {
            throw new Error('download blocked');
          },
          remove() {}
        };
      }
    }
  });
  assert.deepEqual(downloadError, {
    success: false,
    error: 'download blocked'
  });
  assert.deepEqual(revokedUrls, ['blob:slidenext']);
});

test('normalizeDownloadFilename keeps downloads safe and ends with pptx', () => {
  assert.equal(pptxExport.normalizeDownloadFilename('/tmp/Demo deck.pptx'), 'Demo_deck.pptx');
  assert.equal(pptxExport.normalizeDownloadFilename(''), 'slidenext-presentation.pptx');
});

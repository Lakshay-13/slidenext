const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { app } = require('../server.js');

function listenOnEphemeralPort(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

function buildRuntimeSmokeDeck() {
  return {
    metadata: { title: 'Runtime export smoke' },
    layout: { size: { width: 1920, height: 1080, unit: 'px' } },
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'title',
        type: 'text',
        tagName: 'h1',
        text: 'Runtime export smoke',
        layout: { x: 100, y: 100, width: 800, height: 120 }
      }]
    }]
  };
}

test('PPTX export route returns a real generalized PPTX response', async (t) => {
  const server = http.createServer(app);
  const port = await listenOnEphemeralPort(server);
  t.after(() => closeServer(server));

  const response = await fetch(`http://127.0.0.1:${port}/api/export/pptx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      canonicalDeck: buildRuntimeSmokeDeck(),
      filename: 'Runtime export.pptx'
    })
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /application\/vnd\.openxmlformats/);
  assert.match(response.headers.get('content-disposition') || '', /Runtime_export\.pptx/);
  assert.equal(response.headers.get('x-slidenext-pptx-warning-count'), '0');
  const buffer = Buffer.from(await response.arrayBuffer());
  assert.equal(buffer.subarray(0, 2).toString(), 'PK');
});

test('PPTX export route rejects an empty canonical deck without generating a file', async (t) => {
  const server = http.createServer(app);
  const port = await listenOnEphemeralPort(server);
  t.after(() => closeServer(server));

  const response = await fetch(`http://127.0.0.1:${port}/api/export/pptx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ canonicalDeck: { slides: [] } })
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Cannot export an empty deck' });
});

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const { app, workspaceDir } = require('../server.js');

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

test('save route atomically persists the canonical deck sidecar', async (t) => {
  const folder = `.test-save-sidecar-${process.pid}-${Date.now()}`;
  const folderPath = path.join(workspaceDir, 'presentations', folder);
  const htmlPath = `presentations/${folder}/index.html`;
  const metadataPath = path.join(folderPath, 'presentation.json');
  await fs.mkdir(folderPath);
  await fs.writeFile(path.join(folderPath, 'index.html'), '<!doctype html><html><body>old</body></html>');
  await fs.writeFile(metadataPath, JSON.stringify({ title: 'Atomic save' }));
  t.after(() => fs.rm(folderPath, { recursive: true, force: true }));

  const server = http.createServer(app);
  const port = await listenOnEphemeralPort(server);
  t.after(() => closeServer(server));

  const canonicalDeck = {
    metadata: { title: 'Atomic save' },
    layout: { size: { width: 1920, height: 1080, unit: 'px' } },
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'title',
        type: 'text',
        text: 'Updated',
        layout: { x: 100, y: 100, width: 600, height: 100 }
      }]
    }]
  };
  const response = await fetch(`http://127.0.0.1:${port}/api/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      htmlPath,
      htmlContent: '<!doctype html><html><body>updated</body></html>',
      isAutoSave: true,
      canonicalDeck
    })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    message: 'File saved successfully'
  });

  const persistedMetadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
  assert.equal(
    await fs.readFile(path.join(folderPath, 'index.html'), 'utf8'),
    '<!doctype html><html><body>updated</body></html>'
  );
  assert.equal(persistedMetadata.canonicalDeck.slides[0].nodes[0].text, 'Updated');
  assert.deepEqual(
    (await fs.readdir(folderPath)).sort(),
    ['index.html', 'presentation.json']
  );
});

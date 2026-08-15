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

test('restore route reports canonical sidecar failures after restoring HTML', async (t) => {
  const folder = `.test-restore-sidecar-failure-${process.pid}-${Date.now()}`;
  const folderPath = path.join(workspaceDir, 'presentations', folder);
  const htmlPath = `presentations/${folder}/index.html`;
  const metadataPath = path.join(folderPath, 'presentation.json');
  const versionFilename = 'index_20260101_120000_restore.html';

  await fs.mkdir(path.join(folderPath, '.versions'), { recursive: true });
  await fs.writeFile(path.join(folderPath, 'index.html'), '<!doctype html><html><body>current</body></html>');
  await fs.writeFile(
    path.join(folderPath, '.versions', versionFilename),
    '<!doctype html><html><body>restored</body></html>'
  );
  await fs.mkdir(metadataPath);
  t.after(() => fs.rm(folderPath, { recursive: true, force: true }));

  const server = http.createServer(app);
  const port = await listenOnEphemeralPort(server);
  t.after(() => closeServer(server));

  const response = await fetch(`http://127.0.0.1:${port}/api/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ htmlPath, versionFilename })
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    success: false,
    error: 'Failed to restore canonical deck sidecar',
    htmlRestored: false
  });
  assert.equal(
    await fs.readFile(path.join(folderPath, 'index.html'), 'utf8'),
    '<!doctype html><html><body>current</body></html>'
  );
});

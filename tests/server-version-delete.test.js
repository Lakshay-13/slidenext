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

test('delete route rolls back the HTML backup when metadata deletion fails', async (t) => {
  const folder = `.test-version-delete-${process.pid}-${Date.now()}`;
  const folderPath = path.join(workspaceDir, 'presentations', folder);
  const versionsPath = path.join(folderPath, '.versions');
  const htmlPath = `presentations/${folder}/index.html`;
  const versionFilename = 'index_20260101_120000_original.html';
  const metadataVersionFilename = 'presentation_20260101_120000_original.json';
  const versionContent = '<!doctype html><html><body>version</body></html>';

  await fs.mkdir(versionsPath, { recursive: true });
  await fs.writeFile(path.join(folderPath, 'index.html'), '<!doctype html><html><body>current</body></html>');
  await fs.writeFile(path.join(folderPath, 'presentation.json'), JSON.stringify({ title: 'Delete test' }));
  await fs.writeFile(path.join(versionsPath, versionFilename), versionContent);
  await fs.mkdir(path.join(versionsPath, metadataVersionFilename));
  t.after(() => fs.rm(folderPath, { recursive: true, force: true }));

  const server = http.createServer(app);
  const port = await listenOnEphemeralPort(server);
  t.after(() => closeServer(server));

  const response = await fetch(`http://127.0.0.1:${port}/api/versions/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ htmlPath, versionFilename })
  });

  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /^Failed to delete version:/);
  assert.equal(await fs.readFile(path.join(versionsPath, versionFilename), 'utf8'), versionContent);
  const metadataStat = await fs.stat(path.join(versionsPath, metadataVersionFilename));
  assert.equal(metadataStat.isDirectory(), true);
});

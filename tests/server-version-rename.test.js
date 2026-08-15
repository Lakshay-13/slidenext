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

test('rename route rolls back the HTML backup when metadata rename fails', async (t) => {
  const folder = `.test-version-rename-${process.pid}-${Date.now()}`;
  const folderPath = path.join(workspaceDir, 'presentations', folder);
  const versionsPath = path.join(folderPath, '.versions');
  const htmlPath = `presentations/${folder}/index.html`;
  const originalFilename = 'index_20260101_120000_original.html';
  const renamedFilename = 'index_20260101_120000_renamed.html';
  const originalMetadataFilename = 'presentation_20260101_120000_original.json';
  const renamedMetadataFilename = 'presentation_20260101_120000_renamed.json';

  await fs.mkdir(versionsPath, { recursive: true });
  await fs.writeFile(path.join(folderPath, 'index.html'), '<!doctype html><html><body>current</body></html>');
  await fs.writeFile(path.join(folderPath, 'presentation.json'), JSON.stringify({ title: 'Rename test' }));
  await fs.writeFile(path.join(versionsPath, originalFilename), '<!doctype html><html><body>version</body></html>');
  await fs.writeFile(path.join(versionsPath, originalMetadataFilename), JSON.stringify({ title: 'Rename test' }));
  await fs.mkdir(path.join(versionsPath, renamedMetadataFilename));
  t.after(() => fs.rm(folderPath, { recursive: true, force: true }));

  const server = http.createServer(app);
  const port = await listenOnEphemeralPort(server);
  t.after(() => closeServer(server));

  const response = await fetch(`http://127.0.0.1:${port}/api/versions/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ htmlPath, versionFilename: originalFilename, newLabel: 'renamed' })
  });

  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /^Failed to rename version:/);
  assert.equal(
    await fs.readFile(path.join(versionsPath, originalFilename), 'utf8'),
    '<!doctype html><html><body>version</body></html>'
  );
  await assert.rejects(fs.access(path.join(versionsPath, renamedFilename)), { code: 'ENOENT' });
  assert.deepEqual(
    JSON.parse(await fs.readFile(path.join(versionsPath, originalMetadataFilename), 'utf8')),
    { title: 'Rename test' }
  );
});

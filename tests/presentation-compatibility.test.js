const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const presentationsDir = path.join(__dirname, '..', 'presentations');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('sample presentation manifest and metadata sidecars resolve to real decks', () => {
  const manifest = readJson(path.join(presentationsDir, 'presentations.json'));
  assert.ok(Array.isArray(manifest));

  const manifestFolders = new Set();
  manifest.forEach((entry) => {
    assert.equal(typeof entry.folder, 'string');
    assert.notEqual(entry.folder.trim(), '');
    manifestFolders.add(entry.folder);

    const deckPath = path.join(presentationsDir, entry.folder, 'index.html');
    const metadataPath = path.join(presentationsDir, entry.folder, 'presentation.json');
    assert.equal(fs.existsSync(deckPath), true, `Missing deck: ${deckPath}`);
    assert.equal(fs.existsSync(metadataPath), true, `Missing metadata: ${metadataPath}`);

    const metadata = readJson(metadataPath);
    assert.equal(metadata.id, entry.id);
    assert.equal(metadata.url, `${entry.folder}/index.html`);
    assert.equal(
      fs.existsSync(path.join(presentationsDir, metadata.url)),
      true,
      `Metadata URL does not resolve: ${metadata.url}`
    );
  });

  fs.readdirSync(presentationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => fs.existsSync(path.join(presentationsDir, entry.name, 'index.html')))
    .forEach((entry) => {
      assert.equal(manifestFolders.has(entry.name), true, `Deck is missing from manifest: ${entry.name}`);
  });
});

test('legacy presentations initialize after a ready-state race and keep motion optional', () => {
  ['onboarding-presentation', 'ai-tools-presentation', 'computer-vision-presentation'].forEach((folder) => {
    const appPath = path.join(presentationsDir, folder, 'app.js');
    const htmlPath = path.join(presentationsDir, folder, 'index.html');
    const app = fs.readFileSync(appPath, 'utf8');
    const html = fs.readFileSync(htmlPath, 'utf8');

    assert.match(app, /function initializePresentation\(\)/, folder);
    assert.match(app, /document\.readyState === 'loading'/, folder);
    assert.match(app, /initializePresentation\(\);/, folder);
    if (folder !== 'onboarding-presentation') {
      assert.match(app, /const gsap = window\.gsap \|\|/, folder);
    }
  });
});

test('production pages use the checked-in Tailwind build instead of the CDN runtime', () => {
  const pagePaths = [
    path.join(__dirname, '..', 'index.html'),
    ...['onboarding-presentation', 'ai-tools-presentation', 'computer-vision-presentation']
      .map((folder) => path.join(presentationsDir, folder, 'index.html'))
  ];

  pagePaths.forEach((pagePath) => {
    const html = fs.readFileSync(pagePath, 'utf8');
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com/, pagePath);
    assert.match(html, /tailwind\.generated\.css/, pagePath);
  });

  assert.equal(
    fs.existsSync(path.join(__dirname, '..', 'shared', 'tailwind.generated.css')),
    true,
    'The generated Tailwind stylesheet must be present'
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const { app, workspaceDir } = require('../server.js');
const presentationCreation = require('../shared/presentation-creation.js');
const pdfScript = require('../scripts/export-canonical-pdf.js');
const legacyPptxExport = require('../scripts/export-legacy-html-pptx.js');
const canonicalPptxExport = require('../shared/canonical-pptx-export.js');

function listenOnEphemeralPort(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function closeServer(server) {
  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }
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

const SHIPPED_LEGACY_DECKS = [
  'ai-tools-presentation',
  'computer-vision-presentation',
  'onboarding-presentation',
  'pinns-presentation'
];

const SHIPPED_LEGACY_PPTX_WARNING_COUNTS = {
  'ai-tools-presentation': 1,
  'computer-vision-presentation': 2,
  'onboarding-presentation': 1,
  'pinns-presentation': 1
};

const SHIPPED_LEGACY_PDF_WARNING_COUNTS = {
  'ai-tools-presentation': 0,
  'computer-vision-presentation': 1,
  'onboarding-presentation': 0,
  'pinns-presentation': 0
};

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

test('PPTX export route flattens an existing legacy HTML deck with an explicit warning', {
  skip: !pdfScript.resolveChromeExecutable() || !legacyPptxExport.resolvePdftoppmExecutable()
}, async (t) => {
  const server = http.createServer(app);
  const port = await listenOnEphemeralPort(server);
  t.after(() => closeServer(server));

  const response = await fetch(`http://127.0.0.1:${port}/api/export/pptx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourcePath: 'presentations/onboarding-presentation/index.html',
      filename: 'Legacy onboarding.pptx'
    })
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /application\/vnd\.openxmlformats/);
  assert.equal(response.headers.get('x-slidenext-pptx-warning-count'), '1');
  const warningDetails = JSON.parse(decodeURIComponent(
    response.headers.get('x-slidenext-pptx-warning-details') || ''
  ));
  assert.deepEqual(warningDetails.warnings, [legacyPptxExport.LEGACY_PPTX_WARNING]);
  assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 2).toString(), 'PK');
});

test('PPTX export route preserves one slide per page for every shipped legacy deck', {
  skip: !pdfScript.resolveChromeExecutable() || !legacyPptxExport.resolvePdftoppmExecutable()
}, async (t) => {
  const server = http.createServer(app);
  const port = await listenOnEphemeralPort(server);
  t.after(() => closeServer(server));

  for (const deckSlug of SHIPPED_LEGACY_DECKS) {
    const htmlPath = path.join(workspaceDir, 'presentations', deckSlug, 'index.html');
    const html = await fs.readFile(htmlPath, 'utf8');
    const response = await fetch(`http://127.0.0.1:${port}/api/export/pptx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourcePath: `presentations/${deckSlug}/index.html`,
        filename: `${deckSlug}.pptx`
      })
    });

    assert.equal(response.status, 200, deckSlug);
    assert.match(
      response.headers.get('content-type') || '',
      /application\/vnd\.openxmlformats/,
      deckSlug
    );
    assert.equal(
      response.headers.get('x-slidenext-pptx-warning-count'),
      String(SHIPPED_LEGACY_PPTX_WARNING_COUNTS[deckSlug]),
      deckSlug
    );
    if (deckSlug === 'computer-vision-presentation') {
      const warningDetails = JSON.parse(decodeURIComponent(
        response.headers.get('x-slidenext-pptx-warning-details') || ''
      ));
      assert.deepEqual(warningDetails.warnings, [
        legacyPptxExport.LEGACY_PPTX_WARNING,
        'PPTX legacy HTML references unavailable asset "sample.mp4"'
      ], deckSlug);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    assert.equal(buffer.subarray(0, 2).toString(), 'PK', deckSlug);
    assert.equal(
      canonicalPptxExport.countPptxSlides(buffer),
      pdfScript.countLegacyHtmlSlides(html),
      deckSlug
    );
  }
});

test('PDF export route returns a real generalized PDF response', { skip: !pdfScript.resolveChromeExecutable() }, async (t) => {
  const server = http.createServer(app);
  const port = await listenOnEphemeralPort(server);
  t.after(() => closeServer(server));

  const response = await fetch(`http://127.0.0.1:${port}/api/export/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      canonicalDeck: buildRuntimeSmokeDeck(),
      filename: 'Runtime export.pdf'
    })
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /application\/pdf/);
  assert.match(response.headers.get('content-disposition') || '', /Runtime_export\.pdf/);
  assert.equal(response.headers.get('x-slidenext-pdf-warning-count'), '0');
  const buffer = Buffer.from(await response.arrayBuffer());
  assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
});

test('PDF export route prints an existing legacy HTML deck without a canonical sidecar', { skip: !pdfScript.resolveChromeExecutable() }, async (t) => {
  const server = http.createServer(app);
  const port = await listenOnEphemeralPort(server);
  t.after(() => closeServer(server));

  const response = await fetch(`http://127.0.0.1:${port}/api/export/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourcePath: 'presentations/onboarding-presentation/index.html',
      filename: 'Legacy onboarding.pdf'
    })
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /application\/pdf/);
  assert.equal(response.headers.get('x-slidenext-pdf-warning-count'), '0');
  const buffer = Buffer.from(await response.arrayBuffer());
  assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
  assert.equal(
    pdfScript.countPdfPages(buffer),
    pdfScript.countLegacyHtmlSlides(
      await fs.readFile(path.join(workspaceDir, 'presentations/onboarding-presentation/index.html'), 'utf8')
    )
  );
});

test('PDF export route preserves one page per slide for every shipped legacy deck', {
  skip: !pdfScript.resolveChromeExecutable()
}, async (t) => {
  const server = http.createServer(app);
  const port = await listenOnEphemeralPort(server);
  t.after(() => closeServer(server));

  for (const deckSlug of SHIPPED_LEGACY_DECKS) {
    const htmlPath = path.join(workspaceDir, 'presentations', deckSlug, 'index.html');
    const html = await fs.readFile(htmlPath, 'utf8');
    const response = await fetch(`http://127.0.0.1:${port}/api/export/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourcePath: `presentations/${deckSlug}/index.html`,
        filename: `${deckSlug}.pdf`
      })
    });

    assert.equal(response.status, 200, deckSlug);
    assert.match(response.headers.get('content-type') || '', /application\/pdf/, deckSlug);
    assert.equal(
      response.headers.get('x-slidenext-pdf-warning-count'),
      String(SHIPPED_LEGACY_PDF_WARNING_COUNTS[deckSlug]),
      deckSlug
    );
    const buffer = Buffer.from(await response.arrayBuffer());
    assert.equal(buffer.subarray(0, 5).toString(), '%PDF-', deckSlug);
    assert.equal(
      pdfScript.countPdfPages(buffer),
      pdfScript.countLegacyHtmlSlides(html),
      deckSlug
    );
  }
});

test('PDF export route reports missing local canonical assets without blocking export', { skip: !require('../scripts/export-canonical-pdf.js').resolveChromeExecutable() }, async (t) => {
  const server = http.createServer(app);
  const port = await listenOnEphemeralPort(server);
  t.after(() => closeServer(server));

  const response = await fetch(`http://127.0.0.1:${port}/api/export/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      canonicalDeck: {
        metadata: { title: 'Missing asset export' },
        assets: [{
          id: 'missing-hero',
          src: '/presentations/computer-vision-presentation/assets/does-not-exist.png'
        }],
        layout: { size: { width: 1920, height: 1080, unit: 'px' } },
        slides: [{
          id: 'slide-1',
          nodes: [{
            id: 'hero',
            type: 'image',
            assetId: 'missing-hero',
            layout: { x: 0, y: 0, width: 500, height: 300 }
          }]
        }]
      }
    })
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-slidenext-pdf-warning-count'), '1');
  const warningDetails = JSON.parse(decodeURIComponent(
    response.headers.get('x-slidenext-pdf-warning-details') || ''
  ));
  assert.deepEqual(warningDetails.warnings, [
    'PDF node hero references unavailable asset "missing-hero"'
  ]);
  assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
});

test('PPTX export route resolves root-relative presentation assets', async (t) => {
  const server = http.createServer(app);
  const port = await listenOnEphemeralPort(server);
  t.after(() => closeServer(server));

  const response = await fetch(`http://127.0.0.1:${port}/api/export/pptx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      canonicalDeck: {
        metadata: { title: 'Root-relative asset smoke' },
        layout: { size: { width: 1920, height: 1080, unit: 'px' } },
        slides: [{
          id: 'slide-1',
          nodes: [{
            id: 'image-1',
            type: 'image',
            attributes: {
              src: '/presentations/computer-vision-presentation/assets/street.png'
            },
            layout: { x: 0, y: 0, width: 500, height: 300 }
          }]
        }]
      }
    })
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-slidenext-pptx-warning-count'), '0');
  assert.equal((await response.arrayBuffer()).byteLength > 0, true);
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

test('PPTX export route resolves a canonical deck from its persisted metadata sidecar', async (t) => {
  const folder = `.test-export-sidecar-${process.pid}-${Date.now()}`;
  const folderPath = path.join(workspaceDir, 'presentations', folder);
  const sourcePath = `presentations/${folder}/index.html`;
  const artifacts = presentationCreation.buildBlankPresentationArtifacts({
    title: 'Sidecar export smoke',
    existingSlugs: [folder]
  });
  await fs.mkdir(folderPath);
  await fs.writeFile(
    path.join(folderPath, 'presentation.json'),
    `${JSON.stringify(artifacts.metadata)}\n`,
    'utf8'
  );
  t.after(() => fs.rm(folderPath, { recursive: true, force: true }));

  const server = http.createServer(app);
  const port = await listenOnEphemeralPort(server);
  t.after(() => closeServer(server));

  const response = await fetch(`http://127.0.0.1:${port}/api/export/pptx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourcePath, filename: 'Sidecar export.pptx' })
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /application\/vnd\.openxmlformats/);
  assert.equal((await response.arrayBuffer()).byteLength > 0, true);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const pptxExport = require('../shared/canonical-pptx-export.js');
const canonicalPptxCli = require('../scripts/export-canonical-pptx.js');
const pdfScript = require('../scripts/export-canonical-pdf.js');
const legacyPptxExport = require('../scripts/export-legacy-html-pptx.js');

class FakeSlide {
  constructor() {
    this.calls = [];
  }

  addText(text, options) {
    this.calls.push({ type: 'text', text, options });
  }

  addImage(options) {
    this.calls.push({ type: 'image', options });
  }

  addShape(type, options) {
    this.calls.push({ type: 'shape', shapeType: type, options });
  }

  addTable(rows, options) {
    this.calls.push({ type: 'table', rows, options });
  }

  addChart(chartType, data, options) {
    this.calls.push({ type: 'chart', chartType, data, options });
  }

  addNotes(notes) {
    this.calls.push({ type: 'notes', notes });
  }
}

class FakePptx {
  constructor() {
    this.ShapeType = {
      ellipse: 'ELLIPSE',
      rect: 'RECTANGLE',
      roundRect: 'ROUND_RECTANGLE'
    };
    this.layouts = [];
    this.slides = [];
    this.sections = [];
    this.slideOptions = [];
  }

  defineLayout(layout) {
    this.layouts.push(layout);
  }

  addSection(section) {
    this.sections.push(section);
  }

  addSlide(options) {
    this.slideOptions.push(options);
    const slide = new FakeSlide();
    this.slides.push(slide);
    return slide;
  }
}

test('createCanonicalPptxExport writes a valid PPTX with the real generator', async () => {
  const result = pptxExport.createCanonicalPptxExport({
    metadata: { title: 'Runtime smoke' },
    layout: { size: { width: 1920, height: 1080, unit: 'px' } },
    slides: [{
      id: 'slide-1',
      nodes: [
        {
          id: 'title',
          type: 'text',
          tagName: 'h1',
          text: 'Runtime smoke',
          layout: { x: 100, y: 100, width: 800, height: 120 }
        },
        {
          id: 'shape',
          type: 'shape',
          style: 'background-color: #123456;',
          layout: { x: 100, y: 300, width: 400, height: 200 }
        }
      ]
    }]
  });

  assert.equal(result.slideCount, 1);
  assert.ok(result.pptx);
  const buffer = await result.pptx.write({ outputType: 'nodebuffer' });
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(pptxExport.validatePptxArtifact(buffer).length, buffer.length);
  assert.equal(pptxExport.countPptxSlides(buffer), 1);
  assert.equal(pptxExport.validatePptxArtifact(buffer, 1).length, buffer.length);
  assert.throws(
    () => pptxExport.validatePptxArtifact(buffer, 2),
    /PPTX slide count mismatch: expected 2, found 1/
  );
  assert.equal(buffer.subarray(0, 2).toString(), 'PK');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slidenext-pptx-'));
  const outputPath = path.join(tempDir, 'runtime-smoke.pptx');
  try {
    fs.writeFileSync(outputPath, buffer);
    childProcess.execFileSync('unzip', ['-t', outputPath], { stdio: 'pipe' });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('PPTX artifact validation rejects non-ZIP output', () => {
  assert.throws(
    () => pptxExport.validatePptxArtifact(Buffer.from('not-pptx')),
    /PPTX export did not produce a valid ZIP artifact/
  );
  assert.throws(
    () => pptxExport.validatePptxArtifact(null),
    /PPTX export did not produce a binary artifact/
  );
});

test('canonical PPTX CLI reports missing local assets during preflight', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slidenext-pptx-cli-'));
  const inputPath = path.join(tempDir, 'deck.json');
  const outputPath = path.join(tempDir, 'deck.pptx');
  fs.writeFileSync(inputPath, JSON.stringify({
    layout: { size: { width: 1920, height: 1080, unit: 'px' } },
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'missing-image',
        type: 'image',
        attributes: { src: 'assets/missing.png' },
        layout: { x: 0, y: 0, width: 300, height: 200 }
      }]
    }]
  }));
  const errors = [];
  const originalConsoleError = console.error;
  console.error = (...args) => errors.push(args.join(' '));

  try {
    assert.equal(await canonicalPptxCli.main([inputPath, outputPath]), 0);
  } finally {
    console.error = originalConsoleError;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  assert.match(errors.join('\n'), /missing image asset/);
});

test('canonical PPTX CLI resolves root-relative assets from the workspace root', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slidenext-pptx-root-'));
  const inputPath = path.join(tempDir, 'deck.json');
  const outputPath = path.join(tempDir, 'deck.pptx');
  fs.writeFileSync(inputPath, JSON.stringify({
    layout: { size: { width: 1920, height: 1080, unit: 'px' } },
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'hero-image',
        type: 'image',
        attributes: {
          src: '/presentations/computer-vision-presentation/assets/street.png'
        },
        layout: { x: 0, y: 0, width: 300, height: 200 }
      }]
    }]
  }));
  const errors = [];
  const originalConsoleError = console.error;
  console.error = (...args) => errors.push(args.join(' '));

  try {
    assert.equal(await canonicalPptxCli.main([inputPath, outputPath]), 0);
    assert.equal(fs.existsSync(outputPath), true);
  } finally {
    console.error = originalConsoleError;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  assert.doesNotMatch(errors.join('\n'), /missing image asset/);
});

test('canonical PPTX CLI resolves deck-relative assets from the input directory', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slidenext-pptx-relative-'));
  const assetsDir = path.join(tempDir, 'assets');
  const inputPath = path.join(tempDir, 'deck.json');
  const outputPath = path.join(tempDir, 'deck.pptx');
  fs.mkdirSync(assetsDir);
  fs.writeFileSync(
    path.join(assetsDir, 'hero.png'),
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  );
  fs.writeFileSync(inputPath, JSON.stringify({
    layout: { size: { width: 1920, height: 1080, unit: 'px' } },
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'hero-image',
        type: 'image',
        attributes: { src: 'assets/hero.png' },
        layout: { x: 0, y: 0, width: 300, height: 200 }
      }]
    }]
  }));
  const errors = [];
  const originalConsoleError = console.error;
  console.error = (...args) => errors.push(args.join(' '));

  try {
    assert.equal(await canonicalPptxCli.main([inputPath, outputPath]), 0);
    assert.equal(fs.existsSync(outputPath), true);
  } finally {
    console.error = originalConsoleError;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  assert.doesNotMatch(errors.join('\n'), /missing image asset/);
});

test('canonical PPTX CLI accepts a presentation metadata wrapper with a canonical deck', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slidenext-pptx-metadata-'));
  const inputPath = path.join(tempDir, 'presentation.json');
  const outputPath = path.join(tempDir, 'presentation.pptx');
  fs.writeFileSync(inputPath, JSON.stringify({
    id: 'metadata-deck',
    title: 'Metadata deck',
    canonicalDeck: {
      layout: { size: { width: 1920, height: 1080, unit: 'px' } },
      slides: [{ id: 'slide-1', nodes: [] }]
    }
  }));

  try {
    assert.equal(await canonicalPptxCli.main([inputPath, outputPath]), 0);
    assert.equal(fs.existsSync(outputPath), true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('legacy PPTX CLI exports the HTML sibling of a metadata-only sidecar', {
  skip: !pdfScript.resolveChromeExecutable() || !legacyPptxExport.resolvePdftoppmExecutable()
}, async () => {
  const outputPath = path.join(os.tmpdir(), `slidenext-legacy-cli-${Date.now()}.pptx`);
  const inputPath = path.join(
    __dirname,
    '..',
    'presentations',
    'onboarding-presentation',
    'presentation.json'
  );

  try {
    assert.equal(await canonicalPptxCli.main([inputPath, outputPath]), 0);
    const buffer = fs.readFileSync(outputPath);
    assert.equal(buffer.subarray(0, 2).toString(), 'PK');
  } finally {
    fs.rmSync(outputPath, { force: true });
  }
});

test('legacy PPTX CLI accepts a direct HTML deck path', {
  skip: !pdfScript.resolveChromeExecutable() || !legacyPptxExport.resolvePdftoppmExecutable()
}, async () => {
  const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slidenext-direct-html-pptx-'));
  const inputPath = path.join(temporaryDir, 'deck.html');
  const outputPath = path.join(temporaryDir, 'deck.pptx');
  fs.writeFileSync(
    inputPath,
    '<!doctype html><html><head><style>.slide{width:640px;height:360px;page-break-after:always}</style></head><body><section class="slide">Direct HTML</section></body></html>',
    'utf8'
  );

  try {
    assert.equal(await canonicalPptxCli.main([inputPath, outputPath]), 0);
    const buffer = fs.readFileSync(outputPath);
    assert.equal(buffer.subarray(0, 2).toString(), 'PK');
  } finally {
    fs.rmSync(temporaryDir, { recursive: true, force: true });
  }
});

test('legacy PPTX CLI preserves one slide per source slide for every bundled deck', {
  skip: !pdfScript.resolveChromeExecutable() || !legacyPptxExport.resolvePdftoppmExecutable()
}, async () => {
  const presentationsDir = path.join(__dirname, '..', 'presentations');
  const temporaryDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'slidenext-bundled-pptx-'));
  const entries = await fs.promises.readdir(presentationsDir, { withFileTypes: true });
  const deckPaths = entries
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => path.join(presentationsDir, entry.name, 'index.html'))
    .filter(inputPath => {
      try {
        return fs.statSync(inputPath).isFile();
      } catch (error) {
        return false;
      }
    });

  try {
    assert.ok(deckPaths.length > 0);
    for (const inputPath of deckPaths) {
      const html = fs.readFileSync(inputPath, 'utf8');
      const expectedSlideCount = pdfScript.countLegacyHtmlSlides(html);
      const outputPath = path.join(temporaryDir, `${path.basename(path.dirname(inputPath))}.pptx`);

      assert.ok(expectedSlideCount > 0, `${inputPath} has no legacy slides`);
      assert.equal(await canonicalPptxCli.main([inputPath, outputPath]), 0);
      const buffer = fs.readFileSync(outputPath);
      assert.equal(buffer.subarray(0, 2).toString(), 'PK', inputPath);
      assert.equal(pptxExport.countPptxSlides(buffer), expectedSlideCount, inputPath);
    }
  } finally {
    await fs.promises.rm(temporaryDir, { recursive: true, force: true });
  }
});

test('createCanonicalPptxExport maps canonical slide nodes into PPTX calls', () => {
  const result = pptxExport.createCanonicalPptxExport({
    metadata: {
      title: 'Canonical deck',
      description: 'Export smoke test'
    },
    layout: {
      size: { width: 1000, height: 500, unit: 'px' }
    },
    assets: [{
      id: 'asset-1',
      src: 'data:image/png;base64,AAAA'
    }],
    slides: [{
      id: 'slide-1',
      notes: 'Speaker notes',
      layout: { background: { color: '#abc' } },
      nodes: [
        {
          id: 'heading-1',
          type: 'heading',
          tagName: 'h1',
          text: 'Hello',
          style: 'font-size: 20px; color: rgb(255, 0, 0);',
          layout: { x: 100, y: 50, width: 200, height: 100 }
        },
        {
          id: 'shape-1',
          type: 'shape',
          style: 'background-color: #00ff00; border-color: #0000ff;',
          layout: { x: 400, y: 100, width: 100, height: 50 }
        },
        {
          id: 'image-1',
          type: 'image',
          attributes: { 'data-asset-id': 'asset-1' },
          style: 'object-fit: cover;',
          layout: { x: 600, y: 100, width: 100, height: 50 }
        },
        {
          id: 'table-1',
          type: 'table',
          layout: { x: 0, y: 0, width: 100, height: 50 }
        },
        {
          id: 'table-2',
          type: 'table',
          style: 'font-family: Georgia, serif; font-size: 20px; color: #0f172a; background-color: #f8fafc; border-color: #94a3b8; border-width: 2px; border-style: dashed;',
          layout: { x: 0, y: 200, width: 400, height: 150 },
          children: [{
            tagName: 'tr',
            children: [
              { tagName: 'th', text: 'Name', style: 'background-color: #eef2ff;' },
              { tagName: 'th', text: 'Value', style: 'text-align: right; color: #1d4ed8; font-style: italic; font-family: Georgia, serif; font-size: 20px;' }
            ]
          }, {
            tagName: 'tr',
            children: [
              { tagName: 'td', text: 'Alpha', style: 'text-align: center; vertical-align: middle; font-weight: 700; text-decoration: underline line-through; border-color: #ef4444; border-width: 3px; border-style: dotted;' },
              { tagName: 'td', text: '42' }
            ]
          }]
        },
        {
          id: 'hidden-1',
          type: 'text',
          text: 'Do not export',
          visibility: { hidden: true },
          layout: { x: 0, y: 0, width: 100, height: 50 }
        }
      ]
    }]
  }, { PptxGenJS: FakePptx });

  assert.equal(result.slideCount, 1);
  assert.equal(result.pptx.layout, 'SLIDENEXT_CANVAS');
  assert.deepEqual(result.pptx.layouts, [{
    name: 'SLIDENEXT_CANVAS',
    width: 13.333,
    height: 6.6665
  }]);
  assert.equal(result.pptx.title, 'Canonical deck');
  assert.equal(result.pptx.subject, 'Export smoke test');
  assert.deepEqual(result.pptx.slides[0].background, { color: 'AABBCC' });
  assert.deepEqual(result.pptx.slides[0].calls.map(call => call.type), [
    'notes', 'text', 'shape', 'image', 'table'
  ]);

  const textCall = result.pptx.slides[0].calls[1];
  assert.equal(textCall.text, 'Hello');
  assert.ok(Math.abs(textCall.options.x - 1.3333) < 0.001);
  assert.ok(Math.abs(textCall.options.w - 2.6666) < 0.001);
  assert.equal(textCall.options.color, 'FF0000');

  const imageCall = result.pptx.slides[0].calls[3];
  assert.equal(imageCall.options.data, 'data:image/png;base64,AAAA');
  assert.deepEqual(imageCall.options.sizing, {
    type: 'cover',
    x: imageCall.options.x,
    y: imageCall.options.y,
    w: imageCall.options.w,
    h: imageCall.options.h
  });
  assert.deepEqual(result.pptx.slides[0].calls[4].rows, [
    [
      { text: 'Name', options: { bold: true, fill: { color: 'EEF2FF' } } },
      { text: 'Value', options: { bold: true, align: 'right', color: '1D4ED8', italic: true, fontFace: 'Georgia', fontSize: 15 } }
    ],
    [{ text: 'Alpha', options: { align: 'center', valign: 'middle', bold: true, underline: { style: 'sng' }, strike: true, border: { type: 'dash', color: 'EF4444', pt: 2.25 } } }, '42']
  ]);
  assert.equal(result.pptx.slides[0].calls[4].options.fontFace, 'Georgia');
  assert.equal(result.pptx.slides[0].calls[4].options.fontSize, 15);
  assert.equal(result.pptx.slides[0].calls[4].options.color, '0F172A');
  assert.deepEqual(result.pptx.slides[0].calls[4].options.fill, { color: 'F8FAFC' });
  assert.deepEqual(result.pptx.slides[0].calls[4].options.border, {
    type: 'dash',
    color: '94A3B8',
    pt: 1.5
  });
  assert.equal(result.diagnostics.unsupportedNodes[0].id, 'table-1');
  assert.deepEqual(result.diagnostics.missingAssets, []);
});

test('createCanonicalPptxExport resolves nested theme tokens and CSS fallbacks', () => {
  const result = pptxExport.createCanonicalPptxExport({
    theme: {
      tokens: {
        '--background': '#0f172a',
        '--accent': '#14b8a6',
        '--primary': 'var(--accent)'
      }
    },
    slides: [{
      layout: {
        background: { style: 'background-color: var(--background);' }
      },
      nodes: [
        {
          id: 'themed-text',
          type: 'text',
          text: 'Themed text',
          style: 'color: var(--primary);',
          layout: { x: 0, y: 0, width: 300, height: 80 }
        },
        {
          id: 'themed-shape',
          type: 'shape',
          style: 'background-color: var(--surface, rgba(255, 255, 255, 0.2)); border-color: var(--primary);',
          layout: { x: 0, y: 100, width: 300, height: 80 }
        }
      ]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.pptx.slides[0].background, { color: '0F172A' });
  assert.equal(result.pptx.slides[0].calls[0].options.color, '14B8A6');
  assert.deepEqual(result.pptx.slides[0].calls[1].options.fill, {
    color: 'FFFFFF',
    transparency: 80
  });
  assert.equal(result.pptx.slides[0].calls[1].options.line.color, '14B8A6');
});

test('preflightCanonicalPptxExport reports unresolved theme tokens without flagging fallbacks', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      id: 'slide-1',
      layout: {
        background: {
          style: 'background-color: var(--missing-slide-fallback, #ffffff); border-color: var(--missing-slide);'
        }
      },
      nodes: [
        {
          id: 'missing-node',
          type: 'text',
          text: 'Missing token',
          style: 'color: var(--missing-node);',
          layout: { x: 0, y: 0, width: 300, height: 80 }
        },
        {
          id: 'fallback-node',
          type: 'text',
          text: 'Fallback token',
          style: 'color: var(--missing-node-fallback, #ffffff);',
          layout: { x: 0, y: 100, width: 300, height: 80 }
        }
      ]
    }]
  });

  assert.deepEqual(report.diagnostics.unresolvedThemeTokens, [
    { id: 'slide-1:background', tokens: ['--missing-slide'] },
    { id: 'missing-node', tokens: ['--missing-node'] }
  ]);
  assert.match(report.diagnostics.warnings.join('\n'), /unresolved theme token/);
});

test('createCanonicalPptxExport prefers the canonical node asset reference', () => {
  const result = pptxExport.createCanonicalPptxExport({
    assets: [
      { id: 'asset-canonical', src: 'data:image/png;base64,CANONICAL' },
      { id: 'asset-legacy', src: 'data:image/png;base64,LEGACY' }
    ],
    slides: [{
      nodes: [{
        id: 'image-1',
        type: 'image',
        assetId: 'asset-canonical',
        attributes: { src: 'legacy.png', 'data-asset-id': 'asset-legacy' },
        layout: { x: 0, y: 0, width: 100, height: 100 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.equal(result.pptx.slides[0].calls[0].type, 'image');
  assert.equal(result.pptx.slides[0].calls[0].options.data, 'data:image/png;base64,CANONICAL');
});

test('createCanonicalPptxExport prefers the canonical node background asset reference', () => {
  const result = pptxExport.createCanonicalPptxExport({
    assets: [
      { id: 'asset-canonical-background', src: 'canonical.png' },
      { id: 'asset-legacy-background', src: 'legacy.png' }
    ],
    slides: [{
      nodes: [{
        id: 'panel-1',
        type: 'shape',
        backgroundAssetId: 'asset-canonical-background',
        attributes: { 'data-background-asset-id': 'asset-legacy-background' },
        style: 'background-image: url("legacy.png");',
        layout: { x: 0, y: 0, width: 100, height: 100 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.equal(result.pptx.slides[0].calls[0].type, 'image');
  assert.equal(result.pptx.slides[0].calls[0].options.path, 'canonical.png');
});

test('createCanonicalPptxExport prefers the canonical slide background asset reference', () => {
  const result = pptxExport.createCanonicalPptxExport({
    assets: [
      { id: 'asset-canonical-slide-background', src: 'canonical-background.png' },
      { id: 'asset-legacy-slide-background', src: 'legacy-background.png' }
    ],
    slides: [{
      layout: {
        background: {
          assetId: 'asset-canonical-slide-background',
          image: 'url("legacy-background.png")'
        }
      },
      nodes: []
    }]
  }, { PptxGenJS: FakePptx });

  assert.equal(result.pptx.slides[0].calls[0].type, 'image');
  assert.equal(result.pptx.slides[0].calls[0].options.path, 'canonical-background.png');
});

test('createCanonicalPptxExport preserves table cell spans', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'spanned-table',
        type: 'table',
        layout: { x: 0, y: 0, width: 300, height: 100 },
        children: [{
          tagName: 'tr',
          children: [{
            tagName: 'td',
            text: 'Merged',
            attributes: { colspan: '2' }
          }, {
            tagName: 'td',
            text: 'Tall',
            attributes: { rowspan: '2' }
          }]
        }, {
          tagName: 'tr',
          children: [{ tagName: 'td', text: 'Bottom' }]
        }]
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.pptx.slides[0].calls[0].rows, [
    [
      { text: 'Merged', options: { colspan: 2 } },
      { text: 'Tall', options: { rowspan: 2 } }
    ],
    ['Bottom']
  ]);
});

test('createCanonicalPptxExport preserves explicit table column widths', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'sized-table',
        type: 'table',
        layout: { x: 0, y: 0, width: 400, height: 100 },
        children: [{
          tagName: 'tr',
          children: [
            { tagName: 'td', text: 'Narrow', style: 'width: 100px;' },
            { tagName: 'td', text: 'Wide', style: 'width: 300px;' }
          ]
        }]
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const columnWidths = result.pptx.slides[0].calls[0].options.colW;
  assert.equal(columnWidths.length, 2);
  assert.ok(Math.abs(columnWidths[0] - 1.3333) < 0.001);
  assert.ok(Math.abs(columnWidths[1] - 3.9999) < 0.001);
});

test('createCanonicalPptxExport preserves explicit table row heights', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'tall-table',
        type: 'table',
        layout: { x: 0, y: 0, width: 400, height: 100 },
        children: [{
          tagName: 'tr',
          style: 'height: 25px;',
          children: [{ tagName: 'td', text: 'Short' }]
        }, {
          tagName: 'tr',
          style: 'height: 75px;',
          children: [{ tagName: 'td', text: 'Tall' }]
        }]
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const rowHeights = result.pptx.slides[0].calls[0].options.rowH;
  assert.equal(rowHeights.length, 2);
  assert.ok(Math.abs(rowHeights[0] - 0.3333) < 0.001);
  assert.ok(Math.abs(rowHeights[1] - 0.9999) < 0.001);
});

test('createCanonicalPptxExport preserves simple table cell padding', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'padded-table',
        type: 'table',
        layout: { x: 0, y: 0, width: 200, height: 80 },
        children: [{
          tagName: 'tr',
          children: [{
            tagName: 'td',
            text: 'Padded',
            style: 'padding: 12px;'
          }]
        }]
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.ok(Math.abs(result.pptx.slides[0].calls[0].rows[0][0].options.margin - 0.125) < 0.001);
});

test('resolvePptxExportOptions keeps the default wide layout for canonical 16:9 decks', () => {
  const result = pptxExport.resolvePptxExportOptions({
    layout: { size: { width: 1920, height: 1080, unit: 'px' } },
    slides: []
  });

  assert.equal(result.options.layout, 'LAYOUT_WIDE');
  assert.equal(result.options.pageWidth, 13.333);
  assert.equal(result.options.pageHeight, 7.5);
  assert.equal(result.options.customLayout, null);
});

test('createCanonicalPptxExport fails closed for an empty canonical deck', () => {
  const result = pptxExport.createCanonicalPptxExport({ slides: [] }, { PptxGenJS: FakePptx });

  assert.equal(result.pptx, null);
  assert.equal(result.slideCount, 0);
  assert.deepEqual(result.diagnostics.warnings, ['Canonical deck has no slides']);
});

test('createCanonicalPptxExport fails closed when the generator cannot add slides', () => {
  class NoSlidePptx {
    write() {}
  }

  const result = pptxExport.createCanonicalPptxExport({
    slides: [{ id: 'slide-1', nodes: [] }]
  }, { PptxGenJS: NoSlidePptx });

  assert.equal(result.pptx, null);
  assert.equal(result.slideCount, 0);
  assert.deepEqual(result.diagnostics.warnings, ['PptxGenJS cannot add slides']);
});

test('createCanonicalPptxExport fails closed when a slide cannot be created', () => {
  class NullSlidePptx extends FakePptx {
    addSlide() {
      return null;
    }
  }

  const result = pptxExport.createCanonicalPptxExport({
    slides: [{ id: 'slide-1', nodes: [] }]
  }, { PptxGenJS: NullSlidePptx });

  assert.equal(result.pptx, null);
  assert.equal(result.slideCount, 0);
  assert.deepEqual(result.diagnostics.warnings, ['PptxGenJS could not create slide slide-1']);
});

test('createCanonicalPptxExport preserves canonical slide sections', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [
      { id: 'slide-1', section: 'Opening', nodes: [] },
      { id: 'slide-2', section: 'Opening', nodes: [] },
      { id: 'slide-3', section: 'Closing', nodes: [] }
    ]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.pptx.sections, [
    { title: 'Opening' },
    { title: 'Closing' }
  ]);
  assert.deepEqual(result.pptx.slideOptions, [
    { sectionTitle: 'Opening' },
    { sectionTitle: 'Opening' },
    { sectionTitle: 'Closing' }
  ]);
  assert.deepEqual(result.diagnostics.warnings, []);
});

test('createCanonicalPptxExport warns when section support is unavailable', () => {
  class LegacyPptx extends FakePptx {
    constructor() {
      super();
      this.addSection = undefined;
    }
  }

  const result = pptxExport.createCanonicalPptxExport({
    slides: [{ id: 'slide-1', section: 'Opening', nodes: [] }]
  }, { PptxGenJS: LegacyPptx });

  assert.match(result.diagnostics.warnings.join('\n'), /sections are unavailable/);
  assert.deepEqual(result.pptx.slideOptions, [undefined]);
});

test('createCanonicalPptxExport reports missing geometry and image assets without throwing', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [
        { id: 'flow-1', type: 'text', text: 'No bounds' },
        {
          id: 'image-1',
          type: 'image',
          layout: { x: 0, y: 0, width: 100, height: 100 }
        }
      ]
    }]
  }, { PptxGenJS: FakePptx });

  assert.equal(result.slideCount, 1);
  assert.deepEqual(result.diagnostics.missingAssets, ['image-1']);
  assert.match(result.diagnostics.warnings[0], /flow-1/);
  assert.equal(result.pptx.slides[0].calls.length, 0);
});

test('preflightCanonicalPptxExport reports chart nodes as unsupported', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'chart-1',
        type: 'chart',
        text: 'Quarterly trend',
        layout: { x: 0, y: 0, width: 300, height: 200 }
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedNodes, [{
    id: 'chart-1',
    type: 'chart',
    tagName: '',
    reason: 'node type chart'
  }]);
  assert.match(report.diagnostics.warnings.join('\n'), /node type chart/);
});

test('createCanonicalPptxExport renders metadata-backed bar charts', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'chart-1',
        type: 'chart',
        attributes: {
          'data-chart-type': 'bar',
          'data-chart-labels': 'Q1,Q2,Q3',
          'data-chart-values': '42,68,55',
          'data-chart-title': 'Quarterly trend'
        },
        layout: { x: 100, y: 80, width: 600, height: 360 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.diagnostics.unsupportedNodes, []);
  assert.deepEqual(result.pptx.slides[0].calls, [{
    type: 'chart',
    chartType: 'bar',
    data: [{
      name: 'Quarterly trend',
      labels: ['Q1', 'Q2', 'Q3'],
      values: [42, 68, 55]
    }],
    options: {
      x: 0.6944270833333334,
      y: 0.5555555555555556,
      w: 4.1665625,
      h: 2.5,
      barDir: 'col',
      showLegend: false,
      showTitle: true,
      title: 'Quarterly trend'
    }
  }]);
});

test('createCanonicalPptxExport preserves explicit horizontal chart direction', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'horizontal-chart',
        type: 'chart',
        attributes: {
          'data-chart-type': 'bar',
          'data-chart-direction': 'horizontal',
          'data-chart-labels': 'Q1,Q2',
          'data-chart-values': '42,68'
        },
        layout: { x: 100, y: 80, width: 600, height: 360 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const chartCall = result.pptx.slides[0].calls.find(call => call.type === 'chart');
  assert.equal(result.diagnostics.unsupportedNodes.length, 0);
  assert.equal(chartCall.options.barDir, 'bar');
  assert.deepEqual(chartCall.data[0].values, [42, 68]);
});

test('createCanonicalPptxExport preserves legacy chart bars without metadata', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'legacy-chart',
        type: 'chart',
        classes: ['editor-chart'],
        children: [
          {
            id: 'legacy-title',
            classes: ['editor-chart-title'],
            text: 'Legacy trend'
          },
          {
            id: 'legacy-bars',
            children: [
              { id: 'bar-1', classes: ['editor-chart-bar'], style: 'height: 42%;' },
              { id: 'bar-2', classes: ['editor-chart-bar'], style: 'height: 68%;' },
              { id: 'bar-3', classes: ['editor-chart-bar'], style: 'height: 55%;' }
            ]
          }
        ],
        layout: { x: 100, y: 80, width: 600, height: 360 }
      }]
    }],
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.diagnostics.unsupportedNodes, []);
  assert.deepEqual(result.pptx.slides[0].calls.find(call => call.type === 'chart'), {
    type: 'chart',
    chartType: 'bar',
    data: [{
      name: 'Legacy trend',
      labels: ['1', '2', '3'],
      values: [42, 68, 55]
    }],
    options: {
      x: 0.6944270833333334,
      y: 0.5555555555555556,
      w: 4.1665625,
      h: 2.5,
      barDir: 'col',
      showLegend: false,
      showTitle: true,
      title: 'Legacy trend'
    }
  });
});

test('createCanonicalPptxExport renders embed placeholders as labeled shapes', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'embed-placeholder',
        type: 'embed',
        classes: ['editor-embed-placeholder'],
        text: 'Media / Embed Placeholder',
        style: 'background-color: rgba(112, 40, 208, 0.14); border-color: #c4a1ff; border-style: dashed; border-width: 1px; border-radius: 12px; color: #c4a1ff; font-size: 18px; font-weight: 600;',
        layout: { x: 100, y: 80, width: 560, height: 315 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.diagnostics.unsupportedNodes, []);
  const calls = result.pptx.slides[0].calls;
  assert.deepEqual(calls.map(call => call.type), ['shape', 'text']);
  assert.equal(calls[0].shapeType, 'ROUND_RECTANGLE');
  assert.deepEqual(calls[0].options.fill, { color: '7028D0', transparency: 86 });
  assert.deepEqual(calls[0].options.line, {
    color: 'C4A1FF',
    width: 0.75,
    dashType: 'dash'
  });
  assert.equal(calls[1].text, 'Media / Embed Placeholder');
  assert.equal(calls[1].options.color, 'C4A1FF');
  assert.equal(calls[1].options.fontSize, 13.5);
  assert.equal(calls[1].options.bold, true);
});

test('preflightCanonicalPptxExport keeps real embeds unsupported', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'real-embed',
        type: 'embed',
        attributes: { src: 'https://example.com/video' },
        layout: { x: 100, y: 80, width: 560, height: 315 }
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedNodes, [{
    id: 'real-embed',
    type: 'embed',
    tagName: '',
    reason: 'node type embed'
  }]);
});

test('createCanonicalPptxExport renders self-contained inline SVG nodes as data images', () => {
  const svg = '<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="#123456" /></svg>';
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'vector-1',
        type: 'vector',
        tagName: 'svg',
        html: svg,
        layout: { x: 100, y: 80, width: 300, height: 200 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.diagnostics.unsupportedNodes, []);
  const imageCall = result.pptx.slides[0].calls[0];
  assert.equal(imageCall.type, 'image');
  assert.equal(imageCall.options.data, `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
});

test('createCanonicalPptxExport restores safe SVG root attributes stripped during import', () => {
  const svg = '<svg><rect width="10" height="10" fill="#123456" /></svg>';
  const restoredSvg = '<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="#123456" /></svg>';
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'imported-vector',
        type: 'vector',
        tagName: 'svg',
        html: svg,
        attributes: {
          viewBox: '0 0 10 10',
          xmlns: 'http://www.w3.org/2000/svg'
        },
        layout: { x: 100, y: 80, width: 300, height: 200 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const encodedSvg = result.pptx.slides[0].calls[0].options.data.split(',')[1];
  assert.equal(Buffer.from(encodedSvg, 'base64').toString('utf8'), restoredSvg);
});

test('preflightCanonicalPptxExport keeps external SVG sources unsupported', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'external-vector',
        type: 'vector',
        tagName: 'svg',
        html: '<svg><image href="https://example.com/image.png" /></svg>',
        layout: { x: 100, y: 80, width: 300, height: 200 }
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedNodes, [{
    id: 'external-vector',
    type: 'vector',
    tagName: 'svg',
    reason: 'node type vector'
  }]);
});

test('preflightCanonicalPptxExport does not warn for bound children inside flow containers', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'flow-container',
        type: 'container',
        children: [{
          id: 'positioned-child',
          type: 'text',
          text: 'Exported child',
          layout: { x: 10, y: 20, width: 120, height: 30 }
        }]
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.warnings, []);
});

test('preflightCanonicalPptxExport ignores empty flow wrappers and flattened SVG internals', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'empty-wrapper',
        type: 'container',
        children: []
      }, {
        id: 'vector-1',
        type: 'vector',
        tagName: 'svg',
        html: '<svg><path d="M0 0" /></svg>',
        layout: { x: 10, y: 20, width: 100, height: 80 },
        children: [{
          id: 'path-1',
          tagName: 'path'
        }]
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.warnings, []);
});

test('preflightCanonicalPptxExport keeps missing-bounds warnings for exportable nodes', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'image-without-bounds',
        type: 'image',
        tagName: 'img'
      }]
    }]
  });

  assert.ok(report.diagnostics.warnings.includes('Node image-without-bounds has no exportable bounds'));
});

test('preflightCanonicalPptxExport ignores unpositioned inline descendants rendered by flow text parents', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'paragraph-1',
        type: 'text',
        tagName: 'p',
        text: '',
        layout: { x: 10, y: 20, width: 300, height: 40 },
        children: [{
          id: 'inline-1',
          type: 'text',
          tagName: 'span',
          text: 'Inline text'
        }]
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.warnings, []);
});

test('preflightCanonicalPptxExport keeps warnings for unpositioned text beside positioned flow children', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'paragraph-1',
        type: 'text',
        tagName: 'p',
        text: '',
        layout: { x: 10, y: 20, width: 300, height: 40 },
        children: [{
          id: 'inline-1',
          type: 'text',
          tagName: 'span',
          text: 'Unpositioned text'
        }, {
          id: 'positioned-1',
          type: 'text',
          tagName: 'span',
          text: 'Positioned text',
          layout: { x: 10, y: 20, width: 100, height: 20 }
        }]
      }]
    }]
  });

  assert.ok(report.diagnostics.warnings.includes('Node inline-1 has no exportable bounds'));
});

test('preflightCanonicalPptxExport ignores structural inline break nodes without bounds', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'heading-1',
        type: 'text',
        tagName: 'h1',
        text: 'Heading',
        layout: { x: 10, y: 20, width: 300, height: 40 },
        children: [{
          id: 'break-1',
          tagName: 'br'
        }]
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.warnings, []);
});

test('createCanonicalPptxExport uses rendered bounds for flow nodes and nested children', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'flow-container',
        type: 'container',
        layout: { bounds: { x: 100, y: 50, width: 400, height: 200 } },
        children: [{
          id: 'flow-text',
          type: 'text',
          text: 'Rendered flow text',
          layout: { bounds: { x: 20, y: 30, width: 160, height: 40 } }
        }]
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.diagnostics.warnings, []);
  assert.deepEqual(result.pptx.slides[0].calls.map(call => call.type), ['text']);
  const textCall = result.pptx.slides[0].calls[0];
  assert.ok(Math.abs(textCall.options.x - 1.6) < 0.001);
  assert.ok(Math.abs(textCall.options.y - 1.06664) < 0.001);
  assert.ok(Math.abs(textCall.options.w - 2.13328) < 0.001);
  assert.ok(Math.abs(textCall.options.h - 0.53332) < 0.001);
});

test('preflightCanonicalPptxExport reports children clipped by overflow-hidden ancestors', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'clipping-panel',
        type: 'container',
        style: 'overflow: hidden;',
        layout: { x: 100, y: 50, width: 200, height: 100 },
        children: [{
          id: 'clipped-child',
          type: 'text',
          text: 'Clipped content',
          layout: { x: 180, y: 10, width: 80, height: 30 }
        }]
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.clippedNodes.map(node => node.id), ['clipped-child']);
  assert.match(report.diagnostics.warnings.join('\n'), /overflow-clipped ancestor/);
});

test('preflightCanonicalPptxExport checks non-empty image paths when an asset resolver is provided', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    assets: [{ id: 'asset-1', src: 'images/missing.png' }],
    slides: [{
      nodes: [{
        id: 'image-1',
        type: 'image',
        attributes: { 'data-asset-id': 'asset-1' },
        layout: { x: 0, y: 0, width: 100, height: 100 }
      }]
    }]
  }, {
    assetBaseDir: '/deck',
    assetExists(source) {
      return source !== '/deck/images/missing.png';
    }
  });

  assert.deepEqual(report.diagnostics.missingAssets, ['image-1']);
  assert.match(report.diagnostics.warnings.join('\n'), /missing image asset/);
});

test('createCanonicalPptxExport resolves root-relative asset paths through the asset root', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'image-1',
        type: 'image',
        attributes: { src: '/presentations/demo/assets/image.png' },
        layout: { x: 0, y: 0, width: 100, height: 100 }
      }]
    }]
  }, {
    PptxGenJS: FakePptx,
    assetRootDir: '/workspace',
    assetExists(source) {
      return source === '/workspace/presentations/demo/assets/image.png';
    }
  });

  assert.deepEqual(result.diagnostics.missingAssets, []);
  assert.equal(
    result.pptx.slides[0].calls[0].options.path,
    '/workspace/presentations/demo/assets/image.png'
  );
});

test('createCanonicalPptxExport normalizes local asset URL decorators before resolving paths', () => {
  let resolvedAssetSource = '';
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'image-1',
        type: 'image',
        attributes: { src: '/presentations/demo/assets/image.png?v=2#hero' },
        layout: { x: 0, y: 0, width: 100, height: 100 }
      }]
    }]
  }, {
    PptxGenJS: FakePptx,
    assetRootDir: '/workspace',
    assetExists(source) {
      resolvedAssetSource = source;
      return true;
    }
  });

  assert.equal(resolvedAssetSource, '/workspace/presentations/demo/assets/image.png');
  assert.equal(
    result.pptx.slides[0].calls[0].options.path,
    '/workspace/presentations/demo/assets/image.png'
  );
});

test('createCanonicalPptxExport skips missing image files after preflight', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'image-1',
        type: 'image',
        attributes: { src: '/deck/images/missing.png' },
        layout: { x: 0, y: 0, width: 100, height: 100 }
      }]
    }]
  }, {
    PptxGenJS: FakePptx,
    assetExists: () => false
  });

  assert.deepEqual(result.diagnostics.missingAssets, ['image-1']);
  assert.deepEqual(result.pptx.slides[0].calls, []);
});

test('createCanonicalPptxExport preserves solid legacy slide backgrounds from style text', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      layout: { background: { style: 'background: #123456;' } },
      nodes: []
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.pptx.slides[0].background, { color: '123456' });
});

test('createCanonicalPptxExport flattens CSS gradients to deterministic first-stop fallbacks', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      id: 'gradient-slide',
      layout: {
        background: {
          style: 'background: linear-gradient(135deg, #123456 0%, #abcdef 100%);'
        }
      },
      nodes: [{
        id: 'gradient-shape',
        type: 'shape',
        style: 'background-image: radial-gradient(circle, rgb(17, 34, 51), #ffffff);',
        layout: { x: 50, y: 50, width: 200, height: 100 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.pptx.slides[0].background, { color: '123456' });
  assert.equal(result.pptx.slides[0].calls[0].options.fill.color, '112233');
  assert.match(result.diagnostics.warnings.join('\n'), /gradient-slide uses unsupported CSS background gradients/);
  assert.match(result.diagnostics.warnings.join('\n'), /gradient-shape uses unsupported background gradients/);
});

test('createCanonicalPptxExport renders canonical slide background images before nodes', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      id: 'slide-1',
      layout: {
        background: {
          image: 'url("data:image/png;base64,AAAA")',
          style: 'background-size: cover; background-position: center;'
        }
      },
      nodes: [{
        id: 'text-1',
        type: 'text',
        text: 'Foreground',
        layout: { x: 100, y: 50, width: 200, height: 40 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.pptx.slides[0].calls.map(call => call.type), ['image', 'text']);
  assert.deepEqual(result.pptx.slides[0].calls[0].options, {
    data: 'data:image/png;base64,AAAA',
    x: 0,
    y: 0,
    w: 13.333,
    h: 6.6665,
    sizing: {
      type: 'cover',
      x: 0,
      y: 0,
      w: 13.333,
      h: 6.6665
    }
  });
  assert.deepEqual(result.diagnostics.missingBackgroundAssets, []);
  assert.deepEqual(result.diagnostics.warnings, []);
});

test('createCanonicalPptxExport preserves focal positioning for slide background images', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 1000, unit: 'px' } },
    assets: [{
      id: 'asset-1',
      src: 'data:image/png;base64,AAAA',
      meta: { width: 1600, height: 900 }
    }],
    slides: [{
      layout: {
        background: {
          image: 'url("data:image/png;base64,AAAA")',
          style: 'background-size: cover; background-position: right bottom; background-repeat: no-repeat;'
        }
      },
      nodes: []
    }]
  }, { PptxGenJS: FakePptx });

  const imageOptions = result.pptx.slides[0].calls[0].options;
  assert.equal(imageOptions.sizing.type, 'crop');
  assert.ok(imageOptions.w > imageOptions.sizing.w);
  assert.ok(imageOptions.h >= imageOptions.sizing.h);
  assert.ok(imageOptions.sizing.x > 0);
  assert.ok(imageOptions.sizing.y >= 0);
  assert.deepEqual(result.diagnostics.unsupportedStyles, []);
});

test('preflightCanonicalPptxExport reports missing slide background image assets', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      id: 'slide-1',
      layout: { background: { image: 'url("images/background.png")' } },
      nodes: []
    }]
  }, {
    assetBaseDir: '/deck',
    assetExists(source) {
      return source !== '/deck/images/background.png';
    }
  });

  assert.deepEqual(report.diagnostics.missingBackgroundAssets, ['slide-1:background']);
  assert.match(report.diagnostics.warnings.join('\n'), /missing background image asset/);
});

test('createCanonicalPptxExport renders node background images before child content', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'panel-1',
        type: 'container',
        style: 'background-image: url("data:image/png;base64,AAAA"); background-size: cover; background-position: center;',
        layout: { x: 100, y: 50, width: 400, height: 200 },
        children: [{
          id: 'panel-text',
          type: 'text',
          text: 'Panel content',
          layout: { x: 20, y: 15, width: 200, height: 40 }
        }]
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.pptx.slides[0].calls.map(call => call.type), ['image', 'text']);
  assert.deepEqual(result.pptx.slides[0].calls[0].options.sizing, {
    type: 'cover',
    x: 1.3333,
    y: 0.66665,
    w: 5.3332,
    h: 2.6666
  });
  assert.deepEqual(result.diagnostics.missingNodeBackgroundAssets, []);
});

test('createCanonicalPptxExport preserves focal positioning for node background images', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 1000, unit: 'px' } },
    assets: [{
      id: 'asset-1',
      src: 'data:image/png;base64,AAAA',
      meta: { width: 1600, height: 900 }
    }],
    slides: [{
      nodes: [{
        id: 'panel-1',
        type: 'container',
        style: 'background-image: url("data:image/png;base64,AAAA"); background-size: cover; background-position: right bottom; background-repeat: no-repeat;',
        layout: { x: 100, y: 50, width: 400, height: 400 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const imageOptions = result.pptx.slides[0].calls[0].options;
  assert.equal(imageOptions.sizing.type, 'crop');
  assert.ok(imageOptions.w > imageOptions.sizing.w);
  assert.ok(imageOptions.h >= imageOptions.sizing.h);
  assert.ok(imageOptions.sizing.x > 0);
  assert.ok(imageOptions.sizing.y >= 0);
  assert.deepEqual(result.diagnostics.unsupportedStyles, []);
});

test('createCanonicalPptxExport renders solid node backgrounds beneath child content with alpha', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'panel-1',
        type: 'container',
        style: 'background-color: rgba(10, 20, 30, 0.5);',
        layout: { x: 100, y: 50, width: 400, height: 200 },
        children: [{
          id: 'panel-text',
          type: 'text',
          text: 'Panel content',
          layout: { x: 20, y: 15, width: 200, height: 40 }
        }]
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.pptx.slides[0].calls.map(call => call.type), ['shape', 'text']);
  assert.deepEqual(result.pptx.slides[0].calls[0].options.fill, {
    color: '0A141E',
    transparency: 50
  });
  assert.deepEqual(result.pptx.slides[0].calls[0].options.line, {
    color: '0A141E',
    transparency: 100,
    width: 0
  });
});

test('createCanonicalPptxExport preserves rounded and circular shape geometry', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'rounded-card',
        type: 'shape',
        style: 'background-color: #123456; border-radius: 16px;',
        layout: { x: 0, y: 0, width: 400, height: 200 }
      }, {
        id: 'circle',
        type: 'shape',
        style: 'background-color: #abcdef; border-radius: 50%;',
        layout: { x: 500, y: 0, width: 200, height: 200 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(
    result.pptx.slides[0].calls.map(call => call.shapeType),
    ['ROUND_RECTANGLE', 'ELLIPSE']
  );
});

test('createCanonicalPptxExport preserves supported shape border styles', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'dotted-shape',
        type: 'shape',
        style: 'border-color: #ef4444; border-style: dotted;',
        layout: { x: 0, y: 0, width: 100, height: 50 }
      }, {
        id: 'hidden-border-shape',
        type: 'shape',
        style: 'border-style: none;',
        layout: { x: 120, y: 0, width: 100, height: 50 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const shapeCalls = result.pptx.slides[0].calls;
  assert.equal(shapeCalls[0].options.line.dashType, 'sysDot');
  assert.equal(shapeCalls[1].options.line.transparency, 100);
});

test('createCanonicalPptxExport preserves rounded image corners', () => {
  const result = pptxExport.createCanonicalPptxExport({
    assets: [{ id: 'asset-1', src: 'data:image/png;base64,AAAA' }],
    slides: [{
      nodes: [{
        id: 'image-1',
        type: 'image',
        attributes: { 'data-asset-id': 'asset-1' },
        style: 'border-radius: 12px; object-fit: cover;',
        layout: { x: 0, y: 0, width: 200, height: 100 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.equal(result.pptx.slides[0].calls[0].type, 'image');
  assert.equal(result.pptx.slides[0].calls[0].options.rounding, true);
});

test('createCanonicalPptxExport preserves node opacity across text, shape, and image output', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    assets: [{ id: 'asset-1', src: 'data:image/png;base64,AAAA' }],
    slides: [{
      nodes: [{
        id: 'text-1',
        type: 'text',
        text: 'Faded text',
        style: 'opacity: 0.6;',
        layout: { x: 0, y: 0, width: 200, height: 40 }
      }, {
        id: 'shape-1',
        type: 'shape',
        style: 'background-color: rgba(10, 20, 30, 0.5); opacity: 0.5;',
        layout: { x: 0, y: 50, width: 200, height: 40 }
      }, {
        id: 'image-1',
        type: 'image',
        attributes: { 'data-asset-id': 'asset-1' },
        style: 'opacity: 25%;',
        layout: { x: 0, y: 100, width: 200, height: 40 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const [textCall, shapeCall, imageCall] = result.pptx.slides[0].calls;
  assert.equal(textCall.options.transparency, 40);
  assert.equal(shapeCall.options.fill.transparency, 75);
  assert.equal(shapeCall.options.line.transparency, 50);
  assert.equal(imageCall.options.transparency, 75);
});

test('createCanonicalPptxExport preserves supported CSS text line heights', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'pixel-leading',
        type: 'text',
        text: 'Pixel leading',
        style: 'font-size: 20px; line-height: 30px;',
        layout: { x: 0, y: 0, width: 200, height: 60 }
      }, {
        id: 'unitless-leading',
        type: 'text',
        text: 'Unitless leading',
        style: 'font-size: 20px; line-height: 1.5;',
        layout: { x: 0, y: 80, width: 200, height: 60 }
      }, {
        id: 'percentage-leading',
        type: 'text',
        text: 'Percentage leading',
        style: 'font-size: 20px; line-height: 150%;',
        layout: { x: 0, y: 160, width: 200, height: 60 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const [pixelText, unitlessText, percentageText] = result.pptx.slides[0].calls;
  assert.equal(pixelText.options.lineSpacing, 22.5);
  assert.equal(pixelText.options.lineSpacingMultiple, undefined);
  assert.equal(unitlessText.options.lineSpacingMultiple, 1.5);
  assert.equal(percentageText.options.lineSpacingMultiple, 1.5);
});

test('createCanonicalPptxExport preserves supported CSS text vertical alignment', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'top-text',
        type: 'text',
        text: 'Top',
        style: 'vertical-align: top;',
        layout: { x: 0, y: 0, width: 100, height: 40 }
      }, {
        id: 'middle-text',
        type: 'text',
        text: 'Middle',
        style: 'vertical-align: middle;',
        layout: { x: 0, y: 50, width: 100, height: 40 }
      }, {
        id: 'bottom-text',
        type: 'text',
        text: 'Bottom',
        style: 'vertical-align: bottom;',
        layout: { x: 0, y: 100, width: 100, height: 40 }
      }, {
        id: 'default-text',
        type: 'text',
        text: 'Default',
        layout: { x: 0, y: 150, width: 100, height: 40 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const calls = result.pptx.slides[0].calls;
  assert.deepEqual(calls.map(call => call.options.valign), ['top', 'middle', 'bottom', undefined]);
});

test('createCanonicalPptxExport normalizes CSS text alignment values', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'start-text',
        type: 'text',
        text: 'Start',
        style: 'text-align: start;',
        layout: { x: 0, y: 0, width: 100, height: 40 }
      }, {
        id: 'end-text',
        type: 'text',
        text: 'End',
        style: 'text-align: end;',
        layout: { x: 0, y: 50, width: 100, height: 40 }
      }, {
        id: 'justify-text',
        type: 'text',
        text: 'Justify',
        style: 'text-align: justify;',
        layout: { x: 0, y: 100, width: 100, height: 40 }
      }, {
        id: 'invalid-text',
        type: 'text',
        text: 'Fallback',
        style: 'text-align: match-parent;',
        layout: { x: 0, y: 150, width: 100, height: 40 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(
    result.pptx.slides[0].calls.map(call => call.options.align),
    ['left', 'right', 'justify', 'left']
  );
});

test('createCanonicalPptxExport preserves supported CSS text decorations', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'underlined-text',
        type: 'text',
        text: 'Underlined',
        style: 'text-decoration: underline;',
        layout: { x: 0, y: 0, width: 100, height: 40 }
      }, {
        id: 'struck-text',
        type: 'text',
        text: 'Struck',
        style: 'text-decoration-line: line-through;',
        layout: { x: 0, y: 50, width: 100, height: 40 }
      }, {
        id: 'combined-text',
        type: 'text',
        text: 'Combined',
        style: 'text-decoration: underline line-through;',
        layout: { x: 0, y: 100, width: 100, height: 40 }
      }, {
        id: 'plain-text',
        type: 'text',
        text: 'Plain',
        style: 'text-decoration: none;',
        layout: { x: 0, y: 150, width: 100, height: 40 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const calls = result.pptx.slides[0].calls;
  assert.deepEqual(calls.map(call => call.options.underline), [
    { style: 'sng' }, undefined, { style: 'sng' }, undefined
  ]);
  assert.deepEqual(calls.map(call => call.options.strike), [undefined, true, true, undefined]);
});

test('createCanonicalPptxExport preserves supported CSS letter spacing', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'spaced-text',
        type: 'text',
        text: 'Spaced',
        style: 'letter-spacing: 2px;',
        layout: { x: 0, y: 0, width: 100, height: 40 }
      }, {
        id: 'zero-spaced-text',
        type: 'text',
        text: 'Zero spacing',
        style: 'letter-spacing: 0;',
        layout: { x: 0, y: 50, width: 100, height: 40 }
      }, {
        id: 'normal-spaced-text',
        type: 'text',
        text: 'Normal spacing',
        style: 'letter-spacing: normal;',
        layout: { x: 0, y: 100, width: 100, height: 40 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(
    result.pptx.slides[0].calls.map(call => call.options.charSpacing),
    [1.5, 0, undefined]
  );
});

test('createCanonicalPptxExport preserves simple text padding', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'padded-text',
        type: 'text',
        text: 'Padded',
        style: 'padding: 12px;',
        layout: { x: 0, y: 0, width: 200, height: 50 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.ok(Math.abs(result.pptx.slides[0].calls[0].options.margin - 0.125) < 0.001);
});

test('preflightCanonicalPptxExport reports missing node background image assets', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'panel-1',
        type: 'container',
        style: 'background-image: url("images/panel.png");',
        layout: { x: 0, y: 0, width: 100, height: 100 }
      }]
    }]
  }, {
    assetBaseDir: '/deck',
    assetExists(source) {
      return source !== '/deck/images/panel.png';
    }
  });

  assert.deepEqual(report.diagnostics.missingNodeBackgroundAssets, ['panel-1:background']);
  assert.match(report.diagnostics.warnings.join('\n'), /missing background image asset/);
});

test('preflightCanonicalPptxExport reports gradients layered over node background images', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'panel-1',
        type: 'container',
        style: 'background-image: linear-gradient(red, blue), url("data:image/png;base64,AAAA");',
        layout: { x: 0, y: 0, width: 200, height: 100 }
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, [
    { id: 'panel-1', properties: ['background-image'] }
  ]);
  assert.match(report.diagnostics.warnings.join('\n'), /unsupported background gradients/);
});

test('createCanonicalPptxExport resolves grouped child positions from parent-local coordinates', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'group-1',
        type: 'group',
        layout: { x: 200, y: 100, width: 300, height: 200 },
        children: [{
          id: 'group-2',
          type: 'group',
          layout: { x: 50, y: 25, width: 150, height: 100 },
          children: [{
            id: 'text-1',
            type: 'text',
            text: 'Nested',
            layout: { x: 10, y: 5, width: 100, height: 40 }
          }]
        }]
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const textCall = result.pptx.slides[0].calls[0];
  assert.equal(textCall.type, 'text');
  assert.ok(Math.abs(textCall.options.x - (260 / 1000 * 13.333)) < 0.001);
  assert.ok(Math.abs(textCall.options.y - (130 / 500 * 6.6665)) < 0.001);
  assert.deepEqual(result.diagnostics.overflowNodes, []);

  const overflowReport = pptxExport.preflightCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'group-1',
        type: 'group',
        layout: { x: 900, y: 0, width: 200, height: 100 },
        children: [{
          id: 'text-1',
          type: 'text',
          text: 'Overflow',
          layout: { x: 150, y: 0, width: 100, height: 40 }
        }]
      }]
    }]
  });
  assert.deepEqual(overflowReport.diagnostics.overflowNodes.map(node => ({
    id: node.id,
    x: node.x
  })), [{ id: 'group-1', x: 900 }, { id: 'text-1', x: 1050 }]);
});

test('createCanonicalPptxExport renders siblings in stable z-index order', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [
        {
          id: 'front',
          type: 'shape',
          style: 'background-color: #ff0000;',
          layout: { x: 0, y: 0, width: 100, height: 100, zIndex: 10 }
        },
        {
          id: 'back',
          type: 'shape',
          style: 'background-color: #0000ff;',
          layout: { x: 0, y: 0, width: 100, height: 100, zIndex: 1 }
        },
        {
          id: 'tie',
          type: 'shape',
          style: 'background-color: #00ff00;',
          layout: { x: 0, y: 0, width: 100, height: 100, zIndex: 1 }
        }
      ]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.pptx.slides[0].calls.map(call => call.options.fill.color), [
    '0000FF',
    '00FF00',
    'FF0000'
  ]);
});

test('createCanonicalPptxExport preserves aggregate text for flow-only inline children', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'heading-1',
        type: 'heading',
        tagName: 'h1',
        layout: { x: 100, y: 50, width: 400, height: 80 },
        children: [{
          id: 'heading-span-1',
          type: 'text',
          tagName: 'span',
          text: 'Rich title'
        }]
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.pptx.slides[0].calls.map(call => ({
    type: call.type,
    text: call.text
  })), [{ type: 'text', text: 'Rich title' }]);
  assert.deepEqual(result.diagnostics.warnings, []);
});

test('normalizeHexColor handles short hex and rgb values', () => {
  assert.equal(pptxExport.normalizeHexColor('#abc'), 'AABBCC');
  assert.equal(pptxExport.normalizeHexColor('rgb(1, 2, 3)'), '010203');
  assert.equal(pptxExport.normalizeHexColor('transparent'), '');
});

test('createCanonicalPptxExport ignores malformed CSS pixel values', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 100, height: 100, unit: 'px' } },
    slides: [{
      nodes: [
        {
          id: 'text-1',
          type: 'text',
          text: 'Fallback text',
          style: 'font-size: .;',
          layout: { x: 0, y: 0, width: 50, height: 20 }
        },
        {
          id: 'shape-1',
          type: 'shape',
          style: 'background-color: #fff; border-width: 1.2.3;',
          layout: { x: 0, y: 30, width: 50, height: 20 }
        }
      ]
    }]
  }, { PptxGenJS: FakePptx });

  const [textCall, shapeCall] = result.pptx.slides[0].calls;
  assert.equal(textCall.options.fontSize, 10.5);
  assert.equal(shapeCall.options.line.width, 0.5);
  assert.ok(Number.isFinite(textCall.options.fontSize));
  assert.ok(Number.isFinite(shapeCall.options.line.width));
});

test('preflightCanonicalPptxExport reports export fidelity risks', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    layout: { size: { width: 100, height: 100, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'risk-1',
        type: 'text',
        text: 'Risk',
        style: 'transform: rotate(2deg); font-family: Custom Sans;',
        layout: { x: 90, y: 90, width: 20, height: 20 }
      }]
    }]
  }, { availableFonts: [] });

  assert.deepEqual(report.diagnostics.overflowNodes.map(node => node.id), ['risk-1']);
  assert.deepEqual(report.diagnostics.unsupportedStyles, [{
    id: 'risk-1',
    properties: ['transform']
  }]);
  assert.deepEqual(report.diagnostics.fontSubstitutionRisks, [{
    id: 'risk-1',
    fontFamily: 'Custom Sans'
  }]);
  assert.match(report.diagnostics.warnings.join('\n'), /extends beyond slide bounds/);
  assert.match(report.diagnostics.warnings.join('\n'), /unsupported CSS: transform/);
});

test('preflightCanonicalPptxExport reports table cell font substitution risks', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'table-font-risk',
        type: 'table',
        layout: { x: 0, y: 0, width: 200, height: 80 },
        children: [{
          tagName: 'tr',
          children: [{
            tagName: 'td',
            text: 'Custom',
            style: 'font-family: Custom Sans;'
          }]
        }]
      }]
    }]
  }, { availableFonts: [] });

  assert.deepEqual(report.diagnostics.fontSubstitutionRisks, [{
    id: 'table-font-risk:cell-1-1',
    fontFamily: 'Custom Sans'
  }]);
  assert.match(report.diagnostics.warnings.join('\n'), /table-font-risk:cell-1-1 may substitute font Custom Sans/);
});

test('preflightCanonicalPptxExport reports table border style fallbacks', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'table-border-risk',
        type: 'table',
        style: 'border-style: dotted;',
        layout: { x: 0, y: 0, width: 200, height: 80 },
        children: [{
          tagName: 'tr',
          children: [{
            tagName: 'td',
            text: 'Fallback',
            style: 'border-style: double;'
          }]
        }]
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, [
    { id: 'table-border-risk', properties: ['border-style'] },
    { id: 'table-border-risk:cell-1-1', properties: ['border-style'] }
  ]);
  assert.match(
    report.diagnostics.warnings.join('\n'),
    /Node table-border-risk uses unsupported table border-style: dotted; using dashed fallback/
  );
  assert.match(
    report.diagnostics.warnings.join('\n'),
    /Node table-border-risk:cell-1-1 uses unsupported table cell border-style: double; using solid fallback/
  );
});

test('preflightCanonicalPptxExport reports unsupported shape border styles', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'shape-border-risk',
        type: 'shape',
        style: 'border-style: double;',
        layout: { x: 0, y: 0, width: 100, height: 50 }
      }, {
        id: 'shape-dotted',
        type: 'shape',
        style: 'border-style: dotted;',
        layout: { x: 120, y: 0, width: 100, height: 50 }
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, [
    { id: 'shape-border-risk', properties: ['border-style'] }
  ]);
  assert.match(
    report.diagnostics.warnings.join('\n'),
    /Node shape-border-risk uses unsupported shape border-style: double; using solid fallback/
  );
});

test('preflightCanonicalPptxExport reports unsupported image fit values', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'image-fit-1',
        type: 'image',
        attributes: { src: 'data:image/png;base64,AAAA' },
        style: 'object-fit: none;',
        layout: { x: 0, y: 0, width: 100, height: 100 }
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, [{
    id: 'image-fit-1',
    properties: ['object-fit']
  }]);
  assert.match(report.diagnostics.warnings.join('\n'), /unsupported image fit: none/);
});

test('preflightCanonicalPptxExport reports unsupported image positioning', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    assets: [{ id: 'asset-1', src: 'data:image/png;base64,AAAA' }],
    slides: [{
      nodes: [{
        id: 'image-1',
        type: 'image',
        attributes: { 'data-asset-id': 'asset-1' },
        style: 'object-fit: cover; object-position: left top;',
        layout: { x: 0, y: 0, width: 100, height: 100 }
      }, {
        id: 'background-image-1',
        type: 'container',
        style: 'background-image: url("data:image/png;base64,AAAA"); background-size: 100% 100%; background-position: left; background-repeat: repeat;',
        layout: { x: 100, y: 0, width: 100, height: 100 }
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, [
    { id: 'image-1', properties: ['object-position'] },
    { id: 'background-image-1', properties: ['background-size', 'background-position', 'background-repeat'] }
  ]);
  assert.match(report.diagnostics.warnings.join('\n'), /unsupported image positioning: object-position/);
  assert.match(report.diagnostics.warnings.join('\n'), /unsupported background image positioning/);
});

test('preflightCanonicalPptxExport accepts focal positioning for sized node backgrounds', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    assets: [{
      id: 'asset-1',
      src: 'data:image/png;base64,AAAA',
      meta: { width: 1600, height: 900 }
    }],
    slides: [{
      nodes: [{
        id: 'background-image-1',
        type: 'container',
        style: 'background-image: url("data:image/png;base64,AAAA"); background-size: cover; background-position: right bottom; background-repeat: no-repeat;',
        layout: { x: 0, y: 0, width: 400, height: 400 }
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, []);
});

test('createCanonicalPptxExport maps supported image focal positions to crop sizing', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 1000, unit: 'px' } },
    assets: [{
      id: 'asset-1',
      src: 'data:image/png;base64,AAAA',
      meta: { width: 1600, height: 900 }
    }],
    slides: [{
      nodes: [{
        id: 'image-1',
        type: 'image',
        attributes: { 'data-asset-id': 'asset-1' },
        style: 'object-fit: cover; object-position: right bottom;',
        layout: { x: 0, y: 0, width: 400, height: 400 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const imageOptions = result.pptx.slides[0].calls[0].options;
  assert.equal(imageOptions.sizing.type, 'crop');
  assert.ok(imageOptions.w > imageOptions.sizing.w);
  assert.ok(Math.abs(imageOptions.h - imageOptions.sizing.h) < 0.001);
  assert.ok(Math.abs(imageOptions.sizing.x - (imageOptions.w - imageOptions.sizing.w)) < 0.001);
  assert.equal(imageOptions.sizing.y, 0);
  assert.deepEqual(result.diagnostics.unsupportedStyles, []);
});

test('preflightCanonicalPptxExport warns for focal positions without intrinsic dimensions', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    assets: [{ id: 'asset-1', src: 'data:image/png;base64,AAAA' }],
    slides: [{
      nodes: [{
        id: 'image-1',
        type: 'image',
        attributes: { 'data-asset-id': 'asset-1' },
        style: 'object-fit: cover; object-position: right bottom;',
        layout: { x: 0, y: 0, width: 100, height: 100 }
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, [
    { id: 'image-1', properties: ['object-position'] }
  ]);
});

test('preflightCanonicalPptxExport keeps non-centered contain positioning as a warning', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    assets: [{
      id: 'asset-1',
      src: 'data:image/png;base64,AAAA'
    }],
    slides: [{
      nodes: [{
        id: 'image-1',
        type: 'image',
        attributes: { 'data-asset-id': 'asset-1' },
        style: 'object-fit: contain; object-position: right bottom;',
        layout: { x: 0, y: 0, width: 100, height: 100 }
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, [
    { id: 'image-1', properties: ['object-position'] }
  ]);
});

test('createCanonicalPptxExport preserves contain aspect ratio and focal position', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 1000, unit: 'px' } },
    assets: [{
      id: 'asset-1',
      src: 'data:image/png;base64,AAAA',
      meta: { width: 1600, height: 900 }
    }],
    slides: [{
      nodes: [{
        id: 'image-1',
        type: 'image',
        attributes: { 'data-asset-id': 'asset-1' },
        style: 'object-fit: contain; object-position: right bottom;',
        layout: { x: 0, y: 0, width: 400, height: 400 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const imageOptions = result.pptx.slides[0].calls[0].options;
  assert.equal('sizing' in imageOptions, false);
  assert.ok(Math.abs(imageOptions.w - 5.3332) < 0.001);
  assert.ok(imageOptions.h < 5.3332);
  assert.ok(Math.abs(imageOptions.x - 0) < 0.001);
  assert.ok(imageOptions.y > 0);
  assert.deepEqual(result.diagnostics.unsupportedStyles, []);
});

test('preflightCanonicalPptxExport reports non-uniform border radii', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'rounded-card',
        type: 'shape',
        style: 'border-radius: 8px 16px 8px 16px;',
        layout: { x: 0, y: 0, width: 200, height: 100 }
      }, {
        id: 'elliptical-card',
        type: 'container',
        style: 'border-radius: 12px / 20px;',
        layout: { x: 220, y: 0, width: 200, height: 100 }
      }, {
        id: 'uniform-card',
        type: 'shape',
        style: 'border-radius: 12px 12px 12px 12px;',
        layout: { x: 440, y: 0, width: 200, height: 100 }
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, [
    { id: 'rounded-card', properties: ['border-radius'] },
    { id: 'elliptical-card', properties: ['border-radius'] }
  ]);
  assert.equal(report.diagnostics.warnings.filter(warning => /non-uniform border-radius/.test(warning)).length, 2);
});

test('preflightCanonicalPptxExport reports unsupported non-solid slide backgrounds', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      id: 'slide-1',
      layout: { background: { style: 'background: linear-gradient(red, blue);' } },
      nodes: []
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, [{
    id: 'slide-1',
    properties: ['background']
  }]);
  assert.match(
    report.diagnostics.warnings.join('\n'),
    /Slide slide-1 uses unsupported CSS background gradients; no solid fallback is available/
  );
});

test('preflightCanonicalPptxExport ignores slide background sizing metadata without paint', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      id: 'slide-1',
      layout: {
        background: {
          style: 'background-size: cover; background-position: 50% 50%;'
        }
      },
      nodes: []
    }]
  });

  assert.deepEqual(report.diagnostics.warnings, []);
});

test('preflightCanonicalPptxExport accepts focal positioning for sized slide backgrounds', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    layout: { size: { width: 1000, height: 1000, unit: 'px' } },
    assets: [{
      id: 'asset-1',
      src: 'data:image/png;base64,AAAA',
      meta: { width: 1600, height: 900 }
    }],
    slides: [{
      id: 'slide-1',
      layout: {
        background: {
          image: 'url("data:image/png;base64,AAAA")',
          style: 'background-size: cover; background-position: right bottom; background-repeat: no-repeat;'
        }
      },
      nodes: []
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, []);
});

test('preflightCanonicalPptxExport reports gradients layered over slide background images', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      id: 'slide-1',
      layout: {
        background: {
          image: 'linear-gradient(red, blue), url("data:image/png;base64,AAAA")',
          style: 'background-size: cover; background-position: center;'
        }
      },
      nodes: []
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, [
    { id: 'slide-1', properties: ['background-image'] }
  ]);
  assert.match(report.diagnostics.warnings.join('\n'), /unsupported background gradients/);
});

test('preflightCanonicalPptxExport reports layered background images', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      id: 'slide-1',
      layout: {
        background: {
          image: 'url("data:image/png;base64,AAAA"), url("data:image/png;base64,BBBB")',
          style: 'background-size: cover; background-position: center;'
        }
      },
      nodes: [{
        id: 'panel-1',
        type: 'container',
        style: 'background-image: url("data:image/png;base64,AAAA"), url("data:image/png;base64,BBBB");',
        layout: { x: 0, y: 0, width: 200, height: 100 }
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, [
    { id: 'slide-1', properties: ['background-image'] },
    { id: 'panel-1', properties: ['background-image'] }
  ]);
  assert.match(report.diagnostics.warnings.join('\n'), /multiple background image layers are not supported/);
});

test('createPptxWarningDetailsHeader preserves a bounded diagnostic summary', () => {
  const encoded = pptxExport.createPptxWarningDetailsHeader([
    'first warning',
    'second warning',
    'third warning',
    'fourth warning'
  ]);

  assert.deepEqual(JSON.parse(decodeURIComponent(encoded)), {
    warnings: ['first warning', 'second warning', 'third warning'],
    truncated: true
  });
});

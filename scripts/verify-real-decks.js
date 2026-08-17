#!/usr/bin/env node

const fs = require('node:fs/promises');
const { spawn } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalPptxExport = require('../shared/canonical-pptx-export.js');
const legacyPptxExport = require('./export-legacy-html-pptx.js');
const pdfExport = require('./export-canonical-pdf.js');

const WORKSPACE_ROOT = path.resolve(__dirname, '..');

async function discoverPresentationDecks(workspaceRoot = WORKSPACE_ROOT) {
  const presentationsRoot = path.join(workspaceRoot, 'presentations');
  const entries = await fs.readdir(presentationsRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => ({
      id: entry.name,
      directory: path.join(presentationsRoot, entry.name),
      htmlPath: path.join(presentationsRoot, entry.name, 'index.html')
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

async function verifyLegacyDeck(descriptor, options = {}) {
  const pdfApi = options.pdfApi || pdfExport;
  const pptxApi = options.pptxApi || legacyPptxExport;
  const pptxArtifactApi = options.pptxArtifactApi || canonicalPptxExport;
  const html = await fs.readFile(descriptor.htmlPath, 'utf8');
  const assetBaseDir = descriptor.directory;
  const preflight = pdfApi.preflightLegacyPdfExport(html, {
    assetBaseDir,
    assetRootDir: options.workspaceRoot || WORKSPACE_ROOT
  });
  if (!preflight.canExport || !(preflight.slideCount > 0)) {
    throw new Error('legacy PDF preflight found no slides');
  }

  const pdfBuffer = await pdfApi.exportLegacyPdfBuffer(html, { assetBaseDir });
  const pdfArtifact = pdfApi.validatePdfArtifact(pdfBuffer, preflight.slideCount);
  const pptxResult = await pptxApi.exportLegacyHtmlToPptx(html, {
    assetBaseDir,
    assetRootDir: options.workspaceRoot || WORKSPACE_ROOT
  });
  const pptxArtifact = pptxArtifactApi.validatePptxArtifact(
    pptxResult.buffer,
    preflight.slideCount
  );

  return {
    ...descriptor,
    slideCount: preflight.slideCount,
    pdfPages: pdfArtifact.pageCount,
    pdfBytes: pdfArtifact.buffer.length,
    pptxSlides: pptxResult.slideCount,
    pptxBytes: Buffer.isBuffer(pptxResult.buffer) ? pptxResult.buffer.length : 0,
    pdfWarnings: Array.isArray(preflight.warnings) ? preflight.warnings : [],
    pptxWarnings: Array.isArray(pptxResult.warnings) ? pptxResult.warnings : [],
    pptxArtifactBytes: pptxArtifact.length
  };
}

function buildCanonicalImportHarnessHtml(deckPath) {
  const serializedDeckPath = JSON.stringify(deckPath);
  return `<!doctype html>
<html><body>
<pre id="canonical-deck-output"></pre>
<iframe id="canonical-deck-frame" src=${JSON.stringify(deckPath)}></iframe>
<script src="/shared/canonical-deck.js"></script>
<script src="/shared/image-position.js"></script>
<script src="/shared/deck-persistence.js"></script>
<script src="/shared/deck-import.js"></script>
<script>
  const frame = document.getElementById('canonical-deck-frame');
  frame.addEventListener('load', () => {
    try {
      const importedDeck = SlideNextDeckImport.importHtmlDeckToCanonicalDeck(
        frame.contentDocument,
        { sourcePath: ${serializedDeckPath} }
      );
      document.getElementById('canonical-deck-output').textContent = JSON.stringify(importedDeck);
      document.documentElement.dataset.canonicalImportReady = 'true';
    } catch (error) {
      document.getElementById('canonical-deck-output').textContent = JSON.stringify({
        error: error && error.message ? error.message : String(error)
      });
      document.documentElement.dataset.canonicalImportReady = 'error';
    }
  });
</script>
</body></html>`;
}

async function runChromeDumpDom(url, options = {}) {
  const chromePath = pdfExport.resolveChromeExecutable(options);
  if (!chromePath) {
    throw new Error('Google Chrome or Chromium is required for canonical deck import verification');
  }
  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), 'slidenext-import-'));
  const timeoutMs = Number.isFinite(options.timeoutMs)
    ? Math.max(1000, options.timeoutMs)
    : 60000;
  const virtualTimeBudgetMs = Number.isFinite(options.virtualTimeBudgetMs)
    ? Math.max(0, options.virtualTimeBudgetMs)
    : 2000;
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    `--user-data-dir=${profileDir}`,
    `--virtual-time-budget=${virtualTimeBudgetMs}`,
    '--dump-dom',
    url
  ];

  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(chromePath, args, {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      let stdout = '';
      let stderr = '';
      let timeout = null;
      let settled = false;
      const terminate = () => {
        if (!child.pid) return;
        try {
          process.kill(-child.pid, 'SIGTERM');
        } catch (error) {
          try {
            child.kill('SIGTERM');
          } catch (killError) {
            // Chrome may already be exiting.
          }
        }
      };
      const parseOutput = () => {
        const outputMatch = stdout.match(/<pre id="canonical-deck-output">([\s\S]*?)<\/pre>/i);
        if (!outputMatch) return null;
        const outputText = outputMatch[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        try {
          return JSON.parse(outputText);
        } catch (error) {
          return null;
        }
      };
      const finishIfReady = () => {
        if (settled || !/data-canonical-import-ready="(?:true|error)"/i.test(stdout)) return false;
        const importedDeck = parseOutput();
        if (!importedDeck) return false;
        settled = true;
        clearTimeout(timeout);
        terminate();
        if (importedDeck.error) {
          reject(new Error(`Canonical deck import failed: ${importedDeck.error}`));
        } else {
          resolve(importedDeck);
        }
        return true;
      };
      timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        terminate();
        reject(new Error('Chrome canonical deck import timed out'));
      }, timeoutMs);
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
        finishIfReady();
      });
      child.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-4000); });
      child.once('error', (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        terminate();
        reject(error);
      });
      child.once('exit', (code, signal) => {
        if (settled) return;
        clearTimeout(timeout);
        if (finishIfReady()) return;
        settled = true;
        if (code !== 0) {
          reject(new Error(`Chrome canonical deck import exited with ${code || signal}: ${stderr.trim()}`));
          return;
        }
        reject(new Error('Chrome canonical deck import produced no ready payload'));
      });
    });
    return result;
  } finally {
    await fs.rm(profileDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100
    });
  }
}

async function importRealDeckToCanonicalDeck(descriptor, options = {}) {
  const exportServer = await pdfExport.startExportServer(
    buildCanonicalImportHarnessHtml(`/presentations/${encodeURIComponent(descriptor.id)}/index.html`),
    options.workspaceRoot || WORKSPACE_ROOT
  );
  try {
    return await runChromeDumpDom(exportServer.url, options);
  } finally {
    await pdfExport.closeExportServer(exportServer.server, exportServer.temporaryDir);
  }
}

async function verifyCanonicalDeck(descriptor, options = {}) {
  const importedDeck = await importRealDeckToCanonicalDeck(descriptor, options);
  if (!canonicalDeck.isCanonicalDeck(importedDeck) || importedDeck.slides.length === 0) {
    throw new Error('canonical import did not produce a non-empty canonical deck');
  }
  const pdfApi = options.pdfApi || pdfExport;
  const pptxApi = options.pptxArtifactApi || canonicalPptxExport;
  const assetBaseDir = descriptor.directory;
  const pdfPreflight = pdfApi.preflightStudioPdfExport(importedDeck, {
    assetExists: pdfApi.createPdfAssetExists(assetBaseDir, options.workspaceRoot || WORKSPACE_ROOT)
  });
  const pdfBuffer = await pdfApi.exportCanonicalPdfBuffer(importedDeck, {
    assetBaseDir
  });
  const pdfArtifact = pdfApi.validatePdfArtifact(pdfBuffer, importedDeck.slides.length);
  const pptxResult = pptxApi.createCanonicalPptxExport(importedDeck, {
    assetBaseDir,
    assetRootDir: options.workspaceRoot || WORKSPACE_ROOT
  });
  if (!pptxResult.pptx) throw new Error('canonical PPTX exporter did not produce a presentation');
  const pptxBuffer = await pptxResult.pptx.write({ outputType: 'nodebuffer' });
  const pptxArtifact = pptxApi.validatePptxArtifact(pptxBuffer, importedDeck.slides.length);

  return {
    canonicalSlideCount: importedDeck.slides.length,
    canonicalPdfPages: pdfArtifact.pageCount,
    canonicalPdfBytes: pdfArtifact.buffer.length,
    canonicalPptxSlides: pptxResult.slideCount,
    canonicalPptxBytes: pptxArtifact.length,
    canonicalPdfWarnings: Array.isArray(pdfPreflight.warnings) ? pdfPreflight.warnings : [],
    canonicalPptxWarnings: Array.isArray(pptxResult.diagnostics.warnings)
      ? pptxResult.diagnostics.warnings
      : []
  };
}

async function verifyRealDecks(options = {}) {
  const workspaceRoot = options.workspaceRoot || WORKSPACE_ROOT;
  if (!pdfExport.resolveChromeExecutable(options)) {
    throw new Error('Google Chrome is required for real-deck PDF verification');
  }
  if (!legacyPptxExport.resolvePdftoppmExecutable(options)) {
    throw new Error('pdftoppm is required for real-deck PPTX verification');
  }

  const descriptors = await discoverPresentationDecks(workspaceRoot);
  if (descriptors.length === 0) {
    throw new Error('No presentation decks were found');
  }

  const reports = [];
  for (const descriptor of descriptors) {
    const legacyReport = await verifyLegacyDeck(descriptor, { ...options, workspaceRoot });
    const canonicalReport = await verifyCanonicalDeck(descriptor, { ...options, workspaceRoot });
    reports.push({ ...legacyReport, ...canonicalReport });
  }
  return reports;
}

function formatVerificationReport(reports = []) {
  const lines = [`Verified ${reports.length} real deck(s):`];
  reports.forEach((report) => {
    const warningCount = report.pdfWarnings.length + report.pptxWarnings.length;
    const canonicalPdfWarnings = Array.isArray(report.canonicalPdfWarnings)
      ? report.canonicalPdfWarnings
      : [];
    const canonicalPptxWarnings = Array.isArray(report.canonicalPptxWarnings)
      ? report.canonicalPptxWarnings
      : [];
    lines.push(
      `- ${report.id}: ${report.slideCount} slide(s), `
        + `${report.pdfPages} PDF page(s), ${report.pptxSlides} PPTX slide(s), `
        + `${warningCount} legacy warning(s); canonical: `
        + `${report.canonicalSlideCount} slide(s), ${report.canonicalPdfPages} PDF page(s), `
        + `${report.canonicalPptxSlides} PPTX slide(s), `
        + `${canonicalPdfWarnings.length + canonicalPptxWarnings.length} warning(s)`
    );
  });
  return lines.join('\n');
}

if (require.main === module) {
  verifyRealDecks()
    .then((reports) => {
      console.log(formatVerificationReport(reports));
    })
    .catch((error) => {
      console.error(`Real-deck verification failed: ${error.message}`);
      process.exitCode = 1;
    });
}

module.exports = {
  discoverPresentationDecks,
  buildCanonicalImportHarnessHtml,
  runChromeDumpDom,
  importRealDeckToCanonicalDeck,
  verifyLegacyDeck,
  verifyCanonicalDeck,
  verifyRealDecks,
  formatVerificationReport
};

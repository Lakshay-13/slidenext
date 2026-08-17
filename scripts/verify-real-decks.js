#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

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
    reports.push(await verifyLegacyDeck(descriptor, { ...options, workspaceRoot }));
  }
  return reports;
}

function formatVerificationReport(reports = []) {
  const lines = [`Verified ${reports.length} real deck(s):`];
  reports.forEach((report) => {
    const warningCount = report.pdfWarnings.length + report.pptxWarnings.length;
    lines.push(
      `- ${report.id}: ${report.slideCount} slide(s), `
        + `${report.pdfPages} PDF page(s), ${report.pptxSlides} PPTX slide(s), `
        + `${warningCount} warning(s)`
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
  verifyLegacyDeck,
  verifyRealDecks,
  formatVerificationReport
};

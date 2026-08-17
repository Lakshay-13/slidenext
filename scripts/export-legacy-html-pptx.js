#!/usr/bin/env node

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');

const pdfExport = require('./export-canonical-pdf.js');

const PPTX_WIDTH = 13.333;
const PPTX_HEIGHT = 7.5;
const LEGACY_PPTX_WARNING = 'Legacy HTML deck exported as flattened slide images; editable mapping is unavailable';

function resolvePdftoppmExecutable(options = {}) {
  const candidates = [
    options.pdftoppmPath,
    process.env.SLIDENEXT_PDFTOPPM_PATH,
    '/opt/homebrew/bin/pdftoppm',
    '/usr/local/bin/pdftoppm',
    '/usr/bin/pdftoppm'
  ].filter((candidate) => typeof candidate === 'string' && candidate.trim());

  return candidates.find((candidate) => {
    try {
      fsSync.accessSync(candidate, fsSync.constants.X_OK);
      return true;
    } catch (error) {
      return false;
    }
  }) || '';
}

function runPdftoppm(pdfPath, outputPrefix, options = {}) {
  const executable = resolvePdftoppmExecutable(options);
  if (!executable) {
    return Promise.reject(new Error('pdftoppm is required for flattened legacy PPTX export'));
  }
  const execFileImpl = typeof options.execFileImpl === 'function' ? options.execFileImpl : execFile;
  return new Promise((resolve, reject) => {
    execFileImpl(
      executable,
      ['-png', '-r', String(options.rasterDpi || 96), pdfPath, outputPrefix],
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          const detail = typeof stderr === 'string' && stderr.trim() ? `: ${stderr.trim()}` : '';
          reject(new Error(`Could not rasterize legacy PDF${detail}`));
          return;
        }
        resolve({ stdout, stderr });
      }
    );
  });
}

async function createFlattenedLegacyPptx(pagePaths, options = {}) {
  const PptxGenJS = options.PptxGenJS || require('pptxgenjs');
  const pptx = new PptxGenJS();
  if (typeof pptx.defineLayout === 'function') {
    pptx.defineLayout({ name: 'SLIDENEXT_LEGACY_CANVAS', width: PPTX_WIDTH, height: PPTX_HEIGHT });
    pptx.layout = 'SLIDENEXT_LEGACY_CANVAS';
  }
  pptx.author = 'SlideNext';
  pptx.subject = 'Flattened legacy HTML presentation';

  pagePaths.forEach((pagePath) => {
    const slide = pptx.addSlide();
    slide.addImage({ path: pagePath, x: 0, y: 0, w: PPTX_WIDTH, h: PPTX_HEIGHT });
  });

  return pptx;
}

async function exportLegacyHtmlToPptx(html, options = {}) {
  const pdfExportApi = options.pdfExportApi || pdfExport;
  const preflight = typeof pdfExportApi.preflightLegacyPdfExport === 'function'
    ? pdfExportApi.preflightLegacyPdfExport(html, {
        assetBaseDir: options.assetBaseDir,
        assetRootDir: options.assetRootDir
      })
    : { warnings: [] };
  const pdfBuffer = await pdfExportApi.exportLegacyPdfBuffer(html, options);
  const temporaryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'slidenext-legacy-pptx-'));
  const pdfPath = path.join(temporaryDir, 'deck.pdf');
  const outputPrefix = path.join(temporaryDir, 'slide');
  try {
    await fs.writeFile(pdfPath, pdfBuffer);
    await runPdftoppm(pdfPath, outputPrefix, options);
    const pagePaths = (await fs.readdir(temporaryDir))
      .filter((fileName) => /^slide-\d+\.png$/.test(fileName))
      .sort((left, right) => Number(left.match(/\d+/)[0]) - Number(right.match(/\d+/)[0]))
      .map((fileName) => path.join(temporaryDir, fileName));
    const expectedSlideCount = (options.pdfExportApi || pdfExport).countPdfPages(pdfBuffer);
    if (pagePaths.length !== expectedSlideCount) {
      throw new Error(`Legacy PPTX rasterization mismatch: expected ${expectedSlideCount}, found ${pagePaths.length}`);
    }
    const pptx = await createFlattenedLegacyPptx(pagePaths, options);
    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    return {
      buffer,
      slideCount: pagePaths.length,
      warnings: [
        LEGACY_PPTX_WARNING,
        ...(Array.isArray(preflight.warnings) ? preflight.warnings : []).map((warning) => (
          typeof warning === 'string' ? warning.replace(/^PDF /, 'PPTX ') : warning
        )).filter(Boolean)
      ]
    };
  } finally {
    await fs.rm(temporaryDir, { recursive: true, force: true });
  }
}

module.exports = {
  PPTX_WIDTH,
  PPTX_HEIGHT,
  LEGACY_PPTX_WARNING,
  resolvePdftoppmExecutable,
  runPdftoppm,
  createFlattenedLegacyPptx,
  exportLegacyHtmlToPptx
};

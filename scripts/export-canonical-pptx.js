#!/usr/bin/env node

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');

const {
  createCanonicalPptxExport,
  validatePptxArtifact
} = require('../shared/canonical-pptx-export.js');
const presentationMetadata = require('../shared/presentation-metadata.js');
const pdfScript = require('./export-canonical-pdf.js');
const legacyPptxExport = require('./export-legacy-html-pptx.js');

function printUsage() {
  console.error('Usage: node scripts/export-canonical-pptx.js <canonical-deck.json|deck.html> <output.pptx>');
}

function createPptxAssetExists(assetBaseDir, assetRootDir) {
  const containedAssetExists = pdfScript.createPdfAssetExists(assetBaseDir, assetRootDir);
  return (assetSource, ...args) => {
    if (typeof assetSource !== 'string' || !assetSource.trim()) return false;
    if (/^(?:data:|https?:\/\/)/i.test(assetSource)) return true;
    if (path.isAbsolute(assetSource)) {
      try {
        return fsSync.statSync(assetSource).isFile();
      } catch (error) {
        return false;
      }
    }
    return containedAssetExists(assetSource, ...args);
  };
}

async function main(argv = process.argv.slice(2)) {
  const [inputPath, outputPath] = argv;
  if (!inputPath || !outputPath) {
    printUsage();
    return 2;
  }

  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputPath = path.resolve(outputPath);
  const directLegacyHtmlPath = pdfScript.resolveLegacyHtmlInputPath(resolvedInputPath);
  if (directLegacyHtmlPath) {
    const legacyHtml = await fs.readFile(directLegacyHtmlPath, 'utf8');
    const result = await legacyPptxExport.exportLegacyHtmlToPptx(legacyHtml, {
      assetBaseDir: path.dirname(directLegacyHtmlPath),
      assetRootDir: process.cwd()
    });
    await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
    await fs.writeFile(resolvedOutputPath, result.buffer);
    validatePptxArtifact(await fs.readFile(resolvedOutputPath), result.slideCount);
    console.error(`PPTX export completed with ${result.warnings.length} warning(s):`);
    result.warnings.forEach(warning => console.error(`- ${warning}`));
    console.log(`Exported ${result.slideCount} legacy slide(s) to ${resolvedOutputPath}`);
    return 0;
  }
  const input = JSON.parse(await fs.readFile(resolvedInputPath, 'utf8'));
  const hasCanonicalDeckPayload = Boolean(
    presentationMetadata.resolvePresentationCanonicalDeck(input)
    || (input && typeof input === 'object' && (
      Array.isArray(input.slides)
      || (input.canonicalDeck && typeof input.canonicalDeck === 'object')
    ))
  );
  if (!hasCanonicalDeckPayload) {
    const legacySourcePath = pdfScript.resolveLegacyHtmlSiblingPath(resolvedInputPath);
    if (legacySourcePath) {
      const legacyHtml = await fs.readFile(legacySourcePath, 'utf8');
      const result = await legacyPptxExport.exportLegacyHtmlToPptx(legacyHtml, {
        assetBaseDir: path.dirname(legacySourcePath),
        assetRootDir: process.cwd()
      });
      await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
      await fs.writeFile(resolvedOutputPath, result.buffer);
      validatePptxArtifact(await fs.readFile(resolvedOutputPath), result.slideCount);
      console.error(`PPTX export completed with ${result.warnings.length} warning(s):`);
      result.warnings.forEach(warning => console.error(`- ${warning}`));
      console.log(`Exported ${result.slideCount} legacy slide(s) to ${resolvedOutputPath}`);
      return 0;
    }
  }

  const deck = presentationMetadata.resolvePresentationCanonicalDeck(input) || input;
  const assetExists = createPptxAssetExists(
    path.dirname(resolvedInputPath),
    process.cwd()
  );
  const result = createCanonicalPptxExport(deck, {
    assetBaseDir: path.dirname(resolvedInputPath),
    assetRootDir: process.cwd(),
    assetExists
  });

  if (!result.pptx) {
    throw new Error(result.diagnostics.warnings.join('; ') || 'PPTX exporter is unavailable');
  }

  await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await result.pptx.writeFile({ fileName: resolvedOutputPath });
  validatePptxArtifact(await fs.readFile(resolvedOutputPath), result.slideCount);

  if (result.diagnostics.warnings.length > 0) {
    console.error(`PPTX export completed with ${result.diagnostics.warnings.length} warning(s):`);
    result.diagnostics.warnings.forEach(warning => console.error(`- ${warning}`));
  }
  console.log(`Exported ${result.slideCount} slide(s) to ${resolvedOutputPath}`);
  return 0;
}

if (require.main === module) {
  main().then(code => {
    process.exitCode = code;
  }).catch(error => {
    console.error(`PPTX export failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { main };

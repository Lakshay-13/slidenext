#!/usr/bin/env node

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');

const {
  createCanonicalPptxExport,
  validatePptxArtifact
} = require('../shared/canonical-pptx-export.js');
const presentationMetadata = require('../shared/presentation-metadata.js');

function printUsage() {
  console.error('Usage: node scripts/export-canonical-pptx.js <canonical-deck.json> <output.pptx>');
}

async function main(argv = process.argv.slice(2)) {
  const [inputPath, outputPath] = argv;
  if (!inputPath || !outputPath) {
    printUsage();
    return 2;
  }

  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputPath = path.resolve(outputPath);
  const input = JSON.parse(await fs.readFile(resolvedInputPath, 'utf8'));
  const deck = presentationMetadata.resolvePresentationCanonicalDeck(input) || input;
  const result = createCanonicalPptxExport(deck, {
    assetBaseDir: path.dirname(resolvedInputPath),
    assetRootDir: process.cwd(),
    assetExists(assetSource) {
      if (typeof assetSource !== 'string' || !assetSource.trim()) return false;
      if (/^(?:data:|https?:\/\/)/i.test(assetSource)) return true;
      return fsSync.existsSync(assetSource);
    }
  });

  if (!result.pptx) {
    throw new Error(result.diagnostics.warnings.join('; ') || 'PPTX exporter is unavailable');
  }

  await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await result.pptx.writeFile({ fileName: resolvedOutputPath });
  validatePptxArtifact(await fs.readFile(resolvedOutputPath));

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

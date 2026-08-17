const fs = require('node:fs');
const path = require('node:path');

const COMPOSITION_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', '..', 'shared', 'studio-editor-canonical-reader-composition.js'),
  'utf8'
);

function withCanonicalReaderCompositionSource(source) {
  if (typeof source !== 'string'
    || (!source.includes('function getEditorCanonicalVisibilityReader(')
      && !source.includes('function getEditorCanonicalFreeformReader('))) {
    return source;
  }
  if (source.includes('const studioEditorCanonicalReaderComposition =')) {
    return `${COMPOSITION_SOURCE}
${source}`;
  }
  return `${COMPOSITION_SOURCE}
var studioEditorCanonicalReaderComposition = typeof SlideNextStudioEditorCanonicalReaderComposition !== 'undefined'
  && SlideNextStudioEditorCanonicalReaderComposition
  && typeof SlideNextStudioEditorCanonicalReaderComposition.createStudioEditorCanonicalReaderComposition === 'function'
  ? SlideNextStudioEditorCanonicalReaderComposition.createStudioEditorCanonicalReaderComposition({
      canonicalReaderAdapter: typeof SlideNextStudioEditorCanonicalReaderAdapter !== 'undefined'
        ? SlideNextStudioEditorCanonicalReaderAdapter
        : null,
      canonicalReaderResolvers: typeof studioEditorCanonicalReaderResolvers !== 'undefined'
        ? studioEditorCanonicalReaderResolvers
        : null,
      canonicalStateApi: typeof SlideNextStudioEditorCanonicalState !== 'undefined'
        ? SlideNextStudioEditorCanonicalState
        : null,
      canonicalDeckApi: typeof SlideNextCanonicalDeck !== 'undefined'
        ? SlideNextCanonicalDeck
        : null,
      getElementId: typeof assignEditorElementId === 'function'
        ? assignEditorElementId
        : null,
      resolveCanonicalNode: typeof resolveEditorCanonicalNodeForElement === 'function'
        ? resolveEditorCanonicalNodeForElement
        : null,
      resolveCanonicalDeck: typeof resolveEditorUiCanonicalDeck === 'function'
        ? resolveEditorUiCanonicalDeck
        : typeof buildEditorCanonicalDeck === 'function'
          ? buildEditorCanonicalDeck
          : null
    })
  : null;
${source}`;
}

module.exports = { withCanonicalReaderCompositionSource };

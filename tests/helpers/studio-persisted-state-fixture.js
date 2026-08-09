function normalizePersistedStateMarker(marker) {
  return marker
    .replace(
      /playbackState = persistedDeckPlaybackState/g,
      'playbackState = getStudioPersistedPlaybackState()'
    )
    .replace(/elements = selectedElements/g, 'elements = getStudioSelectedElements()')
    .replace(/targetElements = selectedElements/g, 'targetElements = getStudioSelectedElements()');
}

function getPersistedStateFixtureSource() {
  return `
function getStudioPersistedDeckHtml() {
  return typeof lastPersistedDeckHtml !== 'undefined' ? lastPersistedDeckHtml : '';
}
function getStudioPersistedCanonicalDeck() {
  return typeof lastPersistedCanonicalDeck !== 'undefined' ? lastPersistedCanonicalDeck : null;
}
function getStudioPersistedPlaybackState() {
  return typeof persistedDeckPlaybackState !== 'undefined' ? persistedDeckPlaybackState : null;
}
function getStudioSelectedElements() {
  return typeof selectedElements !== 'undefined' && Array.isArray(selectedElements)
    ? selectedElements
    : [];
}
function setStudioPersistedDeckHtml(nextDeckHtml) {
  lastPersistedDeckHtml = nextDeckHtml;
  return lastPersistedDeckHtml;
}
function setStudioPersistedCanonicalDeck(nextCanonicalDeck) {
  lastPersistedCanonicalDeck = nextCanonicalDeck;
  return lastPersistedCanonicalDeck;
}
function setStudioPersistedPlaybackState(nextPlaybackState) {
  persistedDeckPlaybackState = nextPlaybackState;
  return persistedDeckPlaybackState;
}
`;
}

function extractPersistedStateAwareFunctionSource(fileContent, startMarker, endMarker) {
  const normalizedStartMarker = normalizePersistedStateMarker(startMarker);
  const normalizedEndMarker = normalizePersistedStateMarker(endMarker);
  const start = fileContent.indexOf(normalizedStartMarker);
  if (start === -1) return null;
  const end = fileContent.indexOf(normalizedEndMarker, start);
  if (end === -1) return null;
  return `${getPersistedStateFixtureSource()}\n${fileContent.slice(start, end)}`;
}

module.exports = {
  extractPersistedStateAwareFunctionSource
};

function normalizeSelectionMarker(marker) {
  return marker
    .replace(/elements = selectedElements/g, 'elements = getStudioSelectedElements()')
    .replace(/targetElements = selectedElements/g, 'targetElements = getStudioSelectedElements()');
}

function getSelectionStateFixtureSource() {
  return `
function getStudioSelectedElements() {
  return typeof selectedElements !== 'undefined' && Array.isArray(selectedElements)
    ? selectedElements
    : [];
}
function setStudioSelectionState(nextState = {}) {
  selectedElements = Array.isArray(nextState.selectedElements)
    ? nextState.selectedElements
    : [];
  selectedElement = Object.prototype.hasOwnProperty.call(nextState, 'selectedElement')
    ? nextState.selectedElement
    : selectedElements[0] || null;
  return { selectedElements, selectedElement };
}
function clearStudioSelectionState() {
  selectedElements = [];
  selectedElement = null;
  return { selectedElements, selectedElement };
}
`;
}

function extractSelectionAwareFunctionSource(fileContent, startMarker, endMarker) {
  const normalizedStartMarker = normalizeSelectionMarker(startMarker);
  const normalizedEndMarker = normalizeSelectionMarker(endMarker);
  const start = fileContent.indexOf(normalizedStartMarker);
  if (start === -1) return null;
  const end = fileContent.indexOf(normalizedEndMarker, start);
  if (end === -1) return null;
  return `${getSelectionStateFixtureSource()}\n${fileContent.slice(start, end)}`;
}

module.exports = {
  normalizeSelectionMarker,
  getSelectionStateFixtureSource,
  extractSelectionAwareFunctionSource
};

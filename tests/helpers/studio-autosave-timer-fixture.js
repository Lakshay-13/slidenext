function getAutoSaveTimerFixtureSource() {
  return `
function getStudioAutoSaveDebounceTimer() {
  return typeof autoSaveDebounceTimer !== 'undefined' ? autoSaveDebounceTimer : null;
}
function setStudioAutoSaveDebounceTimer(nextTimer) {
  autoSaveDebounceTimer = nextTimer;
  return autoSaveDebounceTimer;
}
`;
}

function extractAutoSaveTimerAwareFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  if (start === -1) return null;
  const end = fileContent.indexOf(endMarker, start);
  if (end === -1) return null;
  return `${getAutoSaveTimerFixtureSource()}\n${fileContent.slice(start, end)}`;
}

module.exports = {
  getAutoSaveTimerFixtureSource,
  extractAutoSaveTimerAwareFunctionSource
};

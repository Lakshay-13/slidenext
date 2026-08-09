function getHistoryStackFixtureSource() {
  return `
function getStudioUndoStack() {
  return typeof undoStack !== 'undefined' && Array.isArray(undoStack) ? undoStack : [];
}
function getStudioRedoStack() {
  return typeof redoStack !== 'undefined' && Array.isArray(redoStack) ? redoStack : [];
}
function setStudioUndoStack(nextStack) {
  undoStack = Array.isArray(nextStack) ? nextStack : [];
  return undoStack;
}
function setStudioRedoStack(nextStack) {
  redoStack = Array.isArray(nextStack) ? nextStack : [];
  return redoStack;
}
function clearStudioHistoryStacks() {
  undoStack = [];
  redoStack = [];
  return { undoStack, redoStack };
}
`;
}

function extractHistoryStackAwareFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  if (start === -1) return null;
  const end = fileContent.indexOf(endMarker, start);
  if (end === -1) return null;
  return `${getHistoryStackFixtureSource()}\n${fileContent.slice(start, end)}`;
}

module.exports = {
  extractHistoryStackAwareFunctionSource
};

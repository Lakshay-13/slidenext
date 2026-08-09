const sessionTokenFixture = require('./studio-session-token-fixture.js');

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
function getStudioPendingEditorTransaction() {
  return typeof pendingEditorTransaction !== 'undefined' ? pendingEditorTransaction : null;
}
function setStudioPendingEditorTransaction(nextTransaction) {
  pendingEditorTransaction = nextTransaction;
  return pendingEditorTransaction;
}
function clearStudioPendingEditorTransaction() {
  pendingEditorTransaction = null;
  pendingEditorCanonicalDeck = null;
  return pendingEditorTransaction;
}
function getStudioPendingEditorCanonicalDeck() {
  return typeof pendingEditorCanonicalDeck !== 'undefined' ? pendingEditorCanonicalDeck : null;
}
function setStudioPendingEditorCanonicalDeck(nextCanonicalDeck) {
  pendingEditorCanonicalDeck = nextCanonicalDeck;
  return pendingEditorCanonicalDeck;
}
function clearStudioPendingEditorCanonicalDeck() {
  pendingEditorCanonicalDeck = null;
  return pendingEditorCanonicalDeck;
}
function getStudioUndoDebounceTimer() {
  return typeof undoDebounceTimer !== 'undefined' ? undoDebounceTimer : null;
}
function setStudioUndoDebounceTimer(nextTimer) {
  undoDebounceTimer = nextTimer;
  return undoDebounceTimer;
}
`;
}

function extractHistoryStackAwareFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  if (start === -1) return null;
  const end = fileContent.indexOf(endMarker, start);
  if (end === -1) return null;
  return `${sessionTokenFixture.getStudioSessionTokenFixtureSource()}\n${getHistoryStackFixtureSource()}\n${fileContent.slice(start, end)}`;
}

module.exports = {
  extractHistoryStackAwareFunctionSource
};

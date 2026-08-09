function getStudioSessionTokenFixtureSource() {
  return `
function getStudioEditorSessionToken() {
  return typeof studioEditorSessionToken !== 'undefined' ? studioEditorSessionToken : 0;
}
function advanceStudioEditorSessionToken() {
  if (typeof studioEditorSessionToken === 'undefined') {
    studioEditorSessionToken = 0;
  }
  studioEditorSessionToken += 1;
  return studioEditorSessionToken;
}
`;
}

module.exports = {
  getStudioSessionTokenFixtureSource
};

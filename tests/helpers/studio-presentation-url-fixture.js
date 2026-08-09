function getStudioPresentationUrlFixtureSource() {
  return `
function getStudioCurrentPresentationUrl() {
  return typeof currentPresentationUrl !== 'undefined' ? currentPresentationUrl : '';
}
function setStudioCurrentPresentationUrl(nextUrl) {
  currentPresentationUrl = typeof nextUrl === 'string' ? nextUrl : '';
  return currentPresentationUrl;
}
`;
}

module.exports = {
  getStudioPresentationUrlFixtureSource
};

function getStudioPresentationMetadataFixtureSource() {
  return `
function getStudioCurrentPresentationMetadata() {
  return typeof currentPresentationMetadata !== 'undefined' ? currentPresentationMetadata : null;
}
function setStudioCurrentPresentationMetadata(nextMetadata) {
  currentPresentationMetadata = nextMetadata || null;
  return currentPresentationMetadata;
}
`;
}

module.exports = {
  getStudioPresentationMetadataFixtureSource
};

const path = require('node:path');

function isPathWithin(parentPath, candidatePath) {
  const normalizedParentPath = path.resolve(parentPath);
  const normalizedCandidatePath = path.resolve(candidatePath);
  const parentPrefix = `${normalizedParentPath}${path.sep}`;

  return normalizedCandidatePath === normalizedParentPath
    || normalizedCandidatePath.startsWith(parentPrefix);
}

module.exports = {
  isPathWithin
};

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTableNavigation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function resolveStudioAdjacentTableCell(element, options = {}) {
    const tagName = element && typeof element.tagName === 'string'
      ? element.tagName.toLowerCase()
      : '';
    const slide = options.slide || null;
    if (!['td', 'th'].includes(tagName) || !slide
      || typeof element.closest !== 'function'
      || typeof slide.contains !== 'function') {
      return null;
    }

    const table = element.closest('table');
    if (!table || !slide.contains(table) || typeof table.querySelectorAll !== 'function') {
      return null;
    }

    const cells = Array.from(table.querySelectorAll('th, td'));
    const cellIndex = cells.indexOf(element);
    const direction = options.direction === -1 ? -1 : 1;
    const adjacentCell = cellIndex >= 0 ? cells[cellIndex + direction] : null;
    return adjacentCell && slide.contains(adjacentCell) ? adjacentCell : null;
  }

  return {
    resolveStudioAdjacentTableCell
  };
});

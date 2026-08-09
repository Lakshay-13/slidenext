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
    if (!slide || !element || typeof element.closest !== 'function'
      || typeof slide.contains !== 'function') {
      return null;
    }

    const cell = ['td', 'th'].includes(tagName)
      ? element
      : element.closest('td, th');
    if (!cell) return null;
    const table = cell.closest('table');
    if (!table || !slide.contains(table) || typeof table.querySelectorAll !== 'function') {
      return null;
    }

    const cells = Array.from(table.querySelectorAll('th, td'));
    const cellIndex = cells.indexOf(cell);
    const direction = options.direction === -1 ? -1 : 1;
    const adjacentCell = cellIndex >= 0 ? cells[cellIndex + direction] : null;
    return adjacentCell && slide.contains(adjacentCell) ? adjacentCell : null;
  }

  return {
    resolveStudioAdjacentTableCell
  };
});

const test = require('node:test');
const assert = require('node:assert/strict');

const tableNavigation = require('../shared/studio-editor-table-navigation.js');

function createCell(tagName) {
  return {
    tagName,
    closest(selector) {
      return selector === 'table' ? table : null;
    }
  };
}

const firstCell = createCell('TH');
const secondCell = createCell('TD');
const thirdCell = createCell('TD');
const cells = [firstCell, secondCell, thirdCell];
const table = {
  querySelectorAll(selector) {
    return selector === 'th, td' ? cells : [];
  }
};
const slide = {
  contains(element) {
    return element === table || cells.includes(element);
  }
};

test('resolveStudioAdjacentTableCell navigates forward and backward through table cells', () => {
  assert.equal(
    tableNavigation.resolveStudioAdjacentTableCell(firstCell, { slide, direction: 1 }),
    secondCell
  );
  assert.equal(
    tableNavigation.resolveStudioAdjacentTableCell(secondCell, { slide, direction: -1 }),
    firstCell
  );
});

test('resolveStudioAdjacentTableCell fails closed at table boundaries and for non-cells', () => {
  assert.equal(
    tableNavigation.resolveStudioAdjacentTableCell(thirdCell, { slide, direction: 1 }),
    null
  );
  assert.equal(
    tableNavigation.resolveStudioAdjacentTableCell({ tagName: 'P' }, { slide, direction: 1 }),
    null
  );
});

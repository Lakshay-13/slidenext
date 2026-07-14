const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('buildAlignmentActionState reuses valid nudge layout geometry for alignment readiness', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function buildAlignmentActionState(doc = null) {',
    '\n\n    function updateAlignmentActionState'
  );
  const layoutItems = [{ element: { id: 'first' } }, { element: { id: 'second' } }];
  const slide = { id: 'slide-1' };
  const context = {
    SlideNextStudioEditorAlignment: {
      buildStudioAlignmentActionState(items, options) {
        assert.equal(items, layoutItems);
        assert.equal(options.canMutateDeck(), true);
        return { selection: items, canAlign: true };
      }
    },
    buildMotionSelectionActionState(doc) {
      assert.equal(doc, context.doc);
      return {
        doc,
        slide,
        canNudge: true,
        nudgeLayoutItems: layoutItems
      };
    },
    isElementLocked() {}
  };
  context.doc = { id: 'doc' };
  vm.createContext(context);
  vm.runInContext(source, context);

  const result = context.buildAlignmentActionState(context.doc);
  assert.equal(result.alignmentActionState.canAlign, true);
  assert.equal(result.nudgeLayoutItems, layoutItems);
});

test('updateAlignmentActionState enables all positional controls only when alignment is available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateAlignmentActionState(doc = getIframeDoc()) {',
    '\n\n    function updateStyleActionState'
  );
  const ids = [
    'alignSelectionLeftBtn',
    'alignSelectionCenterBtn',
    'alignSelectionRightBtn',
    'alignSelectionTopBtn',
    'alignSelectionMiddleBtn',
    'alignSelectionBottomBtn'
  ];
  const controls = Object.fromEntries(ids.map((id) => [id, { disabled: true }]));
  const context = {
    buildAlignmentActionState() {
      return { alignmentActionState: { canAlign: true } };
    },
    document: {
      getElementById(id) {
        return controls[id] || null;
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  context.updateAlignmentActionState({ id: 'doc' });

  ids.forEach((id) => assert.equal(controls[id].disabled, false));
});

test('alignSelectedElements writes aligned parent-relative positions and records one mutation', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function alignSelectedElements(action = \'\') {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  const first = { style: {} };
  const second = { style: {} };
  const calls = [];
  const context = {
    SlideNextStudioEditorAlignment: {
      buildStudioAlignedLayout(selection, action) {
        calls.push(['buildStudioAlignedLayout', selection, action]);
        return {
          didChange: true,
          nextItems: [
            { element: first, nextLeft: 40, nextTop: 50 },
            { element: second, nextLeft: 70, nextTop: 80 }
          ]
        };
      }
    },
    buildAlignmentActionState() {
      return {
        alignmentActionState: {
          canAlign: true,
          selection: [{ element: first }, { element: second }]
        }
      };
    },
    updateAlignmentActionState() {
      calls.push(['updateAlignmentActionState']);
    },
    finalizeEditorDeckMutation(label, options) {
      calls.push(['finalizeEditorDeckMutation', label, options]);
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.alignSelectedElements('middle'), true);
  assert.deepEqual(JSON.parse(JSON.stringify({ first, second })), {
    first: { style: { left: '40px', top: '50px' } },
    second: { style: { left: '70px', top: '80px' } }
  });
  assert.equal(calls[0][0], 'buildStudioAlignedLayout');
  assert.equal(calls[0][2], 'middle');
  assert.equal(calls[1][0], 'finalizeEditorDeckMutation');
  assert.equal(calls[1][1], 'Auto: Aligned middle');
  assert.equal(calls[1][2].syncSelectionOverlay, true);
});

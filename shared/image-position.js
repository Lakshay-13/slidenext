(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextImagePosition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function parseImagePosition(value) {
    const normalized = typeof value === 'string'
      ? value.trim().toLowerCase().replace(/\s+/g, ' ')
      : '';
    const tokens = normalized ? normalized.split(' ') : ['center'];
    if (tokens.length > 2) return null;

    const parseAxis = (token, axis) => {
      if (token === 'center') return 0.5;
      if (axis === 'horizontal' && token === 'left') return 0;
      if (axis === 'horizontal' && token === 'right') return 1;
      if (axis === 'vertical' && token === 'top') return 0;
      if (axis === 'vertical' && token === 'bottom') return 1;
      const percent = token.match(/^(-?[\d.]+)%$/);
      if (!percent) return null;
      const parsed = Number(percent[1]) / 100;
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : null;
    };

    if (tokens.length === 1) {
      const horizontal = parseAxis(tokens[0], 'horizontal');
      if (horizontal !== null) return { x: horizontal, y: 0.5 };
      const vertical = parseAxis(tokens[0], 'vertical');
      return vertical === null ? null : { x: 0.5, y: vertical };
    }

    const firstHorizontal = parseAxis(tokens[0], 'horizontal');
    const secondVertical = parseAxis(tokens[1], 'vertical');
    if (firstHorizontal !== null && secondVertical !== null) {
      return { x: firstHorizontal, y: secondVertical };
    }
    const firstVertical = parseAxis(tokens[0], 'vertical');
    const secondHorizontal = parseAxis(tokens[1], 'horizontal');
    return firstVertical !== null && secondHorizontal !== null
      ? { x: secondHorizontal, y: firstVertical }
      : null;
  }

  function isCenteredImagePosition(value) {
    const position = parseImagePosition(value);
    return !!position && position.x === 0.5 && position.y === 0.5;
  }

  return {
    parseImagePosition,
    isCenteredImagePosition
  };
});

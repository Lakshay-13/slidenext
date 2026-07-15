(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioColorUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function rgbToHex(value) {
    if (!value) return '#ffffff';
    if (value.startsWith('#')) return value;
    const rgbValues = value.match(/\d+/g);
    if (!rgbValues) return '#ffffff';
    const red = parseInt(rgbValues[0], 10);
    const green = parseInt(rgbValues[1], 10);
    const blue = parseInt(rgbValues[2], 10);
    return `#${((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1)}`;
  }

  return {
    rgbToHex
  };
});

const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");

const rootDir = path.resolve(__dirname, "..");
const deckDir = path.join(rootDir, "presentations", "computer-vision-presentation");
const asset = (name) => path.join(deckDir, "assets", name);
const outputFile = path.join(deckDir, "computer-vision-presentation.pptx");

const pptx = new PptxGenJS();
const S = pptx.ShapeType || {};

const COLORS = {
  bg: "F7F8FB",
  card: "FFFFFF",
  text: "0F172A",
  muted: "475569",
  border: "D7DEE8",
  subtle: "EEF2F7",
  teal: "0F766E",
  violet: "5B3FD6",
  purple: "6D28D9",
  green: "059669",
  emerald: "10B981",
  amber: "D97706",
  rose: "E11D48",
  red: "DC2626",
  blue: "2563EB",
  dark: "111827",
  black: "000000",
  white: "FFFFFF",
};

const FONT = {
  head: "Aptos",
  body: "Aptos",
  mono: "Courier New",
};

const digit3 = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 255, 255, 255, 255, 255, 0, 0],
  [0, 0, 0, 0, 0, 255, 0, 0],
  [0, 0, 255, 255, 255, 255, 0, 0],
  [0, 0, 0, 0, 0, 255, 0, 0],
  [0, 255, 255, 255, 255, 255, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const sensorCards = [
  {
    title: "RGB Cameras",
    capture: "Red, green, and blue light channels.",
    strength: "Captures textures, colors, text, and fine detail.",
    model: "Sony IMX477 / IMX219",
    format: "Raw Bayer RGGB 12-bit / 8-bit YUV",
  },
  {
    title: "Depth Sensors",
    capture: "Per-pixel distance measurements.",
    strength: "Builds depth maps for proximity and ranging.",
    model: "Intel RealSense D435",
    format: "16-bit depth matrix (mm)",
  },
  {
    title: "Stereo Arrays",
    capture: "Two viewpoints for disparity.",
    strength: "Triangulates distance from binocular offset.",
    model: "Stereolabs ZED 2i",
    format: "32-bit disparity map",
  },
  {
    title: "Infrared Cameras",
    capture: "Thermal and low-light wavelengths.",
    strength: "Works in low light, fog, and thermal inspection.",
    model: "FLIR Boson",
    format: "14-bit thermal intensity values",
  },
  {
    title: "Event Cameras",
    capture: "Brightness changes only.",
    strength: "Microsecond latency and no motion blur.",
    model: "Prophesee Metavision",
    format: "Async events (x, y, t, polarity)",
  },
  {
    title: "LiDAR",
    capture: "Laser time-of-flight point clouds.",
    strength: "Accurate 3D geometry independent of ambient light.",
    model: "Ouster OS1",
    format: "(x, y, z, intensity)",
  },
];

const stageCards = [
  {
    title: "1. Sensor Capture",
    body: "RGB cameras, LiDAR, or depth lenses convert physical light and distance signals into raw measurements.",
  },
  {
    title: "2. Pixel Representation",
    body: "Analog measurements are quantized into numerical grids such as RGB integers from 0 to 255.",
  },
  {
    title: "3. Feature Extraction",
    body: "Models identify edges, gradients, corners, textures, and other low-level primitives.",
  },
  {
    title: "4. Semantic Understanding",
    body: "Features are mapped to object classes, segments, and higher-level meaning.",
  },
  {
    title: "5. Operational Decision",
    body: "Planning logic converts perception into actions such as braking, alerting, or classification.",
  },
];

const failureCards = [
  {
    title: "Lighting Changes",
    body: "Sudden glare, deep shadows, or night-time feeds can change pixel values enough to break models trained on clean daylight scenes.",
  },
  {
    title: "Extreme Weather",
    body: "Rain, snow, and fog reduce texture visibility and scatter active sensors such as LiDAR.",
  },
  {
    title: "Object Occlusion",
    body: "When a target is partially hidden, the model loses critical features and can drop or misclassify the track.",
  },
  {
    title: "Adversarial Noise",
    body: "Deliberate patterns can push neural networks toward confident but incorrect predictions.",
  },
];

const challengeCards = [
  {
    title: "Viewpoint Variance",
    body: "The same object can produce very different pixel patterns when viewed from a new angle.",
  },
  {
    title: "Background Clutter",
    body: "Targets blend into complex scenes when colors and textures match the environment.",
  },
  {
    title: "Deformation",
    body: "Non-rigid objects bend, stretch, and change pose, breaking rigid templates.",
  },
  {
    title: "Scale Changes",
    body: "Objects near the camera occupy far more pixels than the same objects at long range.",
  },
];

const futureCards = [
  {
    title: "World Models",
    body: "Predict future frames so the system learns physics and scene dynamics implicitly.",
  },
  {
    title: "Embodied AI",
    body: "Connect perception directly to real robotic actuators and closed-loop control.",
  },
  {
    title: "Unified 3D Models",
    body: "Reconstruct full spatial environments in real time from fewer cameras and less sensor payload.",
  },
];

const takeaways = [
  "Machines perceive light through pixel matrices and sensor arrays, converting raw values into math.",
  "Perception progresses from classification to boxes to dense pixel-level segmentation.",
  "3D perception reconstructs depth, geometry, and spatial structure from visual data.",
  "Modern models are powerful, but noise, weather, and occlusion still create failure modes.",
];

const edgeModes = [
  {
    name: "FP32 RAW",
    badge: "High SWaP Draw",
    color: COLORS.rose,
    size: "250.0 MB",
    latency: "45.0 ms",
    power: "15.0 Watts",
    accuracy: "98.2%",
  },
  {
    name: "INT8 QUANT",
    badge: "Efficient Edge",
    color: COLORS.green,
    size: "62.5 MB",
    latency: "6.2 ms",
    power: "2.1 Watts",
    accuracy: "97.4%",
  },
  {
    name: "PRUNED INT8",
    badge: "Ultra-Low Latency",
    color: COLORS.teal,
    size: "15.6 MB",
    latency: "2.8 ms",
    power: "1.2 Watts",
    accuracy: "95.8%",
  },
];

function shapeType(name) {
  return S[name] || name;
}

function cardShape(slide, x, y, w, h, fill = COLORS.card, border = COLORS.border) {
  slide.addShape(shapeType("roundRect"), {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: fill },
    line: { color: border, width: 1 },
  });
}

function addSlideNumber(slide, n) {
  slide.addText(String(n).padStart(2, "0"), {
    x: 12.45,
    y: 0.18,
    w: 0.45,
    h: 0.2,
    align: "right",
    fontFace: FONT.mono,
    fontSize: 8.5,
    color: "7C8AA0",
    margin: 0,
  });
}

function addBackground(slide, n) {
  slide.background = { color: COLORS.bg };
  slide.addShape(shapeType("ellipse"), {
    x: 9.35,
    y: 1.25,
    w: 2.0,
    h: 2.0,
    fill: { color: COLORS.bg, transparency: 100 },
    line: { color: "CFE7E3", width: 1.1 },
  });
  slide.addShape(shapeType("ellipse"), {
    x: 9.6,
    y: 1.5,
    w: 1.5,
    h: 1.5,
    fill: { color: COLORS.bg, transparency: 100 },
    line: { color: "DDD6FE", width: 1.0 },
  });
  slide.addShape(shapeType("ellipse"), {
    x: 9.1,
    y: 1.0,
    w: 2.5,
    h: 2.5,
    fill: { color: COLORS.bg, transparency: 100 },
    line: { color: "BFE7E4", width: 0.8, dash: "dash" },
  });
  addSlideNumber(slide, n);
}

function addEyebrow(slide, text, x, y, w = 2.7) {
  slide.addShape(shapeType("roundRect"), {
    x,
    y,
    w,
    h: 0.23,
    rectRadius: 0.07,
    fill: { color: COLORS.bg, transparency: 100 },
    line: { color: COLORS.border, width: 0.8 },
  });
  slide.addShape(shapeType("ellipse"), {
    x: x + 0.09,
    y: y + 0.07,
    w: 0.08,
    h: 0.08,
    fill: { color: COLORS.teal },
    line: { color: COLORS.teal, transparency: 100 },
  });
  slide.addText(text, {
    x: x + 0.22,
    y: y + 0.03,
    w: w - 0.28,
    h: 0.16,
    fontFace: FONT.mono,
    fontSize: 8.5,
    color: COLORS.teal,
    charSpace: 1.6,
    bold: false,
    margin: 0,
  });
}

function addTitle(slide, eyebrow, title, body, opts = {}) {
  const x = opts.x || 0.78;
  const y = opts.y || 0.45;
  const w = opts.w || 7.9;
  addEyebrow(slide, eyebrow, x, y, opts.eyebrowW || 2.9);
  slide.addText(title, {
    x,
    y: y + 0.48,
    w,
    h: 0.85,
    fontFace: FONT.head,
    fontSize: opts.titleSize || 26,
    bold: true,
    color: COLORS.text,
    margin: 0,
    breakLine: false,
  });
  if (body) {
    slide.addText(body, {
      x,
      y: y + 1.22,
      w: opts.bodyW || 6.9,
      h: opts.bodyH || 0.56,
      fontFace: FONT.body,
      fontSize: opts.bodySize || 11,
      color: COLORS.muted,
      margin: 0,
      valign: "mid",
    });
  }
}

function addCard(slide, config) {
  const {
    x,
    y,
    w,
    h,
    title,
    body,
    accent = COLORS.teal,
    footer,
    fill = COLORS.card,
    border = COLORS.border,
    titleSize = 15,
    bodySize = 10.25,
  } = config;

  cardShape(slide, x, y, w, h, fill, border);
  slide.addShape(shapeType("rect"), {
    x: x + 0.16,
    y: y + 0.14,
    w: 0.55,
    h: 0.06,
    fill: { color: accent },
    line: { color: accent, transparency: 100 },
  });
  slide.addText(title, {
    x: x + 0.16,
    y: y + 0.25,
    w: w - 0.32,
    h: 0.32,
    fontFace: FONT.head,
    fontSize: titleSize,
    bold: true,
    color: COLORS.text,
    margin: 0,
  });
  slide.addText(body, {
    x: x + 0.16,
    y: y + 0.62,
    w: w - 0.32,
    h: footer ? h - 1.0 : h - 0.78,
    fontFace: FONT.body,
    fontSize: bodySize,
    color: COLORS.muted,
    margin: 0,
    valign: "top",
  });
  if (footer) {
    slide.addText(footer, {
      x: x + 0.16,
      y: y + h - 0.34,
      w: w - 0.32,
      h: 0.18,
      fontFace: FONT.mono,
      fontSize: 8.5,
      color: accent,
      margin: 0,
      bold: true,
    });
  }
}

function addImageFrame(slide, imagePath, x, y, w, h, caption) {
  cardShape(slide, x, y, w, h, COLORS.card, COLORS.border);
  slide.addImage({
    path: imagePath,
    x: x + 0.08,
    y: y + 0.08,
    w: w - 0.16,
    h: h - 0.3,
  });
  if (caption) {
    slide.addText(caption, {
      x: x + 0.12,
      y: y + h - 0.18,
      w: w - 0.24,
      h: 0.1,
      fontFace: FONT.mono,
      fontSize: 7.5,
      color: "718096",
      margin: 0,
      align: "center",
    });
  }
}

function addChip(slide, text, x, y, w, active = false) {
  const fill = active ? "E6F5F2" : COLORS.subtle;
  const border = active ? COLORS.teal : COLORS.border;
  const color = active ? COLORS.teal : "334155";
  slide.addShape(shapeType("roundRect"), {
    x,
    y,
    w,
    h: 0.28,
    rectRadius: 0.07,
    fill: { color: fill },
    line: { color: border, width: 0.8 },
  });
  slide.addText(text, {
    x,
    y: y + 0.055,
    w,
    h: 0.14,
    fontFace: FONT.body,
    fontSize: 8.8,
    color,
    margin: 0,
    align: "center",
    bold: active,
  });
}

function addProgressBar(slide, x, y, w, pct, color, labelLeft, labelRight) {
  slide.addText(labelLeft, {
    x,
    y,
    w: w - 0.8,
    h: 0.15,
    fontFace: FONT.body,
    fontSize: 9.5,
    color: COLORS.text,
    margin: 0,
    bold: true,
  });
  slide.addText(labelRight, {
    x: x + w - 0.75,
    y,
    w: 0.75,
    h: 0.15,
    fontFace: FONT.mono,
    fontSize: 9.5,
    color,
    margin: 0,
    align: "right",
    bold: true,
  });
  slide.addShape(shapeType("roundRect"), {
    x,
    y: y + 0.2,
    w,
    h: 0.12,
    rectRadius: 0.04,
    fill: { color: COLORS.subtle },
    line: { color: COLORS.subtle, transparency: 100 },
  });
  slide.addShape(shapeType("roundRect"), {
    x,
    y: y + 0.2,
    w: Math.max(0.2, w * pct),
    h: 0.12,
    rectRadius: 0.04,
    fill: { color },
    line: { color, transparency: 100 },
  });
}

function addMatrix(slide, x, y, cell) {
  for (let r = 0; r < digit3.length; r += 1) {
    for (let c = 0; c < digit3[r].length; c += 1) {
      const v = digit3[r][c];
      const hex = v.toString(16).padStart(2, "0").toUpperCase();
      const color = `${hex}${hex}${hex}`;
      slide.addShape(shapeType("rect"), {
        x: x + c * cell,
        y: y + r * cell,
        w: cell - 0.01,
        h: cell - 0.01,
        fill: { color },
        line: { color: "CBD5E1", width: 0.4 },
      });
    }
  }
}

function addMetricCard(slide, mode, x, y, w, h) {
  addCard(slide, {
    x,
    y,
    w,
    h,
    accent: mode.color,
    title: mode.name,
    body:
      `${mode.badge}\n\nModel Size: ${mode.size}\nLatency: ${mode.latency}\nPower Draw: ${mode.power}\nAccuracy: ${mode.accuracy}`,
    titleSize: 13,
    bodySize: 9.4,
  });
}

function slide1() {
  const slide = pptx.addSlide();
  addBackground(slide, 1);
  addEyebrow(slide, "INTRODUCTION TO KEYNOTES", 0.85, 2.2, 2.45);
  slide.addText("Computer Vision", {
    x: 0.85,
    y: 2.72,
    w: 5.1,
    h: 0.52,
    fontFace: FONT.head,
    fontSize: 39,
    bold: true,
    color: COLORS.text,
    margin: 0,
  });
  slide.addText("Image, Video & 3D Analysis", {
    x: 0.85,
    y: 3.35,
    w: 6.7,
    h: 0.55,
    fontFace: FONT.head,
    fontSize: 28,
    bold: true,
    color: COLORS.violet,
    margin: 0,
  });
  slide.addText(
    "How machines learn to perceive, interpret, and act upon the rich visual data structure of our physical world.",
    {
      x: 0.85,
      y: 4.1,
      w: 4.9,
      h: 0.55,
      fontFace: FONT.body,
      fontSize: 12.5,
      color: COLORS.muted,
      margin: 0,
    }
  );
  slide.addShape(shapeType("roundRect"), {
    x: 0.85,
    y: 5.12,
    w: 2.1,
    h: 0.45,
    rectRadius: 0.08,
    fill: { color: COLORS.teal },
    line: { color: COLORS.teal, transparency: 100 },
  });
  slide.addText("Launch Presentation", {
    x: 1.08,
    y: 5.23,
    w: 1.55,
    h: 0.15,
    fontFace: FONT.body,
    fontSize: 10.5,
    bold: true,
    color: COLORS.white,
    margin: 0,
  });
}

function slide2() {
  const slide = pptx.addSlide();
  addBackground(slide, 2);
  addTitle(
    slide,
    "THE POWER OF PERCEPTION",
    "Why Vision Matters",
    "Humans receive over 80% of all sensory information through their eyes. Vision drives our actions in real time."
  );
  const cards = [
    ["Navigation", "Avoiding obstacles and walking through complex pathways."],
    ["Recognition", "Identifying faces, symbols, read texts, and tools."],
    ["Interaction", "Manipulating objects with hand-eye coordination."],
    ["Decision", "Evaluating speeds, dangers, and environmental states."],
  ];
  cards.forEach((item, idx) => {
    addCard(slide, {
      x: 0.82 + idx * 3.05,
      y: 2.42,
      w: 2.78,
      h: 2.05,
      title: item[0],
      body: item[1],
      accent: idx % 2 === 0 ? COLORS.teal : COLORS.violet,
      titleSize: 15,
      bodySize: 10.2,
    });
  });
  slide.addText('"What if machines could do the same?"', {
    x: 3.35,
    y: 6.25,
    w: 6.7,
    h: 0.22,
    fontFace: FONT.mono,
    fontSize: 11.5,
    color: COLORS.violet,
    align: "center",
    margin: 0,
  });
}

function slide3() {
  const slide = pptx.addSlide();
  addBackground(slide, 3);
  addTitle(
    slide,
    "SYSTEM DEFINITION",
    "What is Computer Vision?",
    "Computer vision enables computers to extract meaningful details from digital images, videos, and 3D sensory inputs.",
    { bodyW: 7.4 }
  );
  stageCards.forEach((item, idx) => {
    addCard(slide, {
      x: 0.72 + idx * 2.38,
      y: 2.35,
      w: 2.22,
      h: 2.5,
      title: item.title,
      body: item.body,
      accent: idx % 2 === 0 ? COLORS.teal : COLORS.violet,
      titleSize: 12.6,
      bodySize: 9.2,
    });
  });
}

function slide4() {
  const slide = pptx.addSlide();
  addBackground(slide, 4);
  addTitle(
    slide,
    "DATA ACQUISITION",
    "Imaging Sensors",
    "Different sensing modalities trade off color fidelity, depth, geometry, latency, and robustness."
  );
  sensorCards.forEach((item, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    addCard(slide, {
      x: 0.68 + col * 4.08,
      y: 2.08 + row * 2.25,
      w: 3.82,
      h: 2.02,
      title: item.title,
      body:
        `${item.capture}\n\nBest at: ${item.strength}\n\nExample: ${item.model}\nFormat: ${item.format}`,
      accent: row === 0 ? COLORS.teal : COLORS.violet,
      titleSize: 13.5,
      bodySize: 8.7,
    });
  });
}

function slide5() {
  const slide = pptx.addSlide();
  addBackground(slide, 5);
  addTitle(
    slide,
    "DIGITAL REPRESENTATION",
    "Images as Data",
    "To a computer, an image is a numerical grid. An RGB image stores three aligned channels for every pixel."
  );
  addImageFrame(slide, asset("street.png"), 0.82, 2.0, 4.5, 2.7, "RGB image sample");
  addCard(slide, {
    x: 5.65,
    y: 2.0,
    w: 6.15,
    h: 4.65,
    title: "Pixel Interpretation",
    body:
      "Grayscale mode uses one intensity value per pixel.\n\nRGB mode stores three values per pixel: red, green, and blue.\n\nExample pixel:\nR = 15\nG = 118\nB = 110\n\nA value of 0 means no light in that channel. A value of 255 means saturation.",
    accent: COLORS.teal,
    titleSize: 16,
    bodySize: 10.4,
  });
  addMatrix(slide, 1.2, 5.05, 0.22);
  slide.addText("8x8 grayscale digit sample", {
    x: 0.96,
    y: 4.78,
    w: 2.2,
    h: 0.15,
    fontFace: FONT.mono,
    fontSize: 8.5,
    color: COLORS.muted,
    margin: 0,
  });
  slide.addText("0 = black, 255 = white", {
    x: 0.96,
    y: 6.93,
    w: 2.3,
    h: 0.15,
    fontFace: FONT.body,
    fontSize: 8.5,
    color: COLORS.muted,
    margin: 0,
  });
}

function addClassificationPanel(slide, x, y, w, h, imagePath, labelA, valueA, labelB, valueB, caption, accent) {
  cardShape(slide, x, y, w, h);
  slide.addImage({ path: imagePath, x: x + 0.08, y: y + 0.08, w: w - 0.16, h: 2.05 });
  slide.addText(caption, {
    x: x + 0.12,
    y: y + 2.18,
    w: w - 0.24,
    h: 0.2,
    fontFace: FONT.mono,
    fontSize: 7.8,
    color: COLORS.muted,
    margin: 0,
    align: "center",
  });
  slide.addText("Neural Network Predictions", {
    x: x + 0.16,
    y: y + 2.44,
    w: w - 0.32,
    h: 0.18,
    fontFace: FONT.head,
    fontSize: 12.5,
    bold: true,
    color: COLORS.text,
    margin: 0,
  });
  addProgressBar(slide, x + 0.16, y + 2.78, w - 0.32, valueA / 100, accent, labelA, `${valueA}%`);
  addProgressBar(slide, x + 0.16, y + 3.34, w - 0.32, valueB / 100, COLORS.border, labelB, `${valueB}%`);
}

function slide6() {
  const slide = pptx.addSlide();
  addBackground(slide, 6);
  addTitle(
    slide,
    "TASK 1: CLASSIFICATION",
    "Image Classification",
    "Predict a single category for the primary subject in an input image. Input: pixels. Output: one class label."
  );
  addClassificationPanel(
    slide,
    0.8,
    2.05,
    5.75,
    4.4,
    asset("drone.png"),
    "Class: UAV (Drone)",
    92,
    "Class: Ground Vehicle",
    8,
    "Example 1 - Raw RGB feed (UAV / surveillance drone)",
    COLORS.teal
  );
  addClassificationPanel(
    slide,
    6.8,
    2.05,
    5.75,
    4.4,
    asset("tank.png"),
    "Class: UAV (Drone)",
    4,
    "Class: Ground Vehicle",
    96,
    "Example 2 - Raw RGB feed (ground vehicle / tank)",
    COLORS.violet
  );
  slide.addText(
    "Applications: automated surveillance monitoring, sorting sensory streams, and fast reconnaissance triage.",
    {
      x: 0.9,
      y: 6.78,
      w: 10.4,
      h: 0.18,
      fontFace: FONT.body,
      fontSize: 9.6,
      color: COLORS.muted,
      margin: 0,
    }
  );
}

function slide7() {
  const slide = pptx.addSlide();
  addBackground(slide, 7);
  addTitle(
    slide,
    "TASK 2: DETECTION",
    "Object Detection",
    "Locate multiple distinct items in a scene with class labels, confidence scores, and bounding boxes."
  );
  addImageFrame(slide, asset("street.png"), 0.72, 1.95, 7.4, 4.95, "street_view_active");
  const imgX = 0.8;
  const imgY = 2.03;
  const imgW = 7.24;
  const imgH = 4.7;
  const boxes = [
    { x: 0.39, y: 0.67, w: 0.16, h: 0.21, label: "Car (Taxi) [98%]", color: COLORS.teal },
    { x: 0.58, y: 0.64, w: 0.2, h: 0.21, label: "Car (SUV) [91%]", color: COLORS.teal },
    { x: 0.34, y: 0.57, w: 0.05, h: 0.13, label: "Pedestrian [89%]", color: COLORS.violet },
    { x: 0.43, y: 0.58, w: 0.05, h: 0.13, label: "Pedestrian [81%]", color: COLORS.violet },
  ];
  boxes.forEach((b) => {
    slide.addShape(shapeType("rect"), {
      x: imgX + imgW * b.x,
      y: imgY + imgH * b.y,
      w: imgW * b.w,
      h: imgH * b.h,
      fill: { color: COLORS.bg, transparency: 100 },
      line: { color: b.color, width: 2 },
    });
    slide.addShape(shapeType("rect"), {
      x: imgX + imgW * b.x,
      y: imgY + imgH * b.y - 0.2,
      w: Math.max(1.1, imgW * b.w),
      h: 0.18,
      fill: { color: b.color },
      line: { color: b.color, transparency: 100 },
    });
    slide.addText(b.label, {
      x: imgX + imgW * b.x + 0.03,
      y: imgY + imgH * b.y - 0.165,
      w: Math.max(1.05, imgW * b.w - 0.06),
      h: 0.1,
      fontFace: FONT.mono,
      fontSize: 7.2,
      color: COLORS.white,
      bold: true,
      margin: 0,
    });
  });
  addCard(slide, {
    x: 8.45,
    y: 2.12,
    w: 4.0,
    h: 3.9,
    title: "Detection Filter",
    body:
      "View all detections\nCars only\nPedestrians only\n\nObject detection is critical for autonomous navigation, surveillance, and tactical mapping because it answers what is present and where it is.",
    accent: COLORS.teal,
    titleSize: 15,
    bodySize: 10.1,
  });
}

function slide8() {
  const slide = pptx.addSlide();
  addBackground(slide, 8);
  addTitle(
    slide,
    "TASK 3: SEGMENTATION",
    "Image Segmentation",
    "Segmentation classifies every pixel so the system can recover precise contours instead of coarse boxes."
  );
  addImageFrame(slide, asset("segmentation.png"), 0.74, 2.02, 4.9, 4.7, "Pixel-level class mask");
  const items = [
    ["Image Classification", "Returns one global label for the whole image. Useful, but no location detail."],
    ["Object Detection", "Adds boxes and coordinates around target objects, but not exact shape boundaries."],
    ["Semantic Segmentation", "Assigns every pixel to a class such as road, car, or pedestrian."],
    ["Instance Segmentation", "Separates individual objects at the pixel level so each object gets its own contour."],
  ];
  items.forEach((item, idx) => {
    addCard(slide, {
      x: 5.95,
      y: 2.0 + idx * 1.14,
      w: 6.0,
      h: 0.98,
      title: item[0],
      body: item[1],
      accent: idx % 2 === 0 ? COLORS.teal : COLORS.violet,
      titleSize: 12.4,
      bodySize: 8.8,
    });
  });
}

function slide9() {
  const slide = pptx.addSlide();
  addBackground(slide, 9);
  addTitle(
    slide,
    "TEMPORAL LOGIC",
    "Video Understanding",
    "Video models add time so they can infer motion, activity, and change across frames."
  );
  addCard(slide, {
    x: 0.82,
    y: 2.0,
    w: 5.1,
    h: 4.75,
    title: "Motion & Temporal Clues",
    body:
      "A single frame can show pose. A sequence of frames reveals action velocity, acceleration, and intent.\n\nSparse Motion Vectors\nTrack key corners or features. Fast and low latency, but leave empty gaps.\n\nDense Optical Flow\nEstimates motion for every pixel. More informative, but more computationally expensive.",
    accent: COLORS.teal,
    titleSize: 15,
    bodySize: 10.2,
  });
  cardShape(slide, 6.25, 2.02, 6.0, 4.7);
  slide.addText("Temporal Sequence Diagram", {
    x: 6.45,
    y: 2.18,
    w: 2.4,
    h: 0.2,
    fontFace: FONT.head,
    fontSize: 14.5,
    bold: true,
    color: COLORS.text,
    margin: 0,
  });
  [0, 1, 2].forEach((idx) => {
    const fx = 6.62 + idx * 1.8;
    cardShape(slide, fx, 3.0, 1.45, 1.45, "FDFEFF", COLORS.border);
    slide.addShape(shapeType("ellipse"), {
      x: fx + 0.44 + idx * 0.1,
      y: 3.56,
      w: 0.26,
      h: 0.26,
      fill: { color: COLORS.teal },
      line: { color: COLORS.teal, transparency: 100 },
    });
    slide.addText(`Frame ${idx + 1}`, {
      x: fx + 0.36,
      y: 4.18,
      w: 0.75,
      h: 0.12,
      fontFace: FONT.mono,
      fontSize: 8.2,
      color: COLORS.muted,
      margin: 0,
    });
    if (idx < 2) {
      slide.addShape(shapeType("line"), {
        x: fx + 1.45,
        y: 3.72,
        w: 0.38,
        h: 0,
        line: { color: COLORS.violet, width: 1.5, beginArrowType: "none", endArrowType: "triangle" },
      });
    }
  });
  slide.addText(
    "Sparse vectors follow a few tracked features. Dense optical flow estimates movement everywhere, giving a richer motion field.",
    {
      x: 6.45,
      y: 5.05,
      w: 5.5,
      h: 0.7,
      fontFace: FONT.body,
      fontSize: 10.2,
      color: COLORS.muted,
      margin: 0,
    }
  );
}

function slide10() {
  const slide = pptx.addSlide();
  addBackground(slide, 10);
  addTitle(
    slide,
    "TEMPORAL LOGIC: ASSOCIATION",
    "Tracking Objects Over Time",
    "Tracking associates detections across frames so every target keeps a persistent identity."
  );
  cardShape(slide, 0.74, 2.02, 6.15, 4.75, "F8FAFC", COLORS.border);
  slide.addText("LIVE STREAM CAMERA 04", {
    x: 0.95,
    y: 2.18,
    w: 2.4,
    h: 0.15,
    fontFace: FONT.mono,
    fontSize: 8.5,
    color: COLORS.muted,
    margin: 0,
  });
  slide.addShape(shapeType("line"), {
    x: 1.15,
    y: 4.05,
    w: 1.55,
    h: -0.9,
    line: { color: COLORS.teal, width: 1.4, dash: "dash" },
  });
  slide.addShape(shapeType("line"), {
    x: 2.7,
    y: 3.15,
    w: 1.55,
    h: 0.25,
    line: { color: COLORS.teal, width: 1.4, dash: "dash" },
  });
  slide.addShape(shapeType("rect"), {
    x: 2.5,
    y: 3.0,
    w: 0.95,
    h: 0.75,
    fill: { color: COLORS.bg, transparency: 100 },
    line: { color: COLORS.teal, width: 2 },
  });
  slide.addShape(shapeType("rect"), {
    x: 4.18,
    y: 4.1,
    w: 1.05,
    h: 0.65,
    fill: { color: COLORS.bg, transparency: 100 },
    line: { color: COLORS.violet, width: 2 },
  });
  slide.addText("[01] UAV-01", {
    x: 2.5,
    y: 2.82,
    w: 0.95,
    h: 0.12,
    fontFace: FONT.mono,
    fontSize: 7.4,
    color: COLORS.white,
    fill: { color: COLORS.teal },
    margin: 0,
  });
  slide.addText("[02] UGV-02", {
    x: 4.18,
    y: 3.92,
    w: 1.05,
    h: 0.12,
    fontFace: FONT.mono,
    fontSize: 7.4,
    color: COLORS.white,
    fill: { color: COLORS.violet },
    margin: 0,
  });
  addCard(slide, {
    x: 7.18,
    y: 2.02,
    w: 5.45,
    h: 4.75,
    title: "Detection vs. Tracking",
    body:
      "Object detection answers what is in the current frame.\n\nTracking answers whether the object in frame N is the same object seen in frame N-1.\n\nActive Targets Telemetry\nID #01 (UAV-01)  Speed: 42 kts\nID #02 (UGV-02)  Speed: 24 km/h",
    accent: COLORS.violet,
    titleSize: 15,
    bodySize: 10.2,
  });
}

function slide11() {
  const slide = pptx.addSlide();
  addBackground(slide, 11);
  addTitle(
    slide,
    "3D PERCEPTION",
    "Understanding 3D Worlds",
    "2D cameras flatten the world. 3D perception reconstructs distance, geometry, and spatial structure from visual measurements."
  );
  const items = [
    ["Depth Perception", "Estimate per-pixel distance using stereo disparity, depth sensors, or active ranging."],
    ["Geometric Reasoning", "Recover planes, slopes, orientation, and object boundaries in physical space."],
    ["Spatial Mapping", "Track camera pose while building local 3D maps of the environment."],
  ];
  items.forEach((item, idx) => {
    addCard(slide, {
      x: 0.82 + idx * 4.05,
      y: 2.35,
      w: 3.72,
      h: 2.38,
      title: item[0],
      body: item[1],
      accent: idx === 1 ? COLORS.violet : COLORS.teal,
      titleSize: 15,
      bodySize: 10.2,
    });
  });
  addCard(slide, {
    x: 0.82,
    y: 5.2,
    w: 11.85,
    h: 1.15,
    title: "3D Perception",
    body:
      "The goal is not just to classify what is visible, but to understand where things are, how far away they are, and how they are arranged in the world.",
    accent: COLORS.teal,
    titleSize: 14,
    bodySize: 10.5,
  });
}

function slide12() {
  const slide = pptx.addSlide();
  addBackground(slide, 12);
  addTitle(
    slide,
    "3D REPRESENTATIONS",
    "Point Clouds, Meshes, & Voxels",
    "Different 3D formats optimize for geometry capture, simulation, or occupancy reasoning."
  );
  const items = [
    {
      title: "Point Clouds",
      body: "Raw spatial coordinates captured from active scans. Excellent for obstacle avoidance and landing zone evaluation.",
      footer: "Use case: MQ-9 Reaper LiDAR terrain survey",
      image: asset("pointcloud.png"),
    },
    {
      title: "Meshes",
      body: "Vertices, edges, and triangular faces define continuous surfaces for simulation, collision, and signature analysis.",
      footer: "Use case: armored vehicle RCS modeling",
      image: asset("mesh.png"),
    },
    {
      title: "Voxels",
      body: "A 3D occupancy grid that marks free and occupied volume for navigation and planning.",
      footer: "Use case: UGV indoor occupancy mapping",
      image: asset("voxel.png"),
    },
  ];
  items.forEach((item, idx) => {
    const x = 0.72 + idx * 4.08;
    cardShape(slide, x, 2.0, 3.8, 4.55);
    slide.addImage({ path: item.image, x: x + 0.08, y: 2.08, w: 3.64, h: 1.55 });
    slide.addText(item.title, {
      x: x + 0.16,
      y: 3.78,
      w: 3.48,
      h: 0.2,
      fontFace: FONT.head,
      fontSize: 15,
      bold: true,
      color: COLORS.text,
      margin: 0,
    });
    slide.addText(item.body, {
      x: x + 0.16,
      y: 4.12,
      w: 3.48,
      h: 1.05,
      fontFace: FONT.body,
      fontSize: 9.6,
      color: COLORS.muted,
      margin: 0,
    });
    slide.addText(item.footer, {
      x: x + 0.16,
      y: 5.96,
      w: 3.48,
      h: 0.18,
      fontFace: FONT.mono,
      fontSize: 7.9,
      color: COLORS.teal,
      bold: true,
      margin: 0,
    });
  });
}

function slide13() {
  const slide = pptx.addSlide();
  addBackground(slide, 13);
  addTitle(
    slide,
    "APPLICATION 1: AUTONOMOUS GROUND VEHICLES",
    "Autonomous Ground Systems (Military & Civilian)",
    "Unmanned ground platforms combine multi-spectral sensing, LiDAR, and path planning into safety-critical off-road navigation.",
    { bodyW: 7.8 }
  );
  addImageFrame(slide, asset("tank.png"), 0.8, 2.0, 4.0, 4.8, "Ground vehicle reference scene");
  const items = [
    {
      title: "Stage 1: Sensor Fusion",
      body: "Combine visible light, thermal infrared, LiDAR, and radar into one resilient spatial scene model.",
      footer: "Example: FLIR Boson + Velodyne Puck in night or dust",
    },
    {
      title: "Stage 2: Tactical Perception",
      body: "Detect terrain hazards, segment traversable ground, and classify vehicles and personnel.",
      footer: "Example: safe route extraction through mud and rubble",
    },
    {
      title: "Stage 3: Decision Planning",
      body: "Compute collision-free routes and steering commands in GPS-denied environments with tight latency budgets.",
      footer: "Example: smooth path planning around crater obstacles",
    },
  ];
  items.forEach((item, idx) => {
    addCard(slide, {
      x: 5.12,
      y: 2.0 + idx * 1.56,
      w: 7.25,
      h: 1.33,
      title: item.title,
      body: item.body,
      footer: item.footer,
      accent: idx === 1 ? COLORS.violet : COLORS.teal,
      titleSize: 13.5,
      bodySize: 9.3,
    });
  });
}

function slide14() {
  const slide = pptx.addSlide();
  addBackground(slide, 14);
  addTitle(
    slide,
    "APPLICATION 2: AIRBORNE SYSTEMS",
    "Airborne Autonomy & UAVs",
    "UAVs rely on high-speed edge vision to navigate, track, and choose safe landing zones in contested environments."
  );
  const cards = [
    {
      title: "GPS-Denied SLAM",
      body: "Visual inertial odometry builds local 3D maps so drones can navigate when GPS is jammed or unavailable.",
      footer: "Example: indoor complexes and dense forest canopies",
    },
    {
      title: "Target Lock & Tracking",
      body: "Edge networks keep persistent lock on ground vehicles or assets despite severe occlusion.",
      footer: "Example: convoy tracking through foliage and bridges",
    },
    {
      title: "Landing Zone Safety",
      body: "Plane fitting and terrain roughness analysis identify secure drop-off or landing pockets.",
      footer: "Example: flat 5x5m pockets among rocks and craters",
    },
  ];
  cards.forEach((item, idx) => {
    addCard(slide, {
      x: 0.82 + idx * 4.08,
      y: 2.35,
      w: 3.78,
      h: 3.45,
      title: item.title,
      body: item.body,
      footer: item.footer,
      accent: idx === 1 ? COLORS.violet : COLORS.teal,
      titleSize: 14.5,
      bodySize: 9.8,
    });
  });
  slide.addImage({ path: asset("drone.png"), x: 9.9, y: 5.55, w: 2.0, h: 1.0 });
}

function slide15() {
  const slide = pptx.addSlide();
  addBackground(slide, 15);
  addTitle(
    slide,
    "APPLICATION 3: EDGE COMPUTING",
    "Edge AI & SWaP-C Constraints",
    "Drones and tactical systems must process vision locally under severe size, weight, power, and cost limits."
  );
  addCard(slide, {
    x: 0.82,
    y: 2.02,
    w: 4.15,
    h: 4.9,
    title: "Why Edge Optimization Matters",
    body:
      "SWaP-C Constraints\nTiny boards often need to run under 10 watts.\n\nModel Quantization (INT8)\nConvert FP32 weights into 8-bit integers to reduce memory and power.\n\nNetwork Pruning & Sparsity\nRemove weak connections to reduce latency further.",
    accent: COLORS.teal,
    titleSize: 15,
    bodySize: 10,
  });
  edgeModes.forEach((mode, idx) => {
    addMetricCard(slide, mode, 5.35 + idx * 2.45, 2.08, 2.2, 3.25);
  });
  addCard(slide, {
    x: 5.35,
    y: 5.55,
    w: 7.1,
    h: 1.02,
    title: "Tradeoff",
    body:
      "Edge deployment sacrifices a bit of accuracy to cut memory, latency, and power draw by an order of magnitude.",
    accent: COLORS.violet,
    titleSize: 13.5,
    bodySize: 10.1,
  });
}

function slide16() {
  const slide = pptx.addSlide();
  addBackground(slide, 16);
  addTitle(
    slide,
    "STATE-OF-THE-ART IN AI",
    "What Modern AI Can Do",
    "Foundation models now segment unseen objects and connect visual reasoning with natural language."
  );
  addCard(slide, {
    x: 0.92,
    y: 2.45,
    w: 5.72,
    h: 2.55,
    title: "Visual Foundation Models (SAM)",
    body:
      "Segment Anything models can outline objects without being trained on that specific class ahead of time.",
    accent: COLORS.teal,
    titleSize: 15,
    bodySize: 10.5,
  });
  addCard(slide, {
    x: 6.75,
    y: 2.45,
    w: 5.72,
    h: 2.55,
    title: "Multimodal Vision-Language",
    body:
      'Models like Gemini can read images and charts alongside text, then answer questions such as "What changed from 2024 to 2025?"',
    accent: COLORS.violet,
    titleSize: 15,
    bodySize: 10.5,
  });
  addCard(slide, {
    x: 0.92,
    y: 5.45,
    w: 11.55,
    h: 0.95,
    title: "Takeaway",
    body:
      "Modern AI can generalize better than narrow task-specific pipelines, but deployment still depends on robustness, latency, and trustworthy failure behavior.",
    accent: COLORS.teal,
    titleSize: 13.5,
    bodySize: 10.1,
  });
}

function slide17() {
  const slide = pptx.addSlide();
  addBackground(slide, 17);
  addTitle(slide, "PRACTICAL FAILURES", "Limitations & Failures", null);
  failureCards.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    addCard(slide, {
      x: 0.92 + col * 5.95,
      y: 2.0 + row * 2.15,
      w: 5.55,
      h: 1.85,
      title: item.title,
      body: item.body,
      accent: idx % 2 === 0 ? COLORS.teal : COLORS.violet,
      titleSize: 14,
      bodySize: 10.0,
    });
  });
}

function slide18() {
  const slide = pptx.addSlide();
  addBackground(slide, 18);
  addTitle(
    slide,
    "THE BOTTLENECK",
    "Why Computer Vision Is Hard",
    "Unlike humans, computer vision systems do not have built-in common sense about how the visual world changes."
  );
  challengeCards.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    addCard(slide, {
      x: 0.92 + col * 5.95,
      y: 2.0 + row * 2.15,
      w: 5.55,
      h: 1.85,
      title: item.title,
      body: item.body,
      accent: idx % 2 === 0 ? COLORS.teal : COLORS.violet,
      titleSize: 14,
      bodySize: 10.0,
    });
  });
}

function slide19() {
  const slide = pptx.addSlide();
  addBackground(slide, 19);
  addTitle(
    slide,
    "FUTURE RESEARCH",
    "Future Directions",
    "Research is moving from static 2D labeling to dynamic systems that build richer world models."
  );
  futureCards.forEach((item, idx) => {
    addCard(slide, {
      x: 0.92 + idx * 4.1,
      y: 2.35,
      w: 3.8,
      h: 3.2,
      title: item.title,
      body: item.body,
      accent: COLORS.violet,
      titleSize: 15,
      bodySize: 10.0,
    });
  });
}

function slide20() {
  const slide = pptx.addSlide();
  addBackground(slide, 20);
  addEyebrow(slide, "LECTURE CONCLUSION", 4.98, 0.82, 2.55);
  slide.addText("Computer Vision", {
    x: 3.55,
    y: 1.45,
    w: 6.2,
    h: 0.55,
    fontFace: FONT.head,
    fontSize: 30,
    bold: true,
    color: COLORS.text,
    margin: 0,
    align: "center",
  });
  slide.addText("Key Takeaways", {
    x: 4.22,
    y: 2.02,
    w: 4.9,
    h: 0.42,
    fontFace: FONT.head,
    fontSize: 24,
    bold: true,
    color: COLORS.violet,
    margin: 0,
    align: "center",
  });
  takeaways.forEach((text, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    addCard(slide, {
      x: 1.35 + col * 5.45,
      y: 3.0 + row * 1.55,
      w: 4.95,
      h: 1.18,
      title: `Takeaway ${idx + 1}`,
      body: text,
      accent: COLORS.teal,
      titleSize: 11.8,
      bodySize: 9.6,
    });
  });
}

function buildDeck() {
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Codex";
  pptx.company = "SlideNext";
  pptx.subject = "Computer Vision presentation";
  pptx.title = "Computer Vision Presentation";
  pptx.lang = "en-US";
  pptx.theme = {
    headFontFace: FONT.head,
    bodyFontFace: FONT.body,
    lang: "en-US",
  };

  slide1();
  slide2();
  slide3();
  slide4();
  slide5();
  slide6();
  slide7();
  slide8();
  slide9();
  slide10();
  slide11();
  slide12();
  slide13();
  slide14();
  slide15();
  slide16();
  slide17();
  slide18();
  slide19();
  slide20();
}

async function main() {
  buildDeck();
  await pptx.writeFile({ fileName: outputFile });
  const stat = fs.statSync(outputFile);
  console.log(
    JSON.stringify(
      {
        outputFile,
        bytes: stat.size,
        slides: pptx._slides ? pptx._slides.length : 20,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});

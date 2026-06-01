document.addEventListener('DOMContentLoaded', () => {
  // Navigation State
  let currentSlide = 0;
  const totalSlides = 20;
  const slidesContainer = document.getElementById('slidesContainer');
  const slides = document.querySelectorAll('.slide');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const slideNumText = document.getElementById('slideNum');
  const progressLine = document.getElementById('progressLine');
  const indicatorDots = document.getElementById('indicatorDots');

  // Initialization
  function init() {
    createIndicators();
    updateNavigation();
    setupEventListeners();
    initGlobalParticles();
    animateSlideElements(0);
    
    // Slide specific interactives
    setupPipelineSelector();
    setupSensorsSelector();
    setupPixelGrid();
    setupClassifier();
    setupObjectDetection();
    setupSegmentationSelect();
    setupVideoMotionSim();
    setupTrackingSim();
    setup3DFormatSelector();
    setupAVPipelineSim();
    setupEdgeAISimulator();
    setupFailuresSelector();
  }

  // Create indicator dots dynamically
  function createIndicators() {
    indicatorDots.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('div');
      dot.className = `indicator-dot ${i === 0 ? 'active' : ''}`;
      dot.addEventListener('click', () => goToSlide(i));
      indicatorDots.appendChild(dot);
    }
  }

  // Go to specific slide
  function goToSlide(index) {
    if (index < 0 || index >= totalSlides) return;
    
    // Pause tracking video if leaving Slide 10 (index 9)
    if (currentSlide === 9) {
      const trackingVideo = document.getElementById('trackingVideo');
      if (trackingVideo && !trackingVideo.paused) {
        trackingVideo.pause();
      }
    }

    // Stop Edge AI Simulator if leaving Slide 15 (index 14)
    if (currentSlide === 14 && window.stopEdgeSim) {
      window.stopEdgeSim();
    }

    slides[currentSlide].classList.remove('slide-active');
    currentSlide = index;
    
    // Translate slides container horizontally
    slidesContainer.style.transform = `translateX(-${currentSlide * 100}vw)`;
    slides[currentSlide].classList.add('slide-active');
    
    // Start Edge AI Simulator if entering Slide 15 (index 14)
    if (currentSlide === 14 && window.startEdgeSim) {
      window.startEdgeSim();
    }

    updateNavigation();
    animateSlideElements(currentSlide);
  }

  // Expose goToSlide globally so slide button clicks can call it
  window.goToSlide = goToSlide;

  // Update navigation UI (buttons, counts, dots)
  function updateNavigation() {
    // Previous Button status
    if (currentSlide === 0) {
      prevBtn.style.opacity = '0.3';
      prevBtn.style.pointerEvents = 'none';
    } else {
      prevBtn.style.opacity = '1';
      prevBtn.style.pointerEvents = 'auto';
    }

    // Next Button status
    if (currentSlide === totalSlides - 1) {
      nextBtn.style.opacity = '0.3';
      nextBtn.style.pointerEvents = 'none';
    } else {
      nextBtn.style.opacity = '1';
      nextBtn.style.pointerEvents = 'auto';
    }

    // Slide Counter Label
    const formattedNum = String(currentSlide + 1).padStart(2, '0');
    const formattedTotal = String(totalSlides).padStart(2, '0');
    slideNumText.textContent = `${formattedNum} / ${formattedTotal}`;

    // Bottom progress line width
    const progressPercent = ((currentSlide + 1) / totalSlides) * 100;
    progressLine.style.width = `${progressPercent}%`;

    // Dot indicators matching active slide
    const dots = document.querySelectorAll('.indicator-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentSlide);
    });
  }

  // Slide entrance GSAP timelines
  function animateSlideElements(index) {
    const activeSlide = slides[index];
    const revealItems = activeSlide.querySelectorAll('.glass-panel, .glass-card, h1, h2, p, .pipeline-flow, .guardrail-card, .vision-hud-container, .fail-card, .cv-hard-box');
    
    // Reset/Kill previous animations
    gsap.killTweensOf(revealItems);
    
    // Setup initial reveal state
    gsap.fromTo(revealItems, 
      { opacity: 0, y: 30, scale: 0.96 },
      { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        duration: 0.8, 
        stagger: 0.08, 
        ease: "power2.out", 
        delay: 0.15 
      }
    );
  }

  // Setup click, scroll, and arrow bindings
  function setupEventListeners() {
    prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
    nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        goToSlide(currentSlide + 1);
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToSlide(currentSlide - 1);
      }
    });

    // Mouse wheel transition (Throttled/Debounced)
    let isWheeling = false;
    document.addEventListener('wheel', (e) => {
      if (window.innerWidth <= 768) return; // Ignore wheel controls on mobile
      if (isWheeling) return;
      if (Math.abs(e.deltaY) > 50) {
        isWheeling = true;
        if (e.deltaY > 0) {
          goToSlide(currentSlide + 1);
        } else {
          goToSlide(currentSlide - 1);
        }
        setTimeout(() => isWheeling = false, 900);
      }
    }, { passive: true });

    // Touch Swipe Support for mobile
    let touchStartX = 0;
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const threshold = 80;
      if (touchStartX - touchEndX > threshold) {
        goToSlide(currentSlide + 1);
      } else if (touchEndX - touchStartX > threshold) {
        goToSlide(currentSlide - 1);
      }
    }, { passive: true });
  }

  // --- Background Particles Loop ---
  function initGlobalParticles() {
    const canvas = document.getElementById('particlesCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    
    const particles = [];
    const particleCount = 75;

    class Particle {
      constructor() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = Math.random() * 0.3 - 0.15;
        this.speedY = Math.random() * 0.3 - 0.15;
        this.alpha = Math.random() * 0.4 + 0.15;
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0 || this.x > w) this.speedX *= -1;
        if (this.y < 0 || this.y > h) this.speedY *= -1;
      }

      draw() {
        ctx.fillStyle = `rgba(15, 118, 110, ${this.alpha * 0.35})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animateParticles() {
      ctx.clearRect(0, 0, w, h);
      
      // Draw scan grids
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.005)';
      ctx.lineWidth = 0.5;
      
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animateParticles);
    }

    animateParticles();

    window.addEventListener('resize', () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    });
  }

  // --- Slide 3: Pipeline Step Selector ---
  const pipelineStepsData = {
    sensor: {
      title: "1. Sensor Capture",
      desc: "An imaging sensor (RGB camera, LiDAR, Depth lens) collects light waves or distance photons, transforming raw electromagnetic radiation into raw voltage inputs."
    },
    pixels: {
      title: "2. Pixel Representation",
      desc: "The analog voltage measurements are quantized into a discrete numerical grid of color channels (e.g. Red, Green, Blue integers ranging 0 to 255)."
    },
    features: {
      title: "3. Feature Extraction",
      desc: "The computer vision model processes the grid to identify low-level components (edges, textures, gradients, color boundaries) and high-level abstract shapes."
    },
    understanding: {
      title: "4. Semantic Understanding",
      desc: "Abstract shapes are classified and segmented. The model maps features to semantic meaning (e.g., matching a shape to a 'car' or 'pedestrian' template)."
    },
    decision: {
      title: "5. Operational Decision",
      desc: "The parsed semantic model is analyzed by planning logic to issue instructions (e.g., 'Actuate Brakes', 'Trigger Alarm', 'Categorize Medical Scan')."
    }
  };

  function setupPipelineSelector() {
    const steps = document.querySelectorAll('[data-pipestep]');
    const title = document.getElementById('pipestepTitle');
    const desc = document.getElementById('pipestepDesc');
    const displayBox = document.getElementById('pipelineDisplayBox');

    steps.forEach(step => {
      step.addEventListener('click', () => {
        document.querySelector('.pipeline-step.active')?.classList.remove('active');
        step.classList.add('active');

        const key = step.getAttribute('data-pipestep');
        const data = pipelineStepsData[key];

        // Animate
        gsap.fromTo(displayBox, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.35 });

        title.textContent = data.title;
        desc.textContent = data.desc;
      });
    });
  }

  // --- Slide 4: Sensors Selector ---
  const sensorData = {
    rgb: {
      name: "RGB (Standard) Cameras",
      capture: "Color light waves in Red, Green, and Blue spectrums.",
      desc: "Operates identically to the human eye. Captures textures, fine colors, text, and details. Highly reliant on ambient lighting; cannot parse depth directly.",
      badge: "RGB Channel Feed",
      model: "Sony IMX477 / IMX219",
      format: "Raw Bayer RGGB 12-bit / 8-bit YUV",
      sample: "// 1920x1080 RGB Frame Channel Tensor\n{\n  R: [[142, 142, 145, 148, 150, ...], ...],\n  G: [[90,  91,  92,  94,  96,  ...], ...],\n  B: [[255, 255, 255, 254, 250, ...], ...]\n}"
    },
    depth: {
      name: "Depth / Range Sensors",
      capture: "Proximity coordinates indicating distance per pixel.",
      desc: "Emits specialized beams (often infrared) to calculate the distance between the camera lens and object surfaces. Used heavily in face-ID and proximity detection.",
      badge: "Distance Mapping",
      model: "Intel RealSense D435",
      format: "16-bit Depth Matrix (mm)",
      sample: "// 640x480 Proximity Depth Matrix (Distance values in millimeters)\n[\n  [1240, 1242, 1250, 1280, 0,    0,    ...],\n  [1238, 1239, 1241, 1290, 3422, 3420, ...],\n  [1235, 1236, 1240, 1300, 3424, 3418, ...]\n]"
    },
    stereo: {
      name: "Stereo Camera Arrays",
      capture: "Dual-lens perspective comparisons.",
      desc: "Simulates human binocular vision. Compares horizontal displacement (disparity) between two offset cameras to triangulate distance and produce depth maps.",
      badge: "Binocular Disparity",
      model: "Stereolabs ZED 2i",
      format: "32-bit Disparity Map Float Array",
      sample: "// Disparity offset float maps & depth estimation\n[\n  [0.45, 0.45, 0.48, 1.25, 2.12, 2.15, ...],\n  [0.44, 0.46, 0.50, 1.30, 2.20, 2.18, ...]\n] \n// Triangulation: depth = (baseline * focal) / disparity"
    },
    infrared: {
      name: "Infrared (IR) Cameras",
      capture: "Thermal heat signatures and night vision wavelengths.",
      desc: "Detects light waves outside the visible spectrum. Outstanding for low-light environments, security surveillance, thermal inspections, and fog penetration.",
      badge: "Thermal Radiation",
      model: "FLIR Boson",
      format: "14-bit Thermal Intensity Kelvin values",
      sample: "// 640x512 FLIR Kelvin Temperature Intensities\n[\n  [298.15, 298.20, 298.50, 312.45, 312.50, ...],\n  [298.10, 298.15, 305.20, 314.80, 315.00, ...]\n] \n// Hot engine block segments show up at 312K+ (39°C+)"
    },
    event: {
      name: "Event-Based Cameras",
      capture: "Pixel-level changes in illumination.",
      desc: "Unlike standard cameras that capture full frames at set rates, event cameras only report pixels that change in brightness. Ultra-low power, zero motion blur, and microsecond latency.",
      badge: "Temporal illumination changes",
      model: "Prophesee Metavision",
      format: "Asynchronous Event Stream (x, y, t, p)",
      sample: "// Asynchronous change event stream: [timestamp_us, x, y, polarity]\n[\n  { t: 12045022, x: 124, y: 82,  p: 1 },  // Light intensity increased\n  { t: 12045084, x: 125, y: 82,  p: -1 }, // Light intensity decreased\n  { t: 12045140, x: 242, y: 156, p: 1 }\n]"
    },
    lidar: {
      name: "LiDAR (Light Detection and Ranging)",
      capture: "3D point clouds via laser reflection times.",
      desc: "Fires millions of laser pulses per second and measures the time it takes for them to bounce back. Generates highly accurate 3D maps of environments in real-time, independent of light.",
      badge: "Time-of-Flight Laser Array",
      model: "Ouster OS1",
      format: "Structured 3D Point Coordinates (x, y, z, intensity)",
      sample: "// 3D Point Coordinate & Reflection Intensity Scan Packet\n[\n  { x:  12.452, y:  -3.210, z:  0.814, intensity: 148 },\n  { x:  12.455, y:  -3.208, z:  0.820, intensity: 149 },\n  { x: -14.891, y:  18.420, z: -1.240, intensity: 32  }\n]"
    }
  };

  function setupSensorsSelector() {
    const nodes = document.querySelectorAll('[data-sensor]');
    const name = document.getElementById('sensorName');
    const capture = document.getElementById('sensorCapture');
    const desc = document.getElementById('sensorDesc');
    const badge = document.getElementById('sensorBadge');
    const model = document.getElementById('sensorModel');
    const format = document.getElementById('sensorFormat');
    const dataSample = document.getElementById('sensorDataSample');
    const displayBox = document.getElementById('sensorDisplayBox');

    // Load initial sample
    if (dataSample && sensorData.rgb) {
      dataSample.textContent = sensorData.rgb.sample;
    }

    nodes.forEach(node => {
      node.addEventListener('click', () => {
        document.querySelector('.sensor-node.active')?.classList.remove('active');
        node.classList.add('active');

        const key = node.getAttribute('data-sensor');
        const data = sensorData[key];

        gsap.fromTo(displayBox, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35 });

        name.textContent = data.name;
        capture.textContent = data.capture;
        desc.textContent = data.desc;
        badge.textContent = data.badge;
        if (model) model.textContent = data.model;
        if (format) format.textContent = data.format;
        if (dataSample) dataSample.textContent = data.sample;
      });
    });
  }

  // --- Slide 5: Pixels as Data matrix grid ---
  function setupPixelGrid() {
    const grid = document.getElementById('pixelMatrix');
    const displayVal = document.getElementById('pixelHoverVal');
    const displayCoord = document.getElementById('pixelHoverCoord');
    const valLabel = document.getElementById('pixelValLabel');
    const valDesc = document.getElementById('pixelValDesc');
    const modeGray = document.getElementById('pixelModeGray');
    const modeRGB = document.getElementById('pixelModeRGB');
    
    if (!grid || !displayVal || !displayCoord || !modeGray || !modeRGB) return;
    
    let currentPixelMode = 'gray'; // 'gray' or 'rgb'
    
    // Grayscale representation of a digital shape "3"
    const digit3 = [
      [  0,   0,   0,   0,   0,   0,   0,   0],
      [  0, 255, 255, 255, 255, 255,   0,   0],
      [  0,   0,   0,   0,   0, 255,   0,   0],
      [  0,   0, 255, 255, 255, 255,   0,   0],
      [  0,   0,   0,   0,   0, 255,   0,   0],
      [  0, 255, 255, 255, 255, 255,   0,   0],
      [  0,   0,   0,   0,   0,   0,   0,   0],
      [  0,   0,   0,   0,   0,   0,   0,   0]
    ];

    // Colored shape representing an RGB crosshair target
    const rgbData = [
      [[15,118,110],[15,118,110],[30,41,59],[30,41,59],[30,41,59],[30,41,59],[15,118,110],[15,118,110]],
      [[15,118,110],[109,40,217],[109,40,217],[30,41,59],[30,41,59],[109,40,217],[109,40,217],[15,118,110]],
      [[30,41,59],[109,40,217],[190,18,60],[190,18,60],[190,18,60],[190,18,60],[109,40,217],[30,41,59]],
      [[30,41,59],[30,41,59],[190,18,60],[255,255,255],[255,255,255],[190,18,60],[30,41,59],[30,41,59]],
      [[30,41,59],[30,41,59],[190,18,60],[255,255,255],[255,255,255],[190,18,60],[30,41,59],[30,41,59]],
      [[30,41,59],[109,40,217],[190,18,60],[190,18,60],[190,18,60],[190,18,60],[109,40,217],[30,41,59]],
      [[15,118,110],[109,40,217],[109,40,217],[30,41,59],[30,41,59],[109,40,217],[109,40,217],[15,118,110]],
      [[15,118,110],[15,118,110],[30,41,59],[30,41,59],[30,41,59],[30,41,59],[15,118,110],[15,118,110]]
    ];

    function renderGrid() {
      grid.innerHTML = '';
      const rgbStack = document.getElementById('rgbStackVisual');
      const grayStack = document.getElementById('grayStackVisual');
      const pixelModeImg = document.getElementById('pixelModeImg');
      const pixelModeImgTag = document.getElementById('pixelModeImgTag');
      
      if (currentPixelMode === 'gray') {
        if (rgbStack) rgbStack.classList.add('hidden');
        if (grayStack) grayStack.classList.remove('hidden');
        if (pixelModeImg) {
          pixelModeImg.classList.add('grayscale');
          pixelModeImg.classList.remove('grayscale-0');
        }
        if (pixelModeImgTag) pixelModeImgTag.textContent = "Grayscale";
      } else {
        if (rgbStack) rgbStack.classList.remove('hidden');
        if (grayStack) grayStack.classList.add('hidden');
        if (pixelModeImg) {
          pixelModeImg.classList.remove('grayscale');
          pixelModeImg.classList.add('grayscale-0');
        }
        if (pixelModeImgTag) pixelModeImgTag.textContent = "RGB Color";
      }

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const cell = document.createElement('div');
          cell.className = 'pixel-cell';
          
          if (currentPixelMode === 'gray') {
            const val = digit3[r][c];
            cell.style.backgroundColor = `rgb(${val}, ${val}, ${val})`;
            cell.style.borderColor = 'rgba(15, 23, 42, 0.08)';
            cell.style.borderWidth = '1px';
            
            cell.addEventListener('mouseenter', () => {
              displayCoord.textContent = `Row ${r}, Col ${c}`;
              displayVal.innerHTML = `${val}`;
              if (valLabel) valLabel.textContent = 'Grayscale Value';
              if (valDesc) valDesc.innerHTML = '0 represents complete blackness (no light photon), while 255 represents pure white saturation.';
              displayVal.style.color = 'var(--color-text-primary)';
            });
          } else {
            const [rv, gv, bv] = rgbData[r][c];
            cell.style.backgroundColor = `rgb(${rv}, ${gv}, ${bv})`;
            cell.style.borderColor = 'rgba(15, 23, 42, 0.08)';
            cell.style.borderWidth = '1px';
            
            cell.addEventListener('mouseenter', () => {
              displayCoord.textContent = `Row ${r}, Col ${c}`;
              displayVal.innerHTML = `<span class="text-rose-600">${rv}</span>,<span class="text-teal-600">${gv}</span>,<span class="text-violet-600">${bv}</span>`;
              if (valLabel) valLabel.textContent = 'RGB Channels (R, G, B)';
              if (valDesc) valDesc.innerHTML = `Multi-channel tensor: <span class="text-rose-600 font-bold font-mono">Red: ${rv}</span>, <span class="text-teal-600 font-bold font-mono">Green: ${gv}</span>, <span class="text-violet-600 font-bold font-mono">Blue: ${bv}</span>.`;
              displayVal.style.color = 'var(--color-text-primary)';
            });
          }
          grid.appendChild(cell);
        }
      }
    }

    modeGray.addEventListener('click', () => {
      currentPixelMode = 'gray';
      modeGray.className = "flex-1 py-1 px-2 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold";
      modeRGB.className = "flex-1 py-1 px-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold";
      renderGrid();
    });

    modeRGB.addEventListener('click', () => {
      currentPixelMode = 'rgb';
      modeRGB.className = "flex-1 py-1 px-2 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold";
      modeGray.className = "flex-1 py-1 px-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold";
      renderGrid();
    });

    renderGrid();
  }

  // --- Slide 6: Classifier interactive ---
  function setupClassifier() {
    const tab1 = document.getElementById('classTab1');
    const tab2 = document.getElementById('classTab2');
    const previewImg = document.getElementById('classPreviewImg');
    const bar1 = document.getElementById('bar1');
    const text1 = document.getElementById('text1');
    const bar2 = document.getElementById('bar2');
    const text2 = document.getElementById('text2');
    const badgeLabel = document.getElementById('classBadgeLabel');

    if (!tab1 || !tab2 || !previewImg) return;

    tab1.addEventListener('click', () => {
      tab1.className = "flex-1 py-2 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold";
      tab2.className = "flex-1 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold";
      
      // Update image source for Example 1 (Drone)
      previewImg.src = "assets/drone.png";
      badgeLabel.textContent = "Raw RGB input feed (UAV / Surveillance Drone)";
      
      // Animate confidence bars
      gsap.to(bar1, { width: "92%", duration: 0.65, ease: "power2.out" });
      text1.textContent = "92%";
      gsap.to(bar2, { width: "8%", duration: 0.65, ease: "power2.out" });
      text2.textContent = "8%";
    });

    tab2.addEventListener('click', () => {
      tab2.className = "flex-1 py-2 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold";
      tab1.className = "flex-1 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold";
      
      // Update image source for Example 2 (Tank)
      previewImg.src = "assets/tank.png";
      badgeLabel.textContent = "Raw RGB input feed (Ground Vehicle / Tank)";
      
      gsap.to(bar1, { width: "4%", duration: 0.65, ease: "power2.out" });
      text1.textContent = "4%";
      gsap.to(bar2, { width: "96%", duration: 0.65, ease: "power2.out" });
      text2.textContent = "96%";
    });
  }

  // --- Slide 7: Object Detection interactive boxes ---
  function setupObjectDetection() {
    const btnAll = document.getElementById('detBtnAll');
    const btnCars = document.getElementById('detBtnCars');
    const btnPeds = document.getElementById('detBtnPeds');
    
    const boxCar1 = document.getElementById('boxCar1');
    const boxCar2 = document.getElementById('boxCar2');
    const boxPed1 = document.getElementById('boxPed1');
    const boxPed2 = document.getElementById('boxPed2');

    if (!btnAll || !btnCars || !btnPeds) return;

    btnAll.addEventListener('click', () => {
      setActiveButton(btnAll);
      gsap.to([boxCar1, boxCar2, boxPed1, boxPed2], { opacity: 1, scale: 1, duration: 0.3 });
    });

    btnCars.addEventListener('click', () => {
      setActiveButton(btnCars);
      gsap.to([boxCar1, boxCar2], { opacity: 1, scale: 1, duration: 0.3 });
      gsap.to([boxPed1, boxPed2], { opacity: 0, scale: 0.9, duration: 0.3 });
    });

    btnPeds.addEventListener('click', () => {
      setActiveButton(btnPeds);
      gsap.to([boxPed1, boxPed2], { opacity: 1, scale: 1, duration: 0.3 });
      gsap.to([boxCar1, boxCar2], { opacity: 0, scale: 0.9, duration: 0.3 });
    });

    function setActiveButton(btn) {
      [btnAll, btnCars, btnPeds].forEach(b => {
        b.className = "w-full py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold";
      });
      btn.className = "w-full py-2 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold";
    }
  }

  // --- Slide 8: Segmentation Selector ---
  const segData = {
    class: {
      title: "Image Classification",
      desc: "Returns a global label for the entire image (e.g., 'Street Scene'). Identifies what is present but offers zero location details.",
      color: "border-[var(--color-primary)]"
    },
    detect: {
      title: "Object Detection",
      desc: "Draws bounding box rectangles with coordinates around specific objects (e.g., 'Car 1', 'Pedestrian 1'). Gives location, but not shape boundary.",
      color: "border-[var(--color-secondary)]"
    },
    semantic: {
      title: "Semantic Segmentation",
      desc: "Categorizes every pixel in the image into class layers (e.g., coloring all road pixels purple, all car pixels blue). Does not distinguish between individual cars.",
      color: "border-[var(--color-primary)]"
    },
    instance: {
      title: "Instance Segmentation",
      desc: "Locates and marks pixel-level boundaries for every distinct object individually (e.g., coloring Car A green, Car B red, and Car C blue). Precise and individual.",
      color: "border-[var(--color-secondary)]"
    }
  };

  function setupSegmentationSelect() {
    const tabs = document.querySelectorAll('[data-seg]');
    const title = document.getElementById('segTitle');
    const desc = document.getElementById('segDesc');
    const demo = document.getElementById('segDemoVisual');
    const displayBox = document.getElementById('segDisplayBox');

    if (!tabs.length || !title || !desc || !demo) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.seg-tab-btn').forEach(t => {
          t.className = "seg-tab-btn w-full py-2.5 text-left px-4 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold transition-all flex justify-between";
        });
        tab.className = "seg-tab-btn active w-full py-2.5 text-left px-4 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-text-primary)] text-xs font-semibold transition-all flex justify-between";

        const key = tab.getAttribute('data-seg');
        const data = segData[key];

        gsap.fromTo(displayBox, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.35 });

        title.textContent = data.title;
        desc.textContent = data.desc;
        
        // Render different visuals inside the box using aspect-video (16:9) to prevent skewing
        if (key === 'class') {
          demo.className = "bbox-container aspect-square h-[400px] md:h-[450px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative flex items-center justify-center mx-auto";
          demo.innerHTML = `
            <img src="assets/street.png" alt="Classification target" class="w-full h-full object-cover">
            <div class="absolute top-3 left-3 px-2 py-1 bg-white/95 border border-[var(--color-primary)]/30 rounded font-mono text-[10px] text-[var(--color-text-primary)] flex items-center gap-1.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
              <span class="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse"></span>
              Class: Street Scene [99%]
            </div>
            <div class="absolute bottom-2 right-2 px-2 py-0.5 bg-black/75 border border-white/10 rounded font-mono text-[9px] text-[#8b949e]">Classification View</div>
          `;
        } else if (key === 'detect') {
          demo.className = "bbox-container aspect-square h-[400px] md:h-[450px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative flex items-center justify-center mx-auto";
          demo.innerHTML = `
            <img src="assets/street.png" alt="Detection target" class="w-full h-full object-cover">
            <!-- Box 1 (Car - Yellow taxi) -->
            <div class="absolute border-2 border-[var(--color-primary)]" style="left: 39%; top: 67%; width: 16%; height: 21%; box-shadow: 0 0 8px rgba(var(--color-primary-rgb), 0.4);">
              <span class="absolute top-[-20px] left-[-2px] bg-[var(--color-primary)] text-white text-[8px] px-1.5 py-0.5 font-mono font-bold">Car [98%]</span>
            </div>
            <!-- Box 2 (Car - White SUV) -->
            <div class="absolute border-2 border-[var(--color-primary)]" style="left: 58%; top: 64%; width: 20%; height: 21%; box-shadow: 0 0 8px rgba(var(--color-primary-rgb), 0.4);">
              <span class="absolute top-[-20px] left-[-2px] bg-[var(--color-primary)] text-white text-[8px] px-1.5 py-0.5 font-mono font-bold">Car [91%]</span>
            </div>
            <!-- Box 3 (Pedestrian - Left) -->
            <div class="absolute border-2 border-[var(--color-secondary)]" style="left: 34%; top: 57%; width: 5%; height: 13%; box-shadow: 0 0 8px rgba(var(--color-secondary-rgb), 0.4);">
              <span class="absolute top-[-20px] left-[-2px] bg-[var(--color-secondary)] text-white text-[8px] px-1.5 py-0.5 font-mono font-bold">Pedestrian [89%]</span>
            </div>
            <div class="absolute bottom-2 right-2 px-2 py-0.5 bg-black/75 border border-white/10 rounded font-mono text-[9px] text-[#8b949e]">Object Detection View</div>
          `;
        } else if (key === 'semantic') {
          demo.className = "bbox-container aspect-square h-[400px] md:h-[450px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative flex items-center justify-center mx-auto";
          demo.innerHTML = `
            <div class="relative w-full h-full">
              <img src="assets/street.png" alt="Semantic background" class="w-full h-full object-cover absolute inset-0">
              <img src="assets/segmentation.png" alt="Semantic mask" class="w-full h-full object-cover absolute inset-0 opacity-60 mix-blend-normal" style="filter: hue-rotate(90deg) saturate(1.5);">
            </div>
            <div class="absolute bottom-2 right-2 px-2 py-0.5 bg-black/75 border border-white/10 rounded font-mono text-[9px] text-[#8b949e]">Semantic Segmentation (Pixel Classes)</div>
            <!-- Legend overlay -->
            <div class="absolute top-3 left-3 bg-white/95 border border-slate-200 p-2 rounded flex flex-col gap-1 text-[8px] font-mono shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
              <div class="flex items-center gap-1.5"><span class="w-2 h-2 bg-purple-500 rounded-sm"></span><span class="text-slate-800">Road</span></div>
              <div class="flex items-center gap-1.5"><span class="w-2 h-2 bg-blue-500 rounded-sm"></span><span class="text-slate-800">Vehicles</span></div>
              <div class="flex items-center gap-1.5"><span class="w-2 h-2 bg-red-500 rounded-sm"></span><span class="text-slate-800">Pedestrians</span></div>
            </div>
          `;
        } else if (key === 'instance') {
          demo.className = "bbox-container aspect-square h-[400px] md:h-[450px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative flex items-center justify-center mx-auto";
          demo.innerHTML = `
            <div class="relative w-full h-full">
              <img src="assets/street.png" alt="Instance background" class="w-full h-full object-cover absolute inset-0">
              <img src="assets/segmentation.png" alt="Instance mask" class="w-full h-full object-cover absolute inset-0 opacity-60 mix-blend-normal" style="filter: hue-rotate(220deg) saturate(1.8);">
              <!-- Bounding box overlays for separate instances -->
              <div class="absolute border border-emerald-500 rounded-sm" style="left: 39%; top: 67%; width: 16%; height: 21%; box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);">
                <span class="absolute top-[-15px] left-0 bg-emerald-600 text-white text-[7px] px-1 font-mono">Car instance_01</span>
              </div>
              <div class="absolute border border-amber-500 rounded-sm" style="left: 58%; top: 64%; width: 20%; height: 21%; box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);">
                <span class="absolute top-[-15px] left-0 bg-amber-600 text-white text-[7px] px-1 font-mono">Car instance_02</span>
              </div>
              <div class="absolute border border-rose-500 rounded-sm" style="left: 34%; top: 57%; width: 5%; height: 13%; box-shadow: 0 0 6px rgba(244, 63, 94, 0.4);">
                <span class="absolute top-[-15px] left-0 bg-rose-600 text-white text-[7px] px-1 font-mono">Ped instance_01</span>
              </div>
            </div>
            <div class="absolute bottom-2 right-2 px-2 py-0.5 bg-black/75 border border-white/10 rounded font-mono text-[9px] text-[#8b949e]">Instance Segmentation (Distinct Contours)</div>
          `;
        }
      });
    });

    // Trigger initial state mapping on load
    document.querySelector('[data-seg="class"]')?.click();
  }

  // --- Slide 9: Video Understanding (Sparse Vectors vs Dense Optical Flow) ---
  function setupVideoMotionSim() {
    const playBtn = document.getElementById('playMotionBtn');
    const canvas = document.getElementById('opticalFlowCanvas');
    const tabSparse = document.getElementById('flowTabSparse');
    const tabDense = document.getElementById('flowTabDense');
    const explanation = document.getElementById('flowExplanation');

    if (!playBtn || !canvas || !tabSparse || !tabDense || !explanation) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    let isPlaying = false;
    let animId = null;
    let time = 0;
    let currentMode = 'sparse'; // 'sparse' or 'dense'

    // Vehicle parameters
    const obj = {
      x: -60,
      y: height / 2,
      carW: 60,
      carH: 26,
      vx: 2.5,
      vy: 0
    };

    // 4 distinct sparse key points (the 4 corners of the vehicle chassis)
    const sparseKeyPoints = [
      { x: 30, y: -11, label: "Front Top" },
      { x: 30, y: 11, label: "Front Bottom" },
      { x: -30, y: -11, label: "Rear Top" },
      { x: -30, y: 11, label: "Rear Bottom" }
    ];

    function drawLegend() {
      if (currentMode === 'dense') {
        // Draw HSL Color Wheel Legend in top-right corner
        const lx = width - 35;
        const ly = 35;
        const lr = 12;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(lx, ly, lr + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        for (let angle = 0; angle < 360; angle += 15) {
          const rad = angle * Math.PI / 180;
          ctx.strokeStyle = `hsl(${angle}, 100%, 55%)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + Math.cos(rad) * lr, ly + Math.sin(rad) * lr);
          ctx.stroke();
        }

        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.font = '6px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('R', lx + lr + 4, ly);
        ctx.fillText('L', lx - lr - 4, ly);
        ctx.fillText('D', lx, ly + lr + 4);
        ctx.fillText('U', lx, ly - lr - 4);
        ctx.restore();
      } else {
        // Draw Sparse Legend (Teal tracker details)
        const lx = width - 60;
        const ly = 15;
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(lx, ly, 50, 32, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f766e';
        ctx.beginPath();
        ctx.arc(lx + 8, ly + 10, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.font = '7px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Keypoint', lx + 16, ly + 10);

        ctx.strokeStyle = '#0f766e';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(lx + 4, ly + 22);
        ctx.lineTo(lx + 12, ly + 22);
        ctx.stroke();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillText('Vector', lx + 16, ly + 22);
        ctx.restore();
      }
    }

    const radius = 24;

    function render() {
      // Fade background to show temporal movement trails in light theme
      ctx.fillStyle = 'rgba(248, 250, 252, 0.18)';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle background camera crosshair grid
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.02)';
      ctx.lineWidth = 0.5;
      const gridSize = 15;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Physics update: Straight line horizontal travel (moves left-to-right)
      time += 0.04;
      obj.x = ((time * 60) % (width + radius * 2)) - radius;
      obj.y = height / 2;

      if (currentMode === 'dense') {
        // DENSE OPTICAL FLOW: Fill the circular target with dense red cells and flow needles pointing right
        const flowGrid = 6;
        for (let x = flowGrid / 2; x < width; x += flowGrid) {
          for (let y = flowGrid / 2; y < height; y += flowGrid) {
            const dx = x - obj.x;
            const dy = y - obj.y;

            if (dx * dx + dy * dy <= radius * radius) {
              const dist = Math.sqrt(dx * dx + dy * dy);
              const intensity = 1 - dist / radius;
              const alpha = 0.25 + 0.65 * intensity;

              // Pure rightward flow angle (0 rad) -> HSL color wheel maps this to 0 (red)
              ctx.fillStyle = `hsla(0, 100%, 50%, ${alpha})`;
              ctx.fillRect(x - flowGrid / 2, y - flowGrid / 2, flowGrid, flowGrid);
            }
          }
        }

        // Overlay flow needle vectors
        const needleGrid = 12;
        for (let x = needleGrid / 2; x < width; x += needleGrid) {
          for (let y = needleGrid / 2; y < height; y += needleGrid) {
            const dx = x - obj.x;
            const dy = y - obj.y;

            if (dx * dx + dy * dy <= radius * radius) {
              ctx.strokeStyle = `hsl(0, 100%, 45%)`;
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x + obj.vx * 2.5, y);
              ctx.stroke();

              ctx.fillStyle = `hsl(0, 100%, 45%)`;
              ctx.beginPath();
              ctx.arc(x + obj.vx * 2.5, y, 1, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.fillStyle = 'rgba(15, 23, 42, 0.05)';
              ctx.beginPath();
              ctx.arc(x, y, 0.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      } else {
        // SPARSE MOTION VECTORS: Draw a single target circle with one bold arrow pointing right
        for (let x = 10; x < width; x += 15) {
          for (let y = 10; y < height; y += 15) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.05)';
            ctx.beginPath();
            ctx.arc(x, y, 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draw target circle outline and subtle fill in Teal
        ctx.strokeStyle = '#0f766e';
        ctx.fillStyle = 'rgba(15, 118, 110, 0.06)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw central tracked keypoint
        ctx.fillStyle = '#0f766e';
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw bold velocity vector arrow
        ctx.strokeStyle = '#0f766e';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y);
        ctx.lineTo(obj.x + 30, obj.y);
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(obj.x + 30, obj.y - 4);
        ctx.lineTo(obj.x + 36, obj.y);
        ctx.lineTo(obj.x + 30, obj.y + 4);
        ctx.closePath();
        ctx.fillStyle = '#0f766e';
        ctx.fill();

        // Draw bounding box details around target
        ctx.strokeStyle = 'rgba(15, 118, 110, 0.3)';
        ctx.setLineDash([2, 3]);
        ctx.lineWidth = 1;
        ctx.strokeRect(obj.x - radius - 2, obj.y - radius - 2, radius * 2 + 4, radius * 2 + 4);
        ctx.setLineDash([]);

        ctx.fillStyle = '#0f766e';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Target [01]', obj.x - radius, obj.y - radius - 5);
      }

      drawLegend();

      if (isPlaying) {
        animId = requestAnimationFrame(render);
      }
    }

    // Toggle Mode Handlers
    function setMode(mode) {
      currentMode = mode;
      if (mode === 'sparse') {
        tabSparse.className = "w-full py-2 px-3 text-left rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-text-primary)] text-xs font-semibold flex items-center justify-between transition-all";
        tabDense.className = "w-full py-2 px-3 text-left rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-between transition-all";
        explanation.textContent = "Sparse Motion Vectors track key features (like vehicle corners). Fast, low latency, but leaves empty gaps in uniform areas.";
      } else {
        tabDense.className = "w-full py-2 px-3 text-left rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-text-primary)] text-xs font-semibold flex items-center justify-between transition-all";
        tabSparse.className = "w-full py-2 px-3 text-left rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-between transition-all";
        explanation.textContent = "Dense Optical Flow calculates motion vectors for every pixel. Angle determines color hue, and speed determines lightness.";
      }
      
      if (!isPlaying) {
        render();
      }
    }

    tabSparse.addEventListener('click', () => setMode('sparse'));
    tabDense.addEventListener('click', () => setMode('dense'));

    playBtn.addEventListener('click', () => {
      if (isPlaying) {
        isPlaying = false;
        cancelAnimationFrame(animId);
        playBtn.innerHTML = `<span class="material-symbols-outlined mr-1.5 text-[18px]">play_arrow</span> Run Simulation`;
      } else {
        isPlaying = true;
        playBtn.innerHTML = `<span class="material-symbols-outlined mr-1.5 text-[18px]">pause</span> Pause Simulation`;
        render();
      }
    });

    render();

    document.addEventListener('keydown', () => {
      if (currentSlide !== 8 && isPlaying) {
        isPlaying = false;
        cancelAnimationFrame(animId);
        playBtn.innerHTML = `<span class="material-symbols-outlined mr-1.5 text-[18px]">play_arrow</span> Run Simulation`;
      }
    });
  }
  // --- Slide 10: Tracking Simulator ---
  function setupTrackingSim() {
    const playBtn = document.getElementById('playTrackBtn');
    const frameIdxText = document.getElementById('trackFrameIdx');
    const video = document.getElementById('trackingVideo');
    const canvas = document.getElementById('trackingCanvas');
    const telemetry = document.getElementById('trackerTelemetry');
    const fallbackBg = document.getElementById('trackingFallbackBg');

    if (!playBtn || !video || !frameIdxText || !canvas) return;

    const ctx = canvas.getContext('2d');
    let isTrackingActive = false;
    let animId = null;
    let frameNum = 0;

    // Simulated tracking targets
    const target1 = {
      id: "01",
      name: "UAV-01",
      x: 50,
      y: 80,
      w: 48,
      h: 48,
      color: "#0f766e",
      history: [],
      speed: "42 kts"
    };

    const target2 = {
      id: "02",
      name: "UGV-02",
      x: 320,
      y: 140,
      w: 56,
      h: 36,
      color: "#6d28d9",
      history: [],
      speed: "24 km/h"
    };

    function updateTargets() {
      frameNum++;
      frameIdxText.textContent = `FRAME: ${String(frameNum).padStart(4, '0')}`;

      // Update Target 1 (UAV) in horizontal wave
      target1.x = 40 + (frameNum * 1.8) % (canvas.width - 80);
      target1.y = 50 + Math.sin(frameNum * 0.05) * 20;
      target1.history.push({ x: target1.x, y: target1.y });
      if (target1.history.length > 25) target1.history.shift();

      // Update Target 2 (UGV) in diagonal movement
      target2.x = canvas.width - 40 - (frameNum * 1.2) % (canvas.width - 80);
      target2.y = 130 + Math.cos(frameNum * 0.03) * 15;
      target2.history.push({ x: target2.x, y: target2.y });
      if (target2.history.length > 25) target2.history.shift();

      // Telemetry printout
      if (telemetry) {
        telemetry.innerHTML = `<strong>Active Targets Telemetry:</strong><br>
        • ID #${target1.id} (${target1.name}) Pos: (${Math.round(target1.x)}, ${Math.round(target1.y)}) | Speed: ${target1.speed}<br>
        • ID #${target2.id} (${target2.name}) Pos: (${Math.round(target2.x)}, ${Math.round(target2.y)}) | Speed: ${target2.speed}`;
      }
    }

    function drawTracker() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw trajectories
      [target1, target2].forEach(target => {
        if (target.history.length > 1) {
          ctx.strokeStyle = target.color;
          ctx.lineWidth = 2;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(target.history[0].x, target.history[0].y);
          for (let i = 1; i < target.history.length; i++) {
            ctx.lineTo(target.history[i].x, target.history[i].y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw bounding boxes
        ctx.strokeStyle = target.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(target.x - target.w / 2, target.y - target.h / 2, target.w, target.h);

        // Draw box labels
        ctx.fillStyle = target.color;
        ctx.fillRect(target.x - target.w / 2 - 1, target.y - target.h / 2 - 16, target.w + 2, 16);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`[${target.id}] ${target.name}`, target.x - target.w / 2 + 4, target.y - target.h / 2 - 5);
      });

      if (isTrackingActive) {
        updateTargets();
        animId = requestAnimationFrame(drawTracker);
      }
    }

    playBtn.addEventListener('click', () => {
      if (isTrackingActive) {
        isTrackingActive = false;
        cancelAnimationFrame(animId);
        video.pause();
        playBtn.innerHTML = `<span class="material-symbols-outlined mr-1.5 text-[18px]">play_arrow</span> Run Tracker`;
      } else {
        isTrackingActive = true;
        video.play().catch(err => {
          console.warn("sample.mp4 absent, running canvas-only simulation:", err);
          if (fallbackBg) fallbackBg.classList.remove('hidden');
        });
        playBtn.innerHTML = `<span class="material-symbols-outlined mr-1.5 text-[18px]">pause</span> Pause Tracker`;
        drawTracker();
      }
    });

    video.addEventListener('play', () => {
      if (fallbackBg) fallbackBg.classList.add('hidden');
    });

    // Keydown clean up on slide change
    document.addEventListener('keydown', () => {
      if (currentSlide !== 9 && isTrackingActive) {
        isTrackingActive = false;
        cancelAnimationFrame(animId);
        video.pause();
        playBtn.innerHTML = `<span class="material-symbols-outlined mr-1.5 text-[18px]">play_arrow</span> Run Tracker`;
      }
    });

    // Set initial dimension and draw initial frame
    canvas.width = 640;
    canvas.height = 360;
    drawTracker();
    if (telemetry) {
      telemetry.innerHTML = `<strong>Active Targets Telemetry:</strong><br>
      • ID #${target1.id} (${target1.name}) Pos: (${Math.round(target1.x)}, ${Math.round(target1.y)}) | Speed: ${target1.speed}<br>
      • ID #${target2.id} (${target2.name}) Pos: (${Math.round(target2.x)}, ${Math.round(target2.y)}) | Speed: ${target2.speed}`;
    }
  }
  // --- Slide 12: 3D Formats Selector ---
  const formatsData = {
    point: {
      name: "Point Clouds",
      feature: "LiDAR spatial coordinates (X, Y, Z) returned from active surface scans.",
      use: "MQ-9 Reaper drone urban landing zone LiDAR survey & terrain mapping.",
      desc: "Raw spatial coordinates captured by time-of-flight laser reflections. Highly accurate geometry of terrain, buildings, and ground targets. Excellent for drone obstacle avoidance and landing zone evaluation."
    },
    mesh: {
      name: "Polygonal Meshes",
      feature: "Geometric network of interconnected vertices, edges, and triangular faces.",
      use: "Oshkosh L-ATV armored vehicle mesh for Radar Cross Section (RCS) simulations.",
      desc: "Vertices connected by edges forming triangular facets. Defines continuous solid surfaces, which is critical for simulation modeling, physical collision response, and infrared/radar signature analysis."
    },
    voxel: {
      name: "Volumetric Voxels",
      feature: "3D grid cubes defining occupancy states (occupied vs. empty space).",
      use: "UGV indoor occupancy mapping and autonomous path navigation.",
      desc: "The three-dimensional equivalent of pixels. Divides local space into a 3D grid where each cell identifies solid obstacles vs clear traversable paths. Essential for path planning and volumetric AI analysis."
    }
  };

  function setup3DFormatSelector() {
    const cards = document.querySelectorAll('[data-dim3]');
    const name = document.getElementById('dim3Name');
    const feature = document.getElementById('dim3Feature');
    const use = document.getElementById('dim3Use');
    const desc = document.getElementById('dim3Desc');
    const displayBox = document.getElementById('dim3DisplayBox');

    if (!cards.length || !name || !feature || !use || !desc) return;

    cards.forEach(card => {
      card.addEventListener('click', () => {
        const activeCard = document.querySelector('.dim3-card.active');
        if (activeCard) {
          activeCard.classList.remove('active', 'border-t-[var(--color-primary)]');
          activeCard.classList.add('border-t-transparent');
        }
        card.classList.add('active', 'border-t-[var(--color-primary)]');
        card.classList.remove('border-t-transparent');

        const key = card.getAttribute('data-dim3');
        const data = formatsData[key];

        gsap.fromTo(displayBox, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.35 });

        name.textContent = data.name;
        feature.textContent = data.feature;
        use.textContent = data.use;
        desc.textContent = data.desc;

        // Dynamic 3D format image swapping
        const img = document.querySelector('#dim3DemoVisual img');
        if (img) {
          if (key === 'point') img.src = 'assets/pointcloud.png';
          else if (key === 'mesh') img.src = 'assets/mesh.png';
          else if (key === 'voxel') img.src = 'assets/voxel.png';
        }
      });
    });
  }

  // --- Slide 13: AV Pipeline ---
  const avStages = {
    fusion: {
      title: "Stage 1: Multi-Spectral Sensor Fusion",
      desc: "Combines visible light cameras, thermal infrared for night operations, LiDAR point clouds, and Radar to build a continuous 360-degree tactical spatial coordinate map resilient to weather, dust, and jamming.",
      example: "Combining FLIR Boson thermal cameras with Velodyne Puck LiDAR point clouds to guide ground vehicles through heavy dust or night operations."
    },
    percept: {
      title: "Stage 2: Tactical Perception & Hazard Detection",
      desc: "Identifies off-road terrain features (mud, soft sand, rocky obstacles) and performs semantic segmentation to map safe passageways while classifying vehicles and personnel.",
      example: "Segmenting safe traversable routes through dirt, mud, and water hazards from static obstructions like vehicle hulls."
    },
    planning: {
      title: "Stage 3: Path Planning & SWaP-C Controls",
      desc: "Computes collision-free routes in GPS-denied environments. Maps safety corridors through obstacles and directs low-level actuators to steer unmanned logistics ground platforms.",
      example: "Calculating smooth steering trajectories around mapped rubble or crater obstacles in under 10 milliseconds."
    }
  };

  function setupAVPipelineSim() {
    const nodes = document.querySelectorAll('[data-avstage]');
    const title = document.getElementById('avStageTitle');
    const desc = document.getElementById('avStageDesc');
    const example = document.getElementById('avStageExampleBox');
    const displayBox = document.getElementById('avDisplayBox');
    
    if (nodes.length === 0 || !title || !desc || !displayBox) return;

    let index = 0;
    const stageKeys = ['fusion', 'percept', 'planning'];

    function changeStage(targetIdx) {
      document.querySelector('.av-node.active')?.classList.remove('active');
      
      index = targetIdx;
      const key = stageKeys[index];
      const node = document.querySelector(`[data-avstage="${key}"]`);
      node?.classList.add('active');

      const data = avStages[key];
      
      // GSAP animate display panel
      gsap.fromTo(displayBox, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35 });

      title.textContent = data.title;
      desc.textContent = data.desc;
      if (example) example.innerHTML = `<strong>Example:</strong> ${data.example}`;
    }

    // Auto loop timer every 4s
    let autoLoop = setInterval(() => {
      if (currentSlide === 12) {
        index = (index + 1) % stageKeys.length;
        changeStage(index);
      }
    }, 4200);

    // Clicks override auto loop
    nodes.forEach((node, idx) => {
      node.addEventListener('click', () => {
        clearInterval(autoLoop);
        changeStage(idx);
      });
    });
  }

  // --- Slide 17: Limitations selector ---
  const limitData = {
    lighting: {
      title: "Lighting Changes",
      desc: "Sudden glare, deep shadows, or dark night-time feeds change pixel values entirely. Models trained on sunny days frequently fail when facing blinding lens reflections."
    },
    weather: {
      title: "Extreme Weather",
      desc: "Rain droplets, snow blankets, and dense fog obscure lines of sight. LiDAR beams scatter off raindrops, and optical cameras lose critical texture details."
    },
    occlusion: {
      title: "Object Occlusion",
      desc: "When an object is partially hidden (e.g. a pedestrian stepping behind a mailbox), the model fails to extract complete features, misidentifying or dropping tracks."
    },
    adversarial: {
      title: "Adversarial Noise",
      desc: "Deliberately added patterns (like sticker tags on stop signs) can trick neural networks into misclassifying signs entirely (e.g., perceiving a Stop sign as a Speed Limit 45 sign)."
    }
  };

  function setupFailuresSelector() {
    const cards = document.querySelectorAll('[data-fail]');
    const title = document.getElementById('failTitle');
    const desc = document.getElementById('failDesc');
    const displayBox = document.getElementById('failDisplayBox');

    cards.forEach(card => {
      card.addEventListener('click', () => {
        document.querySelector('.fail-card.active')?.classList.remove('active');
        card.classList.add('active');

        const key = card.getAttribute('data-fail');
        const data = limitData[key];

        gsap.fromTo(displayBox, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 });

        title.textContent = data.title;
        desc.textContent = data.desc;
      });
    });
  }

  // --- Slide 15: Edge AI Simulator ---
  const edgeModesData = {
    fp32: {
      modelName: "Model: YOLOv8-Nano (FP32 Precision)",
      badge: "High SWaP Draw",
      badgeClass: ["bg-rose-100", "text-rose-800"],
      size: "250.0 MB",
      latency: "45.0 ms",
      power: "15.0 Watts",
      accuracy: "98.2%"
    },
    int8: {
      modelName: "Model: YOLOv8-Nano (INT8 Quantized)",
      badge: "Low SWaP / Efficient",
      badgeClass: ["bg-emerald-100", "text-emerald-800"],
      size: "62.5 MB",
      latency: "6.2 ms",
      power: "2.1 Watts",
      accuracy: "97.4%"
    },
    pruned: {
      modelName: "Model: YOLOv8-Nano (Pruned INT8 Sparsity)",
      badge: "Ultra-Low Latency Edge",
      badgeClass: ["bg-[var(--color-primary)]/10", "text-[var(--color-primary)]"],
      size: "15.6 MB",
      latency: "2.8 ms",
      power: "1.2 Watts",
      accuracy: "95.8%"
    }
  };

  function setupEdgeAISimulator() {
    const tabs = document.querySelectorAll('[data-opt]');
    const modelName = document.getElementById('optModelName');
    const badge = document.getElementById('optBadge');
    const size = document.getElementById('optSize');
    const latency = document.getElementById('optLatency');
    const power = document.getElementById('optPower');
    const accuracy = document.getElementById('optAccuracy');
    const canvas = document.getElementById('edgeMatrixCanvas');

    if (!tabs.length || !canvas || !modelName || !badge || !size || !latency || !power || !accuracy) return;

    const ctx = canvas.getContext('2d');
    let activeMode = 'fp32';
    let frame = 0;
    let animId = null;

    // Set up tabs click handlers
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Manage active classes
        const activeTab = document.querySelector('.opt-tab-btn.active');
        if (activeTab) {
          activeTab.classList.remove('active', 'border-[var(--color-primary)]', 'bg-[var(--color-primary)]/10', 'text-[var(--color-primary)]');
          activeTab.classList.add('border-slate-200', 'bg-slate-100', 'text-slate-500');
        }
        
        tab.classList.add('active', 'border-[var(--color-primary)]', 'bg-[var(--color-primary)]/10', 'text-[var(--color-primary)]');
        tab.classList.remove('border-slate-200', 'bg-slate-100', 'text-slate-500');

        activeMode = tab.getAttribute('data-opt');
        const data = edgeModesData[activeMode];

        // Animate visual display values
        gsap.fromTo([size, latency, power, accuracy], { scale: 0.9, opacity: 0.5 }, { scale: 1, opacity: 1, duration: 0.3 });

        modelName.textContent = data.modelName;
        badge.textContent = data.badge;
        badge.className = `px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold ${data.badgeClass.join(' ')}`;
        
        size.textContent = data.size;
        latency.textContent = data.latency;
        power.textContent = data.power;
        accuracy.textContent = data.accuracy;
      });
    });

    // Dummy values cache for weights matrices
    const rows = 9;
    const cols = 15;
    const weights = [];
    for (let r = 0; r < rows; r++) {
      weights[r] = [];
      for (let c = 0; c < cols; c++) {
        weights[r][c] = (Math.random() * 2 - 1); // Value between -1 and 1
      }
    }

    function drawMatrix() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      
      const cellWidth = canvas.width / cols;
      const cellHeight = canvas.height / rows;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Slow scroll animation by offset
          const weightVal = weights[(r + Math.floor(frame / 60)) % rows][c];
          const x = c * cellWidth + cellWidth / 2;
          const y = r * cellHeight + cellHeight / 2;

          if (activeMode === 'fp32') {
            // Render high-precision floats (e.g. +0.31, -0.74)
            const prefix = weightVal >= 0 ? '+' : '';
            const text = prefix + weightVal.toFixed(2);
            
            ctx.fillStyle = weightVal >= 0 ? 'rgba(15, 118, 110, 0.8)' : 'rgba(109, 40, 217, 0.8)';
            ctx.font = '6px monospace';
            ctx.fillText(text, x, y);
          } else if (activeMode === 'int8') {
            // Render 8-bit integers (e.g. +127, -84)
            const intVal = Math.round(weightVal * 127);
            const prefix = intVal >= 0 ? '+' : '';
            const text = prefix + intVal;
            
            ctx.fillStyle = intVal >= 0 ? 'rgba(4, 120, 87, 0.9)' : 'rgba(190, 18, 60, 0.9)';
            ctx.font = 'bold 8px monospace';
            ctx.fillText(text, x, y);
          } else if (activeMode === 'pruned') {
            // 75% Sparsity: draw zero or dots, 25% draw glowing active weights
            const indexHash = (r * cols + c) % 4; // Determinstic Sparsity map
            if (indexHash === 0) {
              const intVal = Math.round(weightVal * 127);
              const prefix = intVal >= 0 ? '+' : '';
              const text = prefix + intVal;
              
              ctx.fillStyle = 'var(--color-primary)';
              ctx.font = 'bold 8px monospace';
              ctx.fillText(text, x, y);
              
              // Subtle neural link line to neighbor node
              if (c < cols - 1 && r < rows - 1) {
                ctx.strokeStyle = 'rgba(15, 118, 110, 0.2)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo((c + 1) * cellWidth + cellWidth / 2, (r + 1) * cellHeight + cellHeight / 2);
                ctx.stroke();
              }
            } else {
              // Dim zero-ed out connection
              ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
              ctx.font = '6px monospace';
              ctx.fillText('0', x, y);
            }
          }
        }
      }

      animId = requestAnimationFrame(drawMatrix);
    }

    // Expose start/stop functions to window so goToSlide can invoke them
    window.startEdgeSim = function() {
      if (!animId) {
        drawMatrix();
      }
    };

    window.stopEdgeSim = function() {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    };
  }

  init();
});
